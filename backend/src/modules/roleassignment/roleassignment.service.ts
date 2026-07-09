import { PrismaClient } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../utils/errors";

const prisma = new PrismaClient();

export type TargetRoleType =
  | "SYSTEM_ADMIN"
  | "MANAGER"
  | "PS_SUPPORT"
  | "REGULAR_STAFF";
export type ManagerDivisionType = "DIVISION" | "DEPARTMENT" | "SECTION";

interface AssignRoleInput {
  staffId: string;
  role: TargetRoleType;
  managerType?: ManagerDivisionType; // Optional, only required if role is MANAGER
}

/**
 * Administrative transaction handler to alter structural privileges for staff accounts
 */
export const updateStaffRole = async (input: AssignRoleInput) => {
  const { staffId, role, managerType } = input;

  // 1. Confirm the target staff user actually exists
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff)
    throw new NotFoundError("Target staff member record could not be found.");

  // 2. Define operational update payloads based on target role configurations
  let updateData: any = {
    isSAdmin: false,
    isManager: false,
    managerType: null,
    isPSsupport: false,
  };

  switch (role) {
    case "SYSTEM_ADMIN":
      updateData.isSAdmin = true;
      break;

    case "MANAGER":
      if (!managerType) {
        throw new BadRequestError(
          "You must supply a manager division tier (DIVISION, DEPARTMENT, SECTION) for manager profiles.",
        );
      }
      updateData.isManager = true;
      updateData.managerType = managerType;
      break;

    case "PS_SUPPORT":
      updateData.isPSsupport = true;
      break;

    case "REGULAR_STAFF":
      // Reverts to base privileges with all tracking flags initialized to false
      break;

    default:
      throw new BadRequestError(
        "Invalid role assignment category descriptor supplied.",
      );
  }

  // 3. Persist modifications to the database
  return prisma.staff.update({
    where: { id: staffId },
    data: updateData,
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      isSAdmin: true,
      isManager: true,
      managerType: true,
      isPSsupport: true,
    },
  });
};
