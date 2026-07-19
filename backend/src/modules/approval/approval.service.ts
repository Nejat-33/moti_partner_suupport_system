import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError } from "../../utils/error";
import {
  AssignStaffRole,
} from "../roleassignment/roleassignment.service";

type UserType = "STAFF" | "CUSTOMER";

export const getPendingUsers = async () => {
  const pendingStaff = await prisma.staff.findMany({
    where: { status: "PENDING_APPROVAL" },
    select: {
      id: true,
      fullName: true,
      email: true,
      gender: true,
      createdAt: true,
      isSAdmin: true,
      isManager: true,
      isPSsupport: true,
    },
  });

  const pendingCustomers = await prisma.customer.findMany({
    where: { status: "PENDING_APPROVAL" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      position: true,
      gender: true,
      createdAt: true,
      organization: {
        select: { name: true },
      },
    },
  });

  return {
    staff: pendingStaff,
    customers: pendingCustomers,
  };
};

interface ApproveUserInput {
  staffId: string;
  role: "SYSTEM_ADMIN" | "MANAGER" | "PS_SUPPORT";
  managerType?: "DEPARTMENT" | "DIVISION" | "SECTION";
  departmentId?: string;
  divisionId?: string;
  sectionId?: string;
  approvedById: string;
}

export const approveUserAccount = async (input: ApproveUserInput) => {
  const {
    staffId,
    role,
    managerType,
    departmentId,
    divisionId,
    sectionId,
    approvedById,
  } = input;

  const staff = await prisma.staff.findUnique({
    where: {
      id: staffId,
    },
  });

  if (!staff) {
    throw new NotFoundError("Staff account not found.");
  }

  if (staff.status === "ACTIVE") {
    throw new BadRequestError("This account has already been approved.");
  }

  if (staff.status === "PENDING_VERIFICATION") {
    throw new BadRequestError("The staff member has not verified their email.");
  }

  if (staff.status !== "PENDING_APPROVAL") {
    throw new BadRequestError(
      "Only pending approval accounts can be approved.",
    );
  }

  const updatedStaff = await AssignStaffRole({
    staffId,
    role,
    managerType,
    departmentId,
    divisionId,
    sectionId,
    updatedById: approvedById,
  });

  const approvedStaff = await prisma.staff.update({
    where: {
      id: staffId,
    },
    data: {
      status: "ACTIVE",

      approvedBy: {
        connect: {
          id: approvedById,
        },
      },
    },

    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      isManager: true,
      isPSsupport: true,
      isSAdmin: true,
    },
  });

  return approvedStaff;
};

export const rejectUserAccount = async (
  userId: string,
  targetType: UserType,
) => {
  if (targetType === "STAFF") {
    const staff = await prisma.staff.findUnique({ where: { id: userId } });
    if (!staff) throw new NotFoundError("Staff record not found.");
    if (staff.status !== "PENDING_APPROVAL") {
      throw new BadRequestError(
        "Can only reject users who are currently pending approval.",
      );
    }

    return prisma.staff.delete({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
  }

  if (targetType === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { id: userId },
    });
    if (!customer) throw new NotFoundError("Customer record not found.");
    if (customer.status !== "PENDING_APPROVAL") {
      throw new BadRequestError(
        "Can only reject users who are currently pending approval.",
      );
    }

    return prisma.customer.delete({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
  }

  throw new BadRequestError("Invalid user type classification supplied.");
};

export const deactivateUserAccount = async (
  userId: string,
  targetType: UserType,
) => {
  if (targetType === "STAFF") {
    const staff = await prisma.staff.findUnique({ where: { id: userId } });
    if (!staff) throw new NotFoundError("Staff account not found.");

    return prisma.staff.update({
      where: { id: userId },
      data: { status: "DEACTIVATED" },
      select: { id: true, fullName: true, email: true, status: true },
    });
  }

  if (targetType === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { id: userId },
    });
    if (!customer) throw new NotFoundError("Customer account not found.");

    return prisma.customer.update({
      where: { id: userId },
      data: { status: "DEACTIVATED" },
      select: { id: true, fullName: true, email: true, status: true },
    });
  }

  throw new BadRequestError("Invalid user type classification supplied.");
};

export const reactivateUserAccount = async (
  userId: string,
  targetType: UserType,
) => {
  if (targetType === "STAFF") {
    const staff = await prisma.staff.findUnique({ where: { id: userId } });
    if (!staff) throw new NotFoundError("Staff account not found.");
    if (staff.status === "ACTIVE")
      throw new BadRequestError("Account is already active.");

    return prisma.staff.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
      select: { id: true, fullName: true, email: true, status: true },
    });
  }

  if (targetType === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { id: userId },
    });
    if (!customer) throw new NotFoundError("Customer account not found.");
    if (customer.status === "ACTIVE")
      throw new BadRequestError("Account is already active.");

    return prisma.customer.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
      select: { id: true, fullName: true, email: true, status: true },
    });
  }

  throw new BadRequestError("Invalid user type classification supplied.");
};
