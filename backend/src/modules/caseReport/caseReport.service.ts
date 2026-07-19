import { prisma } from "../../config/database";
import { NotFoundError, BadRequestError } from "../../utils/error";
import { CaseStatus, CasePriority } from "../../../generated/prisma/client";
import { sendStatusUpdateEmail } from "../../utils/email";

interface FetchCasesFilterInput {
  priority?: CasePriority;
  status?: CaseStatus | "IN_PROGRESS";
  actor: {
    userId: string;
    role: string;
    isSAdmin: boolean;
    departmentId?: string;
    divisionId?: string;
    sectionId?: string;
  };
}

export const fetchCaseHistoryForTracking = async (caseNumber: string) => {
  const targetCase = await prisma.caseReport.findUnique({
    where: { caseNumber },
    select: {
      caseNumber: true,
      status: true,
      createdAt: true,
      statusHistory: {
        orderBy: { changedAt: "desc" },
        select: {
          id: true,
          oldStatus: true,
          newStatus: true,
          changedAt: true,
        },
      },
    },
  });

  if (!targetCase)
    throw new NotFoundError(
      `No case found under registration reference identifier: ${caseNumber}`,
    );
  return targetCase;
};

export const queryCasesWithPermissions = async (
  filters: FetchCasesFilterInput,
) => {
  const { priority, status, actor } = filters;

  const whereClause: any = {};

  if (priority) {
    whereClause.priority = priority;
  }

  if (status) {
    if (status === "IN_PROGRESS") {
      whereClause.status = {
        in: [CaseStatus.OPEN, CaseStatus.ASSIGNED],
      };
    } else {
      whereClause.status = status;
    }
  }

  if (!actor.isSAdmin) {
    if (actor.role === "PS_SUPPORT") {
      whereClause.assignedSupportId = actor.userId;
    } else if (actor.role === "SECTION_MANAGER" && actor.sectionId) {
      whereClause.assignedSupport = { sectionId: actor.sectionId };
    } else if (actor.role === "DIVISION_MANAGER" && actor.divisionId) {
      whereClause.assignedSupport = { divisionId: actor.divisionId };
    } else if (actor.role === "DEPARTMENT_MANAGER" && actor.departmentId) {
      whereClause.assignedSupport = { departmentId: actor.departmentId };
    } else {
      return [];
    }
  }

  return await prisma.caseReport.findMany({
    where: whereClause,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      assignedSupport: {
        select: {
          id: true,
          fullName: true,
          departmentId: true,
          divisionId: true,
          sectionId: true,
        },
      },
      serviceType: { select: { id: true, name: true } },
      productCategory: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
};
