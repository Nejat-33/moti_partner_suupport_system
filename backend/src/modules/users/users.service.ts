import { prisma } from "../../config/database";
import { BcryptUtils } from "../../utils/bcrypt";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../utils/error";

export interface UpdateProfileInput {
  targetUserId: string;
  userType: "STAFF" | "CUSTOMER";
  requestedById: string;
  updateData: {
    password?: string;
    [key: string]: any;
  };
}

export const updateProfileWithRBAC = async (input: UpdateProfileInput) => {
  const { targetUserId, userType, requestedById, updateData } = input;

  const isSelfUpdate = targetUserId === requestedById;
  let isSystemAdmin = false;

  const operator = await prisma.staff.findUnique({
    where: { id: requestedById },
  });

  if (operator) {
    isSystemAdmin = operator.isSAdmin;
  }

  if (!isSelfUpdate && !isSystemAdmin) {
    throw new ForbiddenError(
      "Access Denied: You are only allowed to modify your own profile unless you are a System Admin.",
    );
  }

  const allowedFields = ["password"];
  const incomingFields = Object.keys(updateData);
  const containsIllegalFields = incomingFields.some(
    (field) => !allowedFields.includes(field),
  );

  if (containsIllegalFields) {
    throw new BadRequestError(
      "Validation Failure: Only password modification is permitted through this route.",
    );
  }

  if (!updateData.password) {
    throw new BadRequestError(
      "Validation Failure: Missing required 'password' property.",
    );
  }

  const hashedSecurePassword = await BcryptUtils.hash(updateData.password);

  return await executeUpdate(
    targetUserId,
    userType,
    requestedById,
    hashedSecurePassword,
  );
};

const executeUpdate = async (
  id: string,
  type: "STAFF" | "CUSTOMER",
  updatedById: string,
  hashedPasswordString: string,
) => {
  if (type === "STAFF") {
    const staffExists = await prisma.staff.findUnique({ where: { id } });
    if (!staffExists) throw new NotFoundError("Target staff record not found.");

    return await prisma.staff.update({
      where: { id },
      data: {
        passwordHash: hashedPasswordString,
        updatedBy: { connect: { id: updatedById } },
      },
    });
  } else {
    const customerExists = await prisma.customer.findUnique({ where: { id } });
    if (!customerExists)
      throw new NotFoundError("Target customer record not found.");

    return await prisma.customer.update({
      where: { id },
      data: {
        passwordHash: hashedPasswordString,
        updatedById: updatedById,
      },
    });
  }
};
