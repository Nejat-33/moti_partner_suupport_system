import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../../config/database";

export const getDepartmentAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await (prisma as any).department.findMany({
      include: {
        manager: {
          select: { id: true, firstName: true, middleName: true, email: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const departmentDetails = departments.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      isActive: dept.isActive ?? true,
      manager: dept.manager ? {
        id: dept.manager.id,
        name: `${dept.manager.firstName} ${dept.manager.middleName}`,
        email: dept.manager.email
      } : null
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalDepartmentsCount: departments.length,
        departments: departmentDetails
      }
    });
  } catch (error) {
    if (error instanceof TypeError || (error as any).code === "P2025") {
      return res.status(200).json({ success: true, data: { totalDepartmentsCount: 0, departments: [], message: "Department model not yet initialized in schema." } });
    }
    next(error);
  }
};


export const getDivisionAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        manager: {
          select: { id: true, firstName: true, middleName: true, email: true }
        },
        sections: {
          select: { id: true, name: true }
        },
        department: {
          select: { id: true, name: true, managerId: true }
        }
      } as any, 
      orderBy: { name: "asc" }
    });

    const divisionDetails = divisions.map(div => {
      const division = div as any;
      return {
        id: division.id,
        name: division.name,
        isActive: division.isActive ?? true,
        manager: division.manager ? {
          id: division.manager.id,
          name: `${division.manager.firstName} ${division.manager.middleName}`,
          email: division.manager.email
        } : null,
        parentDepartment: division.department ? {
          id: division.department.id,
          name: division.department.name
        } : { id: null, name: "Direct Tier / Independent" },
        metrics: {
          totalSectionsCount: division.sections?.length || 0
        },
        sections: division.sections || []
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalDivisionsCount: divisions.length,
        divisions: divisionDetails
      }
    });
  } catch (error) {
    next(error);
  }
};


export const getSectionAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        manager: {
          select: { id: true, firstName: true, middleName: true, email: true }
        },
        staff: {
          select: { id: true }
        },
        division: {
          include: {
            department: true
          }
        }
      } as any,
      orderBy: { name: "asc" }
    });

    const sectionDetails = sections.map(sec => {
      const section = sec as any;
      
      return {
        id: section.id,
        name: section.name,
        isActive: section.isActive,
        manager: section.manager ? {
          id: section.manager.id,
          name: `${section.manager.firstName} ${section.manager.middleName}`,
          email: section.manager.email
        } : null,
        ancestryChain: {
          immediateDivision: section.division ? {
            id: section.division.id,
            name: section.division.name
          } : null,
          grandparentDepartment: section.division?.department ? {
            id: section.division.department.id,
            name: section.division.department.name
          } : { id: null, name: "Unassigned / Direct to Division" }
        },
        metrics: {
          activeStaffCount: section.staff?.length || 0
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalSectionsCount: sections.length,
        sections: sectionDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceTypesList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceTypeClient = (prisma as any).serviceType || (prisma as any).caseServiceType;
    
    if (!serviceTypeClient) {
      return res.status(200).json({
        success: true,
        data: { totalServiceTypesCount: 0, serviceTypes: [], note: "ServiceType model configuration missing from Prisma setup." }
      });
    }

    const serviceTypes = await serviceTypeClient.findMany({
      include: {
        caseReports: { select: { id: true } }
      },
      orderBy: { name: "asc" }
    });

    const typeDetails = serviceTypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      code: type.code || null,
      description: type.description || null,
      isActive: type.isActive ?? true,
      metrics: {
        historicalCasesCount: type.caseReports?.length || 0
      }
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalServiceTypesCount: serviceTypes.length,
        serviceTypes: typeDetails
      }
    });
  } catch (error) {
    next(error);
  }
};