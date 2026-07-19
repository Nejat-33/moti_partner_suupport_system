import { Request, Response } from "express";
import * as CaseService from "./case.service";
import {
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from "../../utils/error";
import { CasePriority } from "../../../generated/prisma/client"
import { prisma } from "../../config/database";

const hasStructuralAuthorization = (
  operator: any,
  targetCase: any,
): boolean => {
  if (operator.isSAdmin) return true;
  if (!targetCase.assignedSupport) return false;

  const assignedAgent = targetCase.assignedSupport;

  const sectionMatch =
    operator.sectionId &&
    assignedAgent.sectionId &&
    operator.sectionId === assignedAgent.sectionId;
  const divisionMatch =
    operator.divisionId &&
    assignedAgent.divisionId &&
    operator.divisionId === assignedAgent.divisionId;
  const departmentMatch =
    operator.departmentId &&
    assignedAgent.departmentId &&
    operator.departmentId === assignedAgent.departmentId;

  return !!(sectionMatch || divisionMatch || departmentMatch);
};
const hasStructuralAuthorization2 = (actor: any, targetCase: any): boolean => {
  if (targetCase.assignedSupportId === actor.userId) {
    return true;
  }

  if (actor.role === "DEPARTMENT_MANAGER" && actor.departmentId) {
    return targetCase.departmentId === actor.departmentId;
  }

  if (actor.role === "DIVISION_MANAGER" && actor.divisionId) {
    return (
      targetCase.divisionId === actor.divisionId &&
      targetCase.departmentId === actor.departmentId
    );
  }

  if (actor.role === "SECTION_MANAGER" && actor.sectionId) {
    return (
      targetCase.sectionId === actor.sectionId &&
      targetCase.divisionId === actor.divisionId &&
      targetCase.departmentId === actor.departmentId
    );
  }

  return false;
};

export const createCustomerCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const customerId = actor?.id || actor?.userId;

    if (!customerId) {
      throw new ForbiddenError("Access Denied: Invalid token credentials.");
    }

    const customerRecord = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customerRecord) {
      throw new ForbiddenError("Access Denied: Only customers can access this route.");
    }

    const {
      branchName,
      productCategoryId,
      productSubcategoryId,
      subject,
      description,
      serviceTypeId,
    } = req.body;

    if (
      !branchName ||
      !productCategoryId ||
      !productSubcategoryId ||
      !subject ||
      !description ||
      !serviceTypeId
    ) {
      throw new BadRequestError("Missing core parameters needed to initialize Case Report.");
    }

    const result = await CaseService.createCase({
  branchName,
  customerId,
  productCategoryId,
  productSubcategoryId,
  subject,
  description,
  serviceTypeId,
});

    res.status(201).json({
      message: "Case Report initialized successfully.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};


export const createAdminCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const staffId = actor?.id || actor?.userId;

    if (!staffId) {
      throw new ForbiddenError("Access Denied: Invalid token credentials.");
    }

    const staffRecord = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staffRecord || (!staffRecord.isSAdmin && !staffRecord.isManager)) {
      throw new ForbiddenError(
        "Access Denied: Only System Administrators or Managers can log a case on behalf of a customer."
      );
    }

    const {
      customerEmail,
      reason,
      branchName,
      productCategoryId,
      productSubcategoryId,
      subject,
      description,
      serviceTypeId,
    } = req.body;

    if (
      !customerEmail ||
      !reason ||
      !branchName ||
      !productCategoryId ||
      !productSubcategoryId ||
      !subject ||
      !description ||
      !serviceTypeId
    ) {
      throw new BadRequestError(
        "Missing required fields: customerEmail, reason, and all core case parameters are mandatory."
      );
    }

    if (typeof reason !== "string" || reason.trim().length < 5) {
      throw new BadRequestError(
        "Validation Failure: Please provide a valid reason for creating this case (at least 5 characters)."
      );
    }

    const targetCustomer = await prisma.customer.findUnique({
      where: { email: customerEmail.trim().toLowerCase() },
    });

    if (!targetCustomer) {
      throw new NotFoundError(`No customer account found with email: ${customerEmail}`);
    }

    const result = await CaseService.createCase({
  branchName,
  customerId: targetCustomer.id,
  productCategoryId,
  productSubcategoryId,
  subject,
  description,
  serviceTypeId,
  creationReason: reason.trim(),
  staffActorId: staffId, 
});

    res.status(201).json({
      message: "Case Report logged on behalf of customer.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const AssignCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const actor = (req as any).user;
    const caseId = req.params.id as string;
    const { assignedSupportId } = req.body;

    if (!assignedSupportId) {
      throw new BadRequestError(
        "The assignedSupportId parameter is mandatory.",
      );
    }

    if (!actor || !actor.userId) {
      throw new ForbiddenError("Access Denied: Invalid token credentials.");
    }

    const operator = await prisma.staff.findUnique({
      where: { id: actor.userId },
      include: {
        managedDepartment: true,
        managedDivision: true,
        managedSection: true,
      },
    });

    if (!operator) {
      throw new ForbiddenError(
        "Access Denied: Only staff members can route cases.",
      );
    }

    const targetCase = await prisma.caseReport.findUnique({
      where: { id: caseId },
    });
    if (!targetCase) {
      throw new NotFoundError("Case report record not found.");
    }

    const isSystemAdmin = operator.isSAdmin;
    const isDeptManager = !!operator.managedDepartment;

    let hasAuthorization = false;

    if (isSystemAdmin) {
      hasAuthorization = true;
    } else if (isDeptManager) {
      const matchesDeptScope =
        targetCase.productCategoryId === operator.managedDepartment?.id;

      if (matchesDeptScope) {
        hasAuthorization = true;
      }
    }

    if (!hasAuthorization) {
      throw new ForbiddenError(
        "Access Denied: You do not possess structural management clearance to route this case.",
      );
    }
    const assignedStaffCheck = await prisma.staff.findUnique({
      where: { id: assignedSupportId },
    });

    if (!assignedStaffCheck) {
      throw new BadRequestError(
        `Assignment Failed: No staff member found with the ID "${assignedSupportId}". Please provide a valid Staff ID.`,
      );
    }

    const result = await CaseService.assignCaseSupport(
      caseId,
      assignedSupportId,
      operator.id,
    );

    res.status(200).json({
      message: "Case successfully routed to the assigned staff member.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const ReassignCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const actor = (req as any).user;
    const caseId = req.params.id as string;
    const { assignedSupportId } = req.body;

    if (!assignedSupportId) {
      throw new BadRequestError(
        "The assignedSupportId parameter is mandatory.",
      );
    }

    if (!actor || !actor.userId) {
      throw new ForbiddenError("Access Denied: Invalid token credentials.");
    }

    const operator = await prisma.staff.findUnique({
      where: { id: actor.userId },
      include: {
        managedDepartment: true,
        managedDivision: true,
        managedSection: true,
      },
    });

    if (!operator) {
      throw new ForbiddenError(
        "Access Denied: Only staff members can route cases.",
      );
    }

    const targetCase = await prisma.caseReport.findUnique({
      where: { id: caseId },
    });
    if (!targetCase) {
      throw new NotFoundError("Case report record not found.");
    }

    const isSystemAdmin = operator.isSAdmin;
    const isDeptManager = !!operator.managedDepartment;

    let hasAuthorization = false;

    if (isSystemAdmin) {
      hasAuthorization = true;
    } else if (isDeptManager) {
      const matchesDeptScope =
        targetCase.productCategoryId === operator.managedDepartment?.id;

      if (matchesDeptScope) {
        hasAuthorization = true;
      }
    }

    if (!hasAuthorization) {
      throw new ForbiddenError(
        "Access Denied: You do not possess structural management clearance to route this case.",
      );
    }
    const assignedStaffCheck = await prisma.staff.findUnique({
      where: { id: assignedSupportId },
    });

    if (!assignedStaffCheck) {
      throw new BadRequestError(
        `Assignment Failed: No staff member found with the ID "${assignedSupportId}". Please provide a valid Staff ID.`,
      );
    }

    const result = await CaseService.assignCaseSupport(
      caseId,
      assignedSupportId,
      operator.id,
    );

    res.status(200).json({
      message: "Case successfully routed to the assigned staff member.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const GivePriority = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const caseId = req.params.id as string;
    const { priority } = req.body;

    if (!priority || !Object.values(CasePriority).includes(priority)) {
      throw new BadRequestError(
        "A valid CasePriority enum flag must be passed.",
      );
    }

    const targetCase = await CaseService.getCaseWithStructuralScope(caseId);
    if (!targetCase) throw new NotFoundError("Case report record not found.");

    if (targetCase.status === "WAITING_CUSTOMER_FEEDBACK" || targetCase.status === "CLOSED") {
      throw new BadRequestError(
        "Validation Failure: Cannot modify the priority of a RESOLVED case.",
      );
    }

    const isManager = actor.role?.includes("MANAGER");
    if (
      !actor.isSAdmin &&
      !(isManager && hasStructuralAuthorization(actor, targetCase))
    ) {
      throw new ForbiddenError(
        "Access Denied: You do not possess structural permissions to set priority for this case.",
      );
    }

    const result = await CaseService.updateCasePriority(
      caseId,
      priority as CasePriority,
      actor.userId,
    );

    res.status(200).json({
      message: `Case priority successfully updated to ${priority}.`,
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};



export const resolveCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const caseId = id;
    const actor = (req as any).user;
    const agentId = actor?.id || actor?.userId;

    if (!agentId) {
      throw new ForbiddenError("Access Denied: Invalid staff token credentials.");
    }

    const { resolutionSummary } = req.body;

    if (!resolutionSummary) {
      throw new BadRequestError("A formal resolution summary payload is required to resolve this case.");
    }

    const result = await CaseService.resolveCase(caseId, resolutionSummary, agentId);

    res.status(200).json({
      message: "Case report marked as RESOLVED. Verification notice dispatched to customer.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};


export const closeCaseWithFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const caseId = id;

    const actor = (req as any).user;
    const customerId = actor?.id || actor?.userId;

    if (!customerId) {
      throw new ForbiddenError("Access Denied: Invalid customer token credentials.");
    }

    const { rating, comment } = req.body;

    if (rating === undefined || rating === null) {
      throw new BadRequestError("A customer satisfaction score rating parameter is required.");
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new BadRequestError("Validation Failure: Rating metrics must be an integer between 1 and 5.");
    }
    
    const result = await CaseService.closeCaseWithFeedback(
      caseId,
      parsedRating,
      comment,
      customerId
    );

    res.status(200).json({
      message: "Feedback submitted successfully. Case file marked as CLOSED.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};


export const rejectedCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string 
    const caseId = id;
    const actor = (req as any).user;
    const customerId = actor?.id || actor?.userId;

    if (!customerId) {
      throw new ForbiddenError("Access Denied: Invalid customer token credentials.");
    }

    const result = await CaseService.reopenCase(caseId, customerId);

    res.status(200).json({
      message: "Resolution rejected. Case file successfully returned to active status queue.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};