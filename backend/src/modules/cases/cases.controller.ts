import { Request, Response } from "express";
import * as CaseService from "./case.service";
import {
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from "../../utils/error";
import { CasePriority } from "@prisma/client";
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

export const CreateCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const actor = (req as any).user;

    if (!actor || !actor.userId) {
      throw new ForbiddenError("Access Denied: Invalid token credentials.");
    }

    const customerRecord = await prisma.customer.findUnique({
      where: { id: actor.userId },
    });

    let isCustomer = !!customerRecord;
    let isSAdmin = false;

    if (!isCustomer) {
      const staffRecord = await prisma.staff.findUnique({
        where: { id: actor.userId },
      });

      if (staffRecord && staffRecord.isSAdmin) {
        isSAdmin = true;
      }
    }

    if (!isCustomer && !isSAdmin) {
      throw new ForbiddenError(
        "Access Denied: Only customers or system administrators can log a new case.",
      );
    }

    const {
      branchName,
      customerId,
      productCategoryId,
      productSubcategoryId,
      subject,
      description,
      serviceTypeId,
    } = req.body;

    const resolvedCustomerId = isCustomer ? actor.userId : customerId;

    if (
      !resolvedCustomerId ||
      !branchName ||
      !productCategoryId ||
      !productSubcategoryId ||
      !subject ||
      !description ||
      !serviceTypeId
    ) {
      throw new BadRequestError(
        "Missing core parameters needed to initialize Case Report.",
      );
    }

    if (isSAdmin) {
      const inputCustomerCheck = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!inputCustomerCheck) {
        throw new NotFoundError(
          "The specified customer account could not be found.",
        );
      }
    }

    const result = await CaseService.createCase({
      branchName,
      customerId: resolvedCustomerId,
      productCategoryId,
      productSubcategoryId,
      subject,
      description,
      serviceTypeId,
    });

    res.status(201).json({ message: "Case Report initialized.", data: result });
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

    if (targetCase.status === "RESOLVED" || targetCase.status === "CLOSED") {
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

export const CloseCase = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const caseId = req.params.id as string;
    const { resolutionSummary } = req.body;

    if (!resolutionSummary)
      throw new BadRequestError(
        "A case cannot be closed without a resolutionSummary.",
      );

    const targetCase = await CaseService.getCaseWithStructuralScope(caseId);
    if (!targetCase) throw new NotFoundError("Case report record not found.");

    const canCloseRole =
      actor.role?.includes("MANAGER") || actor.role === "PS_SUPPORT";

    if (
      actor.role === "PS_SUPPORT" &&
      targetCase.assignedSupportId !== actor.userId
    ) {
      throw new ForbiddenError(
        "Access Denied: PS Support agents can only close cases directly assigned to them.",
      );
    }

    if (
      !actor.isSAdmin &&
      !(canCloseRole && hasStructuralAuthorization(actor, targetCase))
    ) {
      throw new ForbiddenError(
        "Access Denied: You do not have permissions to close this structural unit case.",
      );
    }

    const result = await CaseService.closeCaseReport(
      caseId,
      resolutionSummary,
      actor.userId,
    );
    res.status(200).json({
      message: "Case successfully resolved and closed.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
