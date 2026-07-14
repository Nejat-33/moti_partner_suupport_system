import { Request, Response } from "express";
import * as CaseService from "./case.service";
import {
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from "../../utils/error";
import { CasePriority } from "@prisma/client";

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

export const CreateCase = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor.isCustomer && !actor.isSAdmin) {
      throw new ForbiddenError(
        "Only customers or system administrators can log a new case.",
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

    const resolvedCustomerId = actor.isCustomer ? actor.userId : customerId;
    if (
      !resolvedCustomerId ||
      !branchName ||
      !productCategoryId ||
      !subject ||
      !description ||
      !serviceTypeId
    ) {
      throw new BadRequestError(
        "Missing core parameters needed to initialize Case Report.",
      );
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

export const AssignCase = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const caseId = req.params.id as string;
    const { assignedSupportId } = req.body;

    if (!assignedSupportId)
      throw new BadRequestError("assignedSupportId parameter is mandatory.");

    const targetCase = await CaseService.getCaseWithStructuralScope(caseId);
    if (!targetCase) throw new NotFoundError("Case report record not found.");

    const isManager = actor.role?.includes("MANAGER");

    if (
      !actor.isSAdmin &&
      !(isManager && hasStructuralAuthorization(actor, targetCase))
    ) {
      throw new ForbiddenError(
        "Access Denied: Only System Admins or authorized organizational Managers can route this case.",
      );
    }

    const result = await CaseService.assignCaseSupport(
      caseId,
      assignedSupportId,
      actor.userId,
    );
    res
      .status(200)
      .json({ message: "Case successfully routed to agent.", data: result });
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
