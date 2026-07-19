import { prisma } from "../../config/database";
import bcrypt from "bcrypt";

export const findAccountById = async (accountId: string) => {
  const staff = await prisma.staff.findUnique({ where: { id: accountId } });
  if (staff) return { account: staff, type: "STAFF" as const };

  const customer = await prisma.customer.findUnique({ where: { id: accountId } });
  if (customer) return { account: customer, type: "CUSTOMER" as const };

  return null;
};


export const updateSelfProfile = async (
  accountId: string,
  accountType: "STAFF" | "CUSTOMER",
  updates: Record<string, any>
) => {
  const staffAllowed = ["firstName", "middleName", "lastName", "password"];
  const customerAllowed = [
    "firstName",
    "middleName",
    "lastName",
    "password",
    "phoneNumber",
    "position",
  ];

  const allowedKeys = accountType === "STAFF" ? staffAllowed : customerAllowed;
  const filteredData: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (updates[key] !== undefined) {
      filteredData[key] = updates[key];
    }
  }

  if (filteredData.password) {
    const saltRounds = 10;
    filteredData.passwordHash = await bcrypt.hash(
      filteredData.password,
      saltRounds
    );
    delete filteredData.password;
  }

  const safeSelect = {
    id: true,
    firstName: true,
    middleName: true,
    lastName: true,
    email: true,
    updatedAt: true,
  };

  if (accountType === "STAFF") {
    return await prisma.staff.update({
      where: { id: accountId },
      data: { ...filteredData, updatedById: accountId },
      select: {
        ...safeSelect,
        isSAdmin: true,
        isManager: true,
        isPSsupport: true,
      },
    });
  } else {
    return await prisma.customer.update({
      where: { id: accountId },
      data: {
        ...filteredData,
        updatedById: accountId,
        updatedByType: "CUSTOMER",
      },
      select: { ...safeSelect, phoneNumber: true, position: true },
    });
  }
};


export const updateEmailByAdmin = async (
  targetAccountId: string,
  targetType: "STAFF" | "CUSTOMER",
  newEmail: string,
  adminId: string,
  reason: string
) => {
  if (targetType === "STAFF") {
    return await prisma.staff.update({
      where: { id: targetAccountId },
      data: {
        email: newEmail,
        emailChangeReason: reason,
        updatedById: adminId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailChangeReason: true,
        updatedAt: true,
      },
    });
  } else {
    return await prisma.customer.update({
      where: { id: targetAccountId },
      data: {
        email: newEmail,
        emailChangeReason: reason,
        updatedById: adminId,
        updatedByType: "STAFF",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailChangeReason: true,
        updatedAt: true,
      },
    });
  }
};