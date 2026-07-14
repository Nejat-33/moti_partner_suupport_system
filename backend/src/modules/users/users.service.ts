import { prisma } from "../../config/database";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../utils/error";

interface UpdateProfileInput {
  targetUserId: string;
  userType: "STAFF" | "CUSTOMER";
  requestedById: string;
  updateData: any;
}

export const updateProfileWithRBAC = async (input: UpdateProfileInput) => {
  const { targetUserId, userType, requestedById, updateData } = input;

  const operator = await prisma.staff.findUnique({
    where: { id: requestedById },
  });
  if (!operator) {
    throw new ForbiddenError("Access Denied: Requester profile not found.");
  }

  const isSelfUpdate = targetUserId === requestedById;
  const isSystemAdmin = operator.isSAdmin;

  if (!isSelfUpdate && !isSystemAdmin) {
    throw new ForbiddenError(
      "Access Denied: You are only allowed to modify your own profile.",
    );
  }

  const allowedFields = ["password"];
  const incomingFields = Object.keys(updateData);
  const containsIllegalFields = incomingFields.some(
    (field) => !allowedFields.includes(field),
  );

  if (containsIllegalFields) {
    throw new BadRequestError(
      "Validation Failure, Only password modification is permitted.",
    );
  }

  if (!updateData.password) {
    throw new BadRequestError(
      "Validation Failure: Missing required 'password'.",
    );
  }

  return await executeUpdate(targetUserId, userType, requestedById, {
    password: updateData.password,
  });
};

const executeUpdate = async (
  id: string,
  type: "STAFF" | "CUSTOMER",
  updatedById: string,
  data: any,
) => {
  const auditData: any = {
    password: data.password,
  };

  if (type === "STAFF") {
    auditData.updatedBy = { connect: { id: updatedById } };

    return await prisma.staff.update({
      where: { id },
      data: auditData,
    });
  } else {
    auditData.updatedById = updatedById;

    return await prisma.customer.update({
      where: { id },
      data: auditData,
    });
  }
};
