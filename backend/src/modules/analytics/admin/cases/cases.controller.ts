import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../../config/database";
import { CaseStatus } from "../../../../../generated/prisma/client";
import { NotFoundError } from "../../../../utils/error";


export const getCaseSummaryMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalCases, openCases, inProgressCases, closedCases] = await prisma.$transaction([
      prisma.caseReport.count(),
      prisma.caseReport.count({ where: { status: CaseStatus.OPEN } }),
      prisma.caseReport.count({ where: { status: CaseStatus.IN_PROGRESS } }),
      prisma.caseReport.count({ where: { status: CaseStatus.CLOSED } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total: totalCases,
        open: openCases,
        inProgress: inProgressCases,
        closed: closedCases,
      }
    });
  } catch (error) {
    next(error);
  }
};


export const getCaseDeepDetailProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;

    const targetCase = await prisma.caseReport.findUnique({
      where: { id: caseId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            email: true,
          }
        },
        assignedSupport: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            email: true,
            section: {
              select: {
                id: true,
                name: true,
                division: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
          }
        },
        closedBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
          }
        },
        statusHistory: {
          orderBy: { id: "desc" },
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
              }
            }
          }
        }
      }
    });

    if (!targetCase) {
      throw new NotFoundError("Target case file could not be discovered.");
    }

    const caseReport = targetCase as any;

    return res.status(200).json({
      success: true,
      data: {
        identity: {
          id: caseReport.id,
          caseNumber: caseReport.caseNumber,
          subject: caseReport.subject,
          creationReason: caseReport.creationReason,
        },
        lifecycle: {
          status: caseReport.status,
          priority: caseReport.priority,
          createdAt: caseReport.createdAt,
          updatedAt: caseReport.updatedAt,
          resolvedAt: caseReport.resolvedAt,
          closedAt: caseReport.closedAt,
        },
        actors: {
          creatorCustomer: caseReport.customer ? {
            id: caseReport.customer.id,
            name: `${caseReport.customer.firstName} ${caseReport.customer.middleName}`,
            email: caseReport.customer.email
          } : null,
          assignedAgent: caseReport.assignedSupport ? {
            id: caseReport.assignedSupport.id,
            name: `${caseReport.assignedSupport.firstName} ${caseReport.assignedSupport.middleName}`,
            email: caseReport.assignedSupport.email,
            departmentalScope: {
              sectionName: caseReport.assignedSupport.section?.name || "Unassigned",
              divisionName: caseReport.assignedSupport.section?.division?.name || "Unassigned"
            }
          } : null,
          lastUpdatedByStaff: caseReport.updatedBy ? {
            id: caseReport.updatedBy.id,
            name: `${caseReport.updatedBy.firstName} ${caseReport.updatedBy.middleName}`
          } : null,
        },
        resolution: caseReport.status === CaseStatus.CLOSED ? {
          summary: caseReport.resolutionSummary || "No explicit text provided.",
          closedByStaff: caseReport.closedBy ? `${caseReport.closedBy.firstName} ${caseReport.closedBy.middleName}` : "System Loop",
          customerFeedback: caseReport.customerFeedback || caseReport.feedback || null
        } : null,
        auditTrail: caseReport.statusHistory.map((history: any) => ({
          historyId: history.id,
          timestamp: history.createdAt || history.id, 
          transition: {
            fromStatus: history.oldStatus,
            toStatus: history.newStatus,
            fromPriority: history.oldPriority,
            toPriority: history.newPriority,
          },
          executor: history.changedBy ? `${history.changedBy.firstName} ${history.changedBy.middleName}` : "System Automated System"
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};