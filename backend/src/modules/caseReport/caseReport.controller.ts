import { Request, Response } from "express";
import * as CaseService from "./caseReport.service";
import { CasePriority, CaseStatus } from "@prisma/client";
import { BadRequestError } from "../../utils/error";

export const GetFilteredCases = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) {
      throw new BadRequestError(
        "User context missing from authentication handshake.",
      );
    }

    const { priority, status } = req.query;

    let typedPriority: CasePriority | undefined;
    if (priority) {
      if (!Object.values(CasePriority).includes(priority as CasePriority)) {
        throw new BadRequestError(
          `Invalid priority type filter requested. Choose from: ${Object.values(CasePriority).join(", ")}`,
        );
      }
      typedPriority = priority as CasePriority;
    }

    let typedStatus: CaseStatus | "IN_PROGRESS" | undefined;
    if (status) {
      const isValidEnum = Object.values(CaseStatus).includes(
        status as CaseStatus,
      );
      const isCustomProgressFlag = status === "IN_PROGRESS";

      if (!isValidEnum && !isCustomProgressFlag) {
        throw new BadRequestError(
          "Invalid status filter type requested. Choose from OPEN, ASSIGNED, CLOSED, or IN_PROGRESS.",
        );
      }
      typedStatus = status as CaseStatus | "IN_PROGRESS";
    }

    const cases = await CaseService.queryCasesWithPermissions({
      priority: typedPriority,
      status: typedStatus,
      actor: {
        userId: actor.userId,
        role: actor.role,
        isSAdmin: !!actor.isSAdmin,
        departmentId: actor.departmentId,
        divisionId: actor.divisionId,
        sectionId: actor.sectionId,
      },
    });

    res.status(200).json({
      count: cases.length,
      data: cases,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const CaseTracking = async (req: Request, res: Response) => {
  try {
    const caseNumber = req.params.caseNumber as string;
    if (!caseNumber) {
      throw new BadRequestError(
        "Case reference unique validation index is required.",
      );
    }

    const payload = await CaseService.fetchCaseHistoryForTracking(caseNumber);

    res.status(200).json({
      caseNumber: payload.caseNumber,
      currentStatus: payload.status,
      initializedAt: payload.createdAt,
      timelineLogs: payload.statusHistory.map((history) => ({
        logId: history.id,
        transitionFrom: history.oldStatus,
        transitionTo: history.newStatus,
        timestamp: history.changedAt,
      })),
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
