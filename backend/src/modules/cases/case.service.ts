import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError } from "../../utils/error";
import {
  CaseStatus,
  CasePriority,
  PartyType,
  NotificationType,
} from "../../../generated/prisma/client";
import { sendStatusUpdateEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";
import { triggerResolutionEmail } from "../../utils/email";
import { CASE_EVENTS, CaseEventBroker } from "./case.event";

type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface CreateCaseInput {
  branchName: string;
  customerId: string;
  productCategoryId: string;
  productSubcategoryId?: string;
  subject: string;
  description: string;
  serviceTypeId: string;
  creationReason?: string;
  staffActorId?: string; 
}

const getUpwardManagementRecipients = async (assignedStaffId: string): Promise<string[]> => {
  const recipientIds = new Set<string>();

  const staff = await prisma.staff.findUnique({
    where: { id: assignedStaffId },
    include: {
      section: {
        include: {
          division: {
            include: {
              department: true,
            },
          },
        },
      },
    },
  });

  if (!staff) return [];

  const getManagerOfUnit = async (
    unitType: "section" | "division" | "department",
    unitId: string | null | undefined
  ) => {
    if (!unitId) return null;
    const manager = await prisma.staff.findFirst({
      where: {
        [`managed${unitType.charAt(0).toUpperCase() + unitType.slice(1)}Id`]: unitId,
      },
      select: { id: true },
    });
    return manager?.id || null;
  };

  if (staff.section) {
    const sectionId = staff.sectionId;
    const divisionId = staff.section.divisionId;
    const departmentId = staff.section.division?.departmentId;

    const sectionManagerId = await getManagerOfUnit("section", sectionId);
    if (sectionManagerId && sectionManagerId !== assignedStaffId) {
      recipientIds.add(sectionManagerId);
    }

    const divManagerId = await getManagerOfUnit("division", divisionId);
    if (divManagerId && divManagerId !== assignedStaffId) {
      recipientIds.add(divManagerId);
    }

    const deptManagerId = await getManagerOfUnit("department", departmentId);
    if (deptManagerId && deptManagerId !== assignedStaffId) {
      recipientIds.add(deptManagerId);
    }
  } 
  
  const systemAdmins = await prisma.staff.findMany({
    where: { isSAdmin: true },
    select: { id: true },
  });

  systemAdmins.forEach((admin) => {
    if (admin.id !== assignedStaffId) {
      recipientIds.add(admin.id);
    }
  });

  return Array.from(recipientIds);
};

const triggerStatusNotification = async (caseDetails: any, newStatus: string) => {
  if (!caseDetails?.customer?.email) return;
  await sendStatusUpdateEmail({
    customerEmail: caseDetails.customer.email,
    customerName: caseDetails.customer.fullName,
    caseNumber: caseDetails.caseNumber,
    subjectLine: caseDetails.subject,
    newStatus: newStatus,
  });
};


export const createCase = async (input: any) => {
  const { creationReason, staffActorId, ...caseData } = input;
  const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";

  const newCase = await prisma.$transaction(async (tx) => {
    const createdCase = await tx.caseReport.create({
      data: {
        ...caseData,
        creationReason: creationReason || null,
        status: CaseStatus.OPEN,
      },
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: createdCase.id,
        changedById: staffActorId || SYSTEM_BOT_ID, 
        oldStatus: CaseStatus.OPEN,
        newStatus: CaseStatus.OPEN,    
        oldPriority: null,
        newPriority: null,
        oldAgentId: null,
        newAgentId: null,
      },
    });

    return createdCase;
  });

  const completeCaseDetails = await prisma.caseReport.findUnique({
    where: { id: newCase.id },
    include: { customer: true, updatedBy: true },
  });

  if (completeCaseDetails) {
    try {
      await triggerStatusNotification(completeCaseDetails, CaseStatus.OPEN);
    } catch (emailError) {
      console.error("Asynchronous customer email tracking notice warning: ", emailError);
    }
  }

  CaseEventBroker.emit(CASE_EVENTS.CREATED, {
    caseId: newCase.id,
    caseNumber: (newCase as any).caseNumber,
    subject: (newCase as any).subject,
    currentStatus: newCase.status,
    priority: (newCase as any).priority,
    actorName: completeCaseDetails?.customer 
      ? `${completeCaseDetails.customer.firstName} ${completeCaseDetails.customer.lastName}`
      : completeCaseDetails?.updatedBy
      ? `${completeCaseDetails.updatedBy.firstName} ${completeCaseDetails.updatedBy.lastName}`
      : "Customer",
    assignedAgentId: (newCase as any).assignedSupportId,
    sectionId: (newCase as any).sectionId,
  });

  return newCase;
};

export const assignCaseSupport = async (
  caseId: string,
  assignedSupportId: string,
  operatorId: string,
) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });
  if (!targetCase) throw new NotFoundError("Case file not found.");

  await prisma.$transaction(async (tx) => {
    await tx.caseReport.update({
      where: { id: caseId },
      data: {
        assignedSupportId,
        status: CaseStatus.IN_PROGRESS,
        updatedById: operatorId,
      },
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: operatorId,
        oldStatus: targetCase.status,
        newStatus: CaseStatus.IN_PROGRESS,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: assignedSupportId,
      },
    });
  });

  const completeCaseDetails = await prisma.caseReport.findUnique({
    where: { id: caseId },
    include: {
      customer: true,
      updatedBy: true,
      assignedSupport: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!completeCaseDetails) {
    throw new NotFoundError("Updated case details could not be found.");
  }

  CaseEventBroker.emit(CASE_EVENTS.ASSIGNED, {
    caseId: completeCaseDetails.id,
    caseNumber: (completeCaseDetails as any).caseNumber,
    subject: (completeCaseDetails as any).subject,
    currentStatus: completeCaseDetails.status,
    priority: (completeCaseDetails as any).priority,
    actorName: completeCaseDetails.updatedBy 
      ? `${completeCaseDetails.updatedBy.firstName} ${completeCaseDetails.updatedBy.lastName}` 
      : "Manager",
    assignedAgentId: (completeCaseDetails as any).assignedSupportId,
    sectionId: (completeCaseDetails as any).sectionId,
  });

  try {
    await triggerStatusNotification(completeCaseDetails, CaseStatus.IN_PROGRESS);
  } catch (emailError) {
    console.error("Asynchronous email tracking notice warning:", emailError);
  }

  return completeCaseDetails;
};

export const reassignCaseSupport = async (
  caseId: string,
  assignedSupportId: string,
  operatorId: string,
) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });
  if (!targetCase) throw new NotFoundError("Case file not found.");

  await prisma.$transaction(async (tx) => {
    await tx.caseReport.update({
      where: { id: caseId },
      data: {
        assignedSupportId,
        updatedById: operatorId,
      },
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: operatorId,
        oldStatus: targetCase.status,
        newStatus: CaseStatus.ASSIGNED,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: assignedSupportId,
      },
    });
  });

  const completeCaseDetails = await prisma.caseReport.findUnique({
    where: { id: caseId },
    include: { customer: true, updatedBy: true },
  });

  if (!completeCaseDetails) {
    throw new NotFoundError("Updated case details could not be found.");
  }

  CaseEventBroker.emit(CASE_EVENTS.ASSIGNED, {
    caseId: completeCaseDetails.id,
    caseNumber: (completeCaseDetails as any).caseNumber,
    subject: (completeCaseDetails as any).subject,
    currentStatus: completeCaseDetails.status,
    priority: (completeCaseDetails as any).priority,
    actorName: completeCaseDetails.updatedBy 
      ? `${completeCaseDetails.updatedBy.firstName} ${completeCaseDetails.updatedBy.lastName}` 
      : "Manager",
    assignedAgentId: (completeCaseDetails as any).assignedSupportId,
    sectionId: (completeCaseDetails as any).sectionId,
  });

  return completeCaseDetails;
};

export const updateCasePriority = async (
  caseId: string,
  priority: CasePriority,
  operatorId: string,
) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });

  if (!targetCase) throw new NotFoundError("Case file not found.");

  if (targetCase.status === "CLOSED" || targetCase.status === "WAITING_CUSTOMER_FEEDBACK") {
    throw new BadRequestError("Operational Refusal: Target case is resolved and locked down.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        priority,
        updatedById: operatorId,
      },
      include: { updatedBy: true }
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: operatorId,
        oldStatus: targetCase.status,
        newStatus: targetCase.status,
        oldPriority: targetCase.priority,
        newPriority: priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: targetCase.assignedSupportId,
      },
    });

    return updatedCase;
  });

  CaseEventBroker.emit(CASE_EVENTS.PRIORITY_CHANGED, {
    caseId: result.id,
    caseNumber: (result as any).caseNumber,
    subject: (result as any).subject,
    currentStatus: result.status,
    priority: result.priority,
    actorName: result.updatedBy ? `${result.updatedBy.firstName} ${result.updatedBy.lastName}` : "Staff Member",
    assignedAgentId: (result as any).assignedSupportId,
    sectionId: (result as any).sectionId,
  });

  return result;
};

export const closeCaseReport = async (
  caseId: string,
  resolutionSummary: string,
  operatorId: string,
) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });
  if (!targetCase) throw new NotFoundError("Case file not found.");
  if (targetCase.status === CaseStatus.CLOSED)
    throw new BadRequestError("This case is already closed.");

  const result = await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.CLOSED,
        resolutionSummary,
        closedById: operatorId,
        closedAt: new Date(),
        resolvedAt: new Date(),
        updatedById: operatorId,
      },
      include: { updatedBy: true, customer: true }
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: operatorId,
        oldStatus: targetCase.status,
        newStatus: CaseStatus.CLOSED,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: targetCase.assignedSupportId,
      },
    });
    return updatedCase;
  });

  await triggerStatusNotification(result, CaseStatus.CLOSED);

  CaseEventBroker.emit(CASE_EVENTS.CLOSED, {
    caseId: result.id,
    caseNumber: (result as any).caseNumber,
    subject: (result as any).subject,
    currentStatus: result.status,
    priority: (result as any).priority,
    actorName: result.updatedBy ? `${result.updatedBy.firstName} ${result.updatedBy.lastName}` : "System Admin",
    assignedAgentId: (result as any).assignedSupportId,
    sectionId: (result as any).sectionId,
  });

  return result;
};

export const reassignOpenCase = async (
  caseId: string,
  newSupportId: string,
  operatorId: string,
) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });

  if (!targetCase) throw new NotFoundError("Case record not found.");

  if (targetCase.status === CaseStatus.CLOSED || targetCase.status === CaseStatus.WAITING_CUSTOMER_FEEDBACK) {
    throw new BadRequestError(`Cannot reassign this case. It is already marked as ${targetCase.status}.`);
  }

  const newAgent = await prisma.staff.findUnique({
    where: { id: newSupportId },
  });
  if (!newAgent) throw new NotFoundError("The requested new support agent does not exist.");

  const result = await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        assignedSupportId: newSupportId,
        status: CaseStatus.ASSIGNED,
        updatedById: operatorId,
      },
      include: { updatedBy: true }
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: operatorId,
        oldStatus: targetCase.status,
        newStatus: CaseStatus.ASSIGNED,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: newSupportId,
      },
    });

    return updatedCase;
  });

  CaseEventBroker.emit(CASE_EVENTS.ASSIGNED, {
    caseId: result.id,
    caseNumber: (result as any).caseNumber,
    subject: (result as any).subject,
    currentStatus: result.status,
    priority: (result as any).priority,
    actorName: result.updatedBy ? `${result.updatedBy.firstName} ${result.updatedBy.lastName}` : "Supervisor",
    assignedAgentId: (result as any).assignedSupportId,
    sectionId: (result as any).sectionId,
  });

  return result;
};


export const getCaseBasedonPriority = async (priority: CasePriority) => {
  return await prisma.caseReport.findMany({
    where: { priority: priority },
    include: {
      assignedSupport: {
        select: {
          id: true,
          departmentId: true,
          divisionId: true,
          sectionId: true,
        },
      },
    },
  });
};

export const getCaseWithStructuralScope = async (caseId: string) => {
  return await prisma.caseReport.findUnique({
    where: { id: caseId },
    include: {
      assignedSupport: {
        select: {
          id: true,
          sectionId: true,
        },
      },
    },
  });
};



export const resolveCase = async (caseId: string, resolutionSummary: string, agentId: string) => {
  if (!resolutionSummary || resolutionSummary.trim().length < 10) {
    throw new BadRequestError("Please provide a thorough resolution summary (at least 10 characters).");
  }

  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });

  if (!targetCase) throw new NotFoundError("Case file not found.");
  if (targetCase.status === CaseStatus.CLOSED) {
    throw new BadRequestError("Cannot resolve a case that is already closed.");
  }

  const updatedCase = await prisma.$transaction(async (tx) => {
    const updated = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.WAITING_CUSTOMER_FEEDBACK,
        resolutionSummary: resolutionSummary.trim(),
        resolvedAt: new Date(),
        updatedById: agentId,
      },
      include: { customer: true, updatedBy: true }, 
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: agentId,
        oldStatus: targetCase.status,
        newStatus: CaseStatus.WAITING_CUSTOMER_FEEDBACK,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: targetCase.assignedSupportId,
      },
    });

    return updated;
  });

  try {
    await triggerResolutionEmail(updatedCase);
  } catch (emailError) {
    console.error("De-coupled resolution email notification error: ", emailError);
  }

  
  CaseEventBroker.emit(CASE_EVENTS.RESOLVED, {
    caseId: updatedCase.id,
    caseNumber: updatedCase.caseNumber,
    subject: updatedCase.subject,
    currentStatus: updatedCase.status,
    priority: updatedCase.priority,
    actorName: updatedCase.updatedBy ? `${updatedCase.updatedBy.firstName} ${updatedCase.updatedBy.lastName}` : "Agent",
    assignedAgentId: updatedCase.assignedSupportId,
    sectionId:(updatedCase as any).sectionId,
  });

  return updatedCase;
};


