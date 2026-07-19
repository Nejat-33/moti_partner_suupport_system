import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../../config/database";
import { NotFoundError } from "../../../../utils/error";


export const getActiveCustomersCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeCount = await prisma.customer.count({
      where: {
        status: "ACTIVE" 
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        activeCustomersCount: activeCount
      }
    });
  } catch (error) {
    next(error);
  }
};


export const getCustomerHistoryProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId  = req.params.customerId as string;

    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customerExists) {
      throw new NotFoundError("Target customer profile could not be located.");
    }

    const customerCasesHistory = await prisma.caseReport.findMany({
      where: { customerId: customerId },
      include: {
        statusHistory: {
          orderBy: { id: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customerExists.id,
          firstName: (customerExists as any).firstName,
          middleName: (customerExists as any).middleName,
          email: customerExists.email
        },
        history: customerCasesHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffMetricsCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffCount = await prisma.staff.count({
      where: {
        status: "ACTIVE"
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        activeStaffCount: staffCount
      }
    });
  } catch (error) {
    next(error);
  }
};


export const getStaffDeepDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffDirectory = await prisma.staff.findMany({
      where: { status: "ACTIVE" },
      include: {
        section: {
          include: {
            division: true
          }
        },
        staff: {
          where: {
            status: {
              not: "CLOSED"
            }
          },
          select: {
            id: true,
            caseNumber: true,
            subject: true,
            status: true,
            priority: true
          }
        },
        closedCases: {
          select: {
            id: true,
            caseNumber: true,
            resolvedAt: true
          }
        }
      }
    });

    const dynamicStaffProfiles = staffDirectory.map(member => {
      const staffMember = member as any;
      
      return {
        id: staffMember.id,
        name: `${staffMember.firstName} ${staffMember.middleName}`,
        email: staffMember.email,
        isSystemAdmin: staffMember.isSAdmin,
        structuralAssignment: {
          sectionId: staffMember.sectionId || null,
          sectionName: staffMember.section?.name || "Unassigned",
          divisionId: staffMember.section?.division?.id || null,
          divisionName: staffMember.section?.division?.name || "Unassigned"
        },
        workloadMetrics: {
          activeAssignedCasesCount: staffMember.staff?.length || 0,
          historicalClosedCount: staffMember.closedCases?.length || 0
        },
        assignedCases: staffMember.staff || []
      };
    });

    return res.status(200).json({
      success: true,
      data: dynamicStaffProfiles
    });
  } catch (error) {
    next(error);
  }
};