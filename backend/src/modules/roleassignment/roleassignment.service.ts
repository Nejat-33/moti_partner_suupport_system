import { BadRequestError, NotFoundError } from "../../utils/error";
import { prisma } from "../../config/database";

export type TargetRoleType = "SYSTEM_ADMIN" | "MANAGER" | "PS_SUPPORT";

interface RemoveRoleInput {
  staffId: string;
  roleToRemove: TargetRoleType;
  targetStructureId?: string;
  defaultSectionId?: string;
  updatedById?: string;
}

interface AssignRoleInput {
  staffId: string;
  role: TargetRoleType;
  managerType?: "DIVISION" | "DEPARTMENT" | "SECTION";
  departmentId?: string;
  divisionId?: string;
  sectionId?: string;
  updatedById?: string;
}

export const AssignStaffRole = async (input: AssignRoleInput) => {
  const {
    staffId,
    role,
    managerType,
    departmentId,
    divisionId,
    sectionId,
    updatedById,
  } = input;

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { section: true },
  });
  if (!staff) throw new NotFoundError("Target staff record not found.");
  if (staff.status !== "PENDING_APPROVAL")
    throw new BadRequestError(" This Account is Not Verified");

  let updateStaffData: any = {};
  if (updatedById) updateStaffData.updatedBy = { connect: { id: updatedById } };

  let isSystemAdmin = false;
  if (updatedById) {
    const operator = await prisma.staff.findUnique({
      where: { id: updatedById },
    });
    if (operator?.isSAdmin) {
      isSystemAdmin = true;
    }
  }

  if (role === "MANAGER") {
    if (!managerType) {
      throw new BadRequestError(
        "managerType is required when assigning a MANAGER role.",
      );
    }

    const [managedDept, managedDiv, managedSec] = await Promise.all([
      prisma.department.findFirst({ where: { managerId: staffId } }),
      prisma.division.findFirst({ where: { managerId: staffId } }),
      prisma.section.findFirst({ where: { managerId: staffId } }),
    ]);

    if (managedDept || managedDiv || managedSec) {
      const activeRole = managedDept
        ? `Department (${managedDept.id})`
        : managedDiv
          ? `Division (${managedDiv.id})`
          : `Section (${managedSec!.id})`;

      throw new BadRequestError(
        `Hierarchy Violation: This staff member is already actively managing ${activeRole}.`,
      );
    }

    updateStaffData.isManager = true;

    if (managerType === "DIVISION") {
      if (!divisionId) throw new BadRequestError("Division ID is required.");

      const targetDivision = await prisma.division.findUnique({
        where: { id: divisionId },
      });
      if (!targetDivision)
        throw new NotFoundError("Target Division not found.");

      await prisma.division.update({
        where: { id: divisionId },
        data: { managerId: staffId },
      });
    } else if (managerType === "SECTION") {
      if (!sectionId) throw new BadRequestError("Section ID is required.");

      const targetSection = await prisma.section.findUnique({
        where: { id: sectionId },
      });
      if (!targetSection) throw new NotFoundError("Target Section not found.");

      await prisma.section.update({
        where: { id: sectionId },
        data: { managerId: staffId },
      });
    }
  } else if (role === "PS_SUPPORT") {
    if (!sectionId) {
      throw new BadRequestError(
        "Section ID is required to assign a PS Support member.",
      );
    }

    const targetSection = await prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!targetSection) throw new NotFoundError("Target Section not found.");

    updateStaffData.isPSsupport = true;
    updateStaffData.section = { connect: { id: sectionId } };
  }

  return prisma.staff.update({
    where: { id: staffId },
    data: { ...updateStaffData },
  });
};

export const updateStaffRole = async (input: AssignRoleInput) => {
  const {
    staffId,
    role,
    managerType,
    departmentId,
    divisionId,
    sectionId,
    updatedById,
  } = input;

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { section: true },
  });
  if (!staff) throw new NotFoundError("Target staff record not found.");

  let isSystemAdmin = false;
  let operatorManagedDeptId: string | null = null;
  let operatorManagedDivId: string | null = null;
  let operatorManagedSecId: string | null = null;

  if (updatedById) {
    const operator = await prisma.staff.findUnique({
      where: { id: updatedById },
      include: {
        managedDepartment: true,
        managedDivision: true,
        managedSection: true,
      },
    });

    if (operator) {
      if (operator.isSAdmin) isSystemAdmin = true;
      if (operator.managedDepartment)
        operatorManagedDeptId = operator.managedDepartment.id;
      if (operator.managedDivision)
        operatorManagedDivId = operator.managedDivision.id;
      if (operator.managedSection)
        operatorManagedSecId = operator.managedSection.id;
    }
  }

  let updateStaffData: any = {};
  if (updatedById) updateStaffData.updatedBy = { connect: { id: updatedById } };

  if (role === "MANAGER") {
    if (!managerType) {
      throw new BadRequestError(
        "managerType is required when assigning a MANAGER role.",
      );
    }

    const [managedDept, managedDiv, managedSec] = await Promise.all([
      prisma.department.findFirst({ where: { managerId: staffId } }),
      prisma.division.findFirst({ where: { managerId: staffId } }),
      prisma.section.findFirst({ where: { managerId: staffId } }),
    ]);

    if (managedDept || managedDiv || managedSec) {
      const activeRole = managedDept
        ? `Department (${managedDept.id})`
        : managedDiv
          ? `Division (${managedDiv.id})`
          : `Section (${managedSec!.id})`;

      throw new BadRequestError(
        `Hierarchy Violation: This staff member is already actively managing ${activeRole}.`,
      );
    }

    updateStaffData.isManager = true;

    if (managerType === "DEPARTMENT") {
      if (!departmentId)
        throw new BadRequestError("Department ID is required.");

      const targetDepartment = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!targetDepartment)
        throw new NotFoundError("Target Department not found.");

      if (updatedById && !isSystemAdmin) {
        const isSameLevelDeptManager = operatorManagedDeptId === departmentId;

        if (!isSameLevelDeptManager) {
          throw new BadRequestError(
            "Unauthorized: Only a System Admin or an existing Department Manager of this department can assign this role.",
          );
        }
      }

      const updateData: any = {
        managerId: staffId,
      };

      if (updatedById) {
        updateData.updatedBy = { connect: { id: updatedById } };
      }

      const operatorId =
        typeof updateData === "string" ? updateData : updatedById;

      await prisma.department.update({
        where: { id: departmentId },
        data: {
          manager: {
            connect: { id: staffId },
          },
          updatedBy: {
            connect: { id: operatorId },
          },
        },
      });
    } else if (managerType === "DIVISION") {
      if (!divisionId) throw new BadRequestError("Division ID is required.");

      const targetDivision = await prisma.division.findUnique({
        where: { id: divisionId },
      });
      if (!targetDivision)
        throw new NotFoundError("Target Division not found.");

      if (updatedById && !isSystemAdmin) {
        const isParentDeptManager =
          operatorManagedDeptId === targetDivision.departmentId;
        const isSameLevelDivManager = operatorManagedDivId === divisionId;

        if (!isParentDeptManager && !isSameLevelDivManager) {
          throw new BadRequestError(
            "Unauthorized: Only a System Admin, the parent Department Manager, or an existing Division Manager can assign this role.",
          );
        }
      }

      if (staff.isPSsupport && staff.sectionId) {
        const targetSection = await prisma.section.findUnique({
          where: { id: staff.sectionId },
        });
        if (targetSection?.divisionId !== divisionId) {
          throw new BadRequestError(
            "Hierarchy Violation: A PS Support agent can only be promoted to manage the Division their Section belongs to.",
          );
        }
      }

      await prisma.division.update({
        where: { id: divisionId },
        data: {
          managerId: staffId,
          updatedBy: updatedById || undefined,
        },
      });
    } else if (managerType === "SECTION") {
      if (!sectionId) throw new BadRequestError("Section ID is required.");

      const targetSection = await prisma.section.findUnique({
        where: { id: sectionId },
        include: { division: true },
      });
      if (!targetSection) throw new NotFoundError("Target Section not found.");

      if (updatedById && !isSystemAdmin) {
        const isGrandparentDeptManager =
          operatorManagedDeptId === targetSection.division.departmentId;
        const isParentDivManager =
          operatorManagedDivId === targetSection.divisionId;
        const isSameLevelSecManager = operatorManagedSecId === sectionId;

        if (
          !isGrandparentDeptManager &&
          !isParentDivManager &&
          !isSameLevelSecManager
        ) {
          throw new BadRequestError(
            "Unauthorized: Requires a System Admin, parent Department Manager, parent Division Manager, or an existing Section Manager.",
          );
        }
      }

      await prisma.section.update({
        where: { id: sectionId },
        data: {
          managerId: staffId,
          updatedBy: updatedById || undefined,
        },
      });
    }
  } else if (role === "PS_SUPPORT") {
    if (!sectionId) {
      throw new BadRequestError(
        "Section ID is required to assign a PS Support member.",
      );
    }

    const targetSection = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { division: { include: { department: true } } },
    });
    if (!targetSection) throw new NotFoundError("Target Section not found.");

    if (updatedById && !isSystemAdmin) {
      const isDirectSectionManager = operatorManagedSecId === targetSection.id;
      const isParentDivisionManager =
        operatorManagedDivId === targetSection.divisionId;
      const isGrandparentDeptManager =
        operatorManagedDeptId === targetSection.division.department.id;

      if (
        !isDirectSectionManager &&
        !isParentDivisionManager &&
        !isGrandparentDeptManager
      ) {
        throw new BadRequestError(
          "Unauthorized: Only a System Admin, Department Manager, Division Manager, or Section Manager can add support staff to this Section.",
        );
      }
    }

    updateStaffData.isPSsupport = true;
    updateStaffData.section = { connect: { id: sectionId } };
  }

  return prisma.staff.update({
    where: { id: staffId },
    data: { ...updateStaffData },
  });
};

export const removeStaffRolePermission = async (input: RemoveRoleInput) => {
  const { staffId, roleToRemove, targetStructureId, updatedById } = input;

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { section: true },
  });
  if (!staff)
    throw new NotFoundError("Target staff member record could not be found.");

  let isSystemAdmin = false;
  let operatorManagedDeptId: string | null = null;
  let operatorManagedDivId: string | null = null;
  let operatorManagedSecId: string | null = null;

  if (updatedById) {
    const operator = await prisma.staff.findUnique({
      where: { id: updatedById },
      include: {
        managedDepartment: true,
        managedDivision: true,
        managedSection: true,
      },
    });

    if (operator) {
      if (operator.isSAdmin) isSystemAdmin = true;
      if (operator.managedDepartment)
        operatorManagedDeptId = operator.managedDepartment.id;
      if (operator.managedDivision)
        operatorManagedDivId = operator.managedDivision.id;
      if (operator.managedSection)
        operatorManagedSecId = operator.managedSection.id;
    }
  }

  let willBeManager = staff.isManager;
  let willBeAdmin = staff.isSAdmin;
  let willBeSupport = staff.isPSsupport;

  let updateStaffData: any = {};
  if (updatedById) updateStaffData.updatedBy = { connect: { id: updatedById } };

  switch (roleToRemove) {
    case "SYSTEM_ADMIN":
      if (updatedById && !isSystemAdmin) {
        throw new BadRequestError(
          "Unauthorized: Only a System Admin can remove a SYSTEM_ADMIN role.",
        );
      }
      updateStaffData.isSAdmin = false;
      willBeAdmin = false;
      break;

    case "PS_SUPPORT":
      if (!staff.isPSsupport)
        throw new BadRequestError(
          "Target user is not currently assigned a PS_SUPPORT role.",
        );
      if (!staff.sectionId)
        throw new BadRequestError("Target user has no section assigned.");

      if (updatedById && !isSystemAdmin) {
        const targetSection = await prisma.section.findUnique({
          where: { id: staff.sectionId },
          include: { division: true },
        });

        const isDirectSecManager = operatorManagedSecId === staff.sectionId;
        const isParentDivManager =
          operatorManagedDivId === targetSection?.divisionId;
        const isGrandparentDeptManager =
          operatorManagedDeptId === targetSection?.division.departmentId;

        if (
          !isDirectSecManager &&
          !isParentDivManager &&
          !isGrandparentDeptManager
        ) {
          throw new BadRequestError(
            "Unauthorized: You do not have permission to remove this user's PS_SUPPORT role.",
          );
        }
      }

      updateStaffData.isPSsupport = false;
      updateStaffData.section = { disconnect: true };
      willBeSupport = false;
      break;

    case "MANAGER":
      if (!targetStructureId) {
        throw new BadRequestError(
          "You must supply a targetStructureId to remove a specific management assignment.",
        );
      }

      const [managedDept, managedDiv, managedSec] = await Promise.all([
        prisma.department.findFirst({
          where: { id: targetStructureId, managerId: staffId },
        }),
        prisma.division.findFirst({
          where: { id: targetStructureId, managerId: staffId },
        }),
        prisma.section.findFirst({
          where: { id: targetStructureId, managerId: staffId },
        }),
      ]);

      if (!managedDept && !managedDiv && !managedSec) {
        throw new BadRequestError(
          "Target staff member does not manage the specified structural unit.",
        );
      }

      if (managedDept) {
        if (updatedById && !isSystemAdmin) {
          throw new BadRequestError(
            "Unauthorized: Only a System Admin can remove a Department Manager.",
          );
        }
        await prisma.department.update({
          where: { id: targetStructureId },
          data: { managerId: null, updatedById },
        });
      } else if (managedDiv) {
        if (
          updatedById &&
          !isSystemAdmin &&
          operatorManagedDeptId !== managedDiv.departmentId
        ) {
          throw new BadRequestError(
            "Unauthorized: Only a System Admin or the parent Department Manager can remove this Division Manager.",
          );
        }
        await prisma.division.update({
          where: { id: targetStructureId },
          data: { managerId: null, updatedBy: updatedById || undefined },
        });
      } else if (managedSec) {
        const sectDetails = await prisma.section.findUnique({
          where: { id: targetStructureId },
          include: { division: true },
        });
        if (updatedById && !isSystemAdmin) {
          const isGrandparentDept =
            operatorManagedDeptId === sectDetails?.division.departmentId;
          const isParentDiv = operatorManagedDivId === sectDetails?.divisionId;

          if (!isGrandparentDept && !isParentDiv) {
            throw new BadRequestError(
              "Unauthorized: Only a System Admin, parent Department Manager, or parent Division Manager can revoke this Section Manager.",
            );
          }
        }
        await prisma.section.update({
          where: { id: targetStructureId },
          data: { managerId: null, updatedBy: updatedById || undefined },
        });
      }

      updateStaffData.isManager = false;
      willBeManager = false;
      break;
  }

  if (!willBeAdmin && !willBeManager && !willBeSupport) {
    throw new BadRequestError(
      "Role isolation constraint: A staff member must possess at least one active role. You cannot remove this role unless you assign them to another role first.",
    );
  }

  return prisma.staff.update({
    where: { id: staffId },
    data: updateStaffData,
  });
};