export const closeCaseWithFeedback = async (
  caseId: string,
  rating: number,
  comment: string | undefined,
  customerId: string
) => {
  if (rating < 1 || rating > 5) {
    throw new BadRequestError("Rating scale value must range between 1 and 5 stars.");
  }

  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });

  if (!targetCase) throw new NotFoundError("Case file not found.");
  if (targetCase.customerId !== customerId) {
    throw new BadRequestError("Unauthorized: You do not own this case file.");
  }

  const closedCase = await prisma.$transaction(async (tx) => {
    await tx.feedback.create({
      data: {
        caseReportId: caseId,
        rating,
        comment: comment?.trim() || null,
      },
    });

    const updated = await tx.caseReport.update({
      where: { id: caseId },
      data: { status: CaseStatus.CLOSED },
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: "00000000-0000-0000-0000-000000000000",
        oldStatus: targetCase.status,
        newStatus: CaseStatus.CLOSED,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: targetCase.assignedSupportId,
      },
    });

    return updated;
  });


  try {
    const internalRecipients = new Set<string>();
    
    if (targetCase.assignedSupportId) {
      internalRecipients.add(targetCase.assignedSupportId); 
      
      const managers = await getUpwardManagementRecipients(targetCase.assignedSupportId);
      managers.forEach(id => internalRecipients.add(id));
    }

    if (internalRecipients.size > 0) {
      await NotificationService.createSystemNotification({
        recipientIds: Array.from(internalRecipients),
        recipientType: PartyType.STAFF,
        type: NotificationType.CASE_CLOSED,
        message: `Case Closed: Case #${closedCase.caseNumber} has been successfully closed by the customer with a rating of ${rating}/5.`,
        caseReportId: closedCase.id,
      });
    }
  } catch (notifErr) {
    console.error("Warning: Internal closing confirmation alerts failed to post:", notifErr);
  }

  return closedCase;
};




export const reopenCase = async (caseId: string, customerId: string) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { id: caseId },
  });

  if (!targetCase) throw new NotFoundError("Case file not found.");
  
  if (targetCase.customerId !== customerId) {
    throw new BadRequestError("Unauthorized: You do not own this case file.");
  }

  if (targetCase.status !== CaseStatus.WAITING_CUSTOMER_FEEDBACK) {
    throw new BadRequestError("Validation Failure: Only cases marked as WAITING_CUSTOMER_FEEDBACK can be rejected and reopened.");
  }

  const reopenedCase = await prisma.$transaction(async (tx) => {
    const updated = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.IN_PROGRESS, 
        resolvedAt: null,              
        resolutionSummary: null,        
      },
      include: { customer: true },
    });

    await tx.caseStatusHistory.create({
      data: {
        caseReportId: caseId,
        changedById: "00000000-0000-0000-0000-000000000000",
        oldStatus: CaseStatus.WAITING_CUSTOMER_FEEDBACK,
        newStatus: CaseStatus.IN_PROGRESS,
        oldPriority: targetCase.priority,
        newPriority: targetCase.priority,
        oldAgentId: targetCase.assignedSupportId,
        newAgentId: targetCase.assignedSupportId,
      },
    });

    return updated;
  });

  CaseEventBroker.emit(CASE_EVENTS.REOPENED, {
    caseId: reopenedCase.id,
    caseNumber: reopenedCase.caseNumber,
    subject: reopenedCase.subject,
    currentStatus: reopenedCase.status,
    priority: reopenedCase.priority,
    actorName: reopenedCase.customer ? `${reopenedCase.customer.firstName} ${reopenedCase.customer.lastName}` : "Customer",
    assignedAgentId: reopenedCase.assignedSupportId,
    sectionId: (reopenedCase as any).sectionId,
  });

  return reopenedCase;
};