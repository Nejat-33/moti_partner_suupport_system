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

  let updateStaffData: any = {};
  if (updatedById) updateStaffData.updatedBy = { connect: { id: updatedById } };

  if (role === "MANAGER") {
    updateStaffData.isManager = true;

    if (managerType === "DIVISION") {
      if (!divisionId) throw new BadRequestError("Division ID is required.");

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
        data: { managerId: staffId },
      });
    } else if (managerType === "SECTION") {
      if (!sectionId) throw new BadRequestError("Section ID is required.");

      const managedDivisions = await prisma.division.findMany({
        where: { managerId: staffId },
      });
      if (managedDivisions.length > 0) {
        const targetSection = await prisma.section.findUnique({
          where: { id: sectionId },
        });
        const belongsToManagedDivision = managedDivisions.some(
          (div) => div.id === targetSection?.divisionId,
        );

        if (!belongsToManagedDivision) {
          throw new BadRequestError(
            "Hierarchy Violation: A Division Manager can only be assigned to lead a Section within their own Division.",
          );
        }
      }

      await prisma.section.update({
        where: { id: sectionId },
        data: { managerId: staffId },
      });
    }
  }

  return prisma.staff.update({
    where: { id: staffId },
    data: { ...updateStaffData },
  });
};

export const removeStaffRolePermission = async (input: RemoveRoleInput) => {
  const {
    staffId,
    roleToRemove,
    targetStructureId,
    defaultSectionId,
    updatedById,
  } = input;

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { section: true },
  });
  if (!staff)
    throw new NotFoundError("Target staff member record could not be found.");

  let updateStaffData: any = {};
  if (updatedById) updateStaffData.updatedBy = { connect: { id: updatedById } };

  switch (roleToRemove) {
    case "SYSTEM_ADMIN":
      updateStaffData.isSAdmin = false;
      break;

    case "PS_SUPPORT":
      updateStaffData.isPSsupport = false;
      updateStaffData.section = { disconnect: true };
      break;

    case "MANAGER":
      if (!targetStructureId) {
        throw new BadRequestError(
          "You must supply a targetStructureId to remove a specific management assignment.",
        );
      }

      const managedDept = await prisma.department.findFirst({
        where: { id: targetStructureId, managerId: staffId },
      });
      const managedDiv = await prisma.division.findFirst({
        where: { id: targetStructureId, managerId: staffId },
      });
      const managedSec = await prisma.section.findFirst({
        where: { id: targetStructureId, managerId: staffId },
      });

      if (managedDiv && defaultSectionId) {
        const targetSection = await prisma.section.findUnique({
          where: { id: defaultSectionId },
        });
        if (targetSection?.divisionId !== managedDiv.id) {
          throw new BadRequestError(
            "Hierarchy Violation: You can only reassign this Division Manager to a Section within their own Division.",
          );
        }
      }

      await prisma.department.updateMany({
        where: { id: targetStructureId, managerId: staffId },
        data: { managerId: null },
      });
      await prisma.division.updateMany({
        where: { id: targetStructureId, managerId: staffId },
        data: { managerId: null },
      });
      await prisma.section.updateMany({
        where: { id: targetStructureId, managerId: staffId },
        data: { managerId: null },
      });
      break;
  }

  const finalDepts = await prisma.department.count({
    where: { managerId: staffId },
  });
  const finalDivs = await prisma.division.count({
    where: { managerId: staffId },
  });
  const finalSecs = await prisma.section.count({
    where: { managerId: staffId },
  });

  updateStaffData.isManager = finalDepts + finalDivs + finalSecs > 0;

  const willHaveAdmin =
    roleToRemove === "SYSTEM_ADMIN" ? false : staff.isSAdmin;
  const willHaveSupport =
    roleToRemove === "PS_SUPPORT" ? false : staff.isPSsupport;

  if (!willHaveAdmin && !updateStaffData.isManager && !willHaveSupport) {
    if (!defaultSectionId) {
      throw new BadRequestError(
        "Downgrade constraint triggered: Provide a 'defaultSectionId' to reassign them as a PS Support agent.",
      );
    }

    updateStaffData.isPSsupport = true;
    updateStaffData.section = { connect: { id: defaultSectionId } };
  }

  return prisma.staff.update({ where: { id: staffId }, data: updateStaffData });
};
