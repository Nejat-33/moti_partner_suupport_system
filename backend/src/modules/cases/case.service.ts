import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError } from "../../utils/error";
import { CaseStatus, CasePriority } from "@prisma/client";
import { sendStatusUpdateEmail } from "../../utils/email";

interface CreateCaseInput {
  branchName: string;
  customerId: string;
  productCategoryId: string;
  productSubcategoryId?: string;
  subject: string;
  description: string;
  serviceTypeId: string;
}

type Priority = "HIGH" | "MEDIUM" | "LOW";

export const createCase = async (input: CreateCaseInput) => {
  return await prisma.caseReport.create({
    data: {
      ...input,
      status: CaseStatus.OPEN,
    },
  });
};

const triggerStatusNotification = async (caseId: string, newStatus: string) => {
  const caseDetails = await prisma.caseReport.findUnique({
    where: { id: caseId },
    include: { customer: true },
  });

  if (caseDetails?.customer?.email) {
    sendStatusUpdateEmail({
      customerEmail: caseDetails.customer.email,
      customerName: caseDetails.customer.fullName,
      caseNumber: caseDetails.caseNumber,
      subjectLine: caseDetails.subject,
      newStatus: newStatus,
    });
  }
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

  const result = await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        assignedSupportId,
        status: CaseStatus.ASSIGNED,
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
    return updatedCase;
  });

  await triggerStatusNotification(caseId, CaseStatus.ASSIGNED);
  return result;
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

  return await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        priority,
        updatedById: operatorId,
      },
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
};

export const getCaseBasedonPriority = async (priority: Priority) => {
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

  await triggerStatusNotification(caseId, CaseStatus.CLOSED);
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

  if (!targetCase) {
    throw new NotFoundError("Case record not found.");
  }

  if (
    targetCase.status === CaseStatus.CLOSED ||
    targetCase.status === CaseStatus.RESOLVED
  ) {
    throw new BadRequestError(
      `Cannot reassign this case. It is already marked as ${targetCase.status}.`,
    );
  }

  const newAgent = await prisma.staff.findUnique({
    where: { id: newSupportId },
  });
  if (!newAgent) {
    throw new NotFoundError("The requested new support agent does not exist.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedCase = await tx.caseReport.update({
      where: { id: caseId },
      data: {
        assignedSupportId: newSupportId,
        status: CaseStatus.ASSIGNED,
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
        newAgentId: newSupportId,
      },
    });

    return updatedCase;
  });

  return result;
};
