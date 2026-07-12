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

  const sensitiveFields = ["isSAdmin", "isManager", "isPSsupport", "password"];
  sensitiveFields.forEach((field) => delete updateData[field]);

  if (targetUserId === requestedById) {
    return await executeUpdate(
      targetUserId,
      userType,
      requestedById,
      updateData,
    );
  }

  const operator = await prisma.staff.findUnique({
    where: { id: requestedById },
  });
  if (!operator)
    throw new ForbiddenError("Access Denied: Requester profile not found.");

  if (operator.isSAdmin) {
    return await executeUpdate(
      targetUserId,
      userType,
      requestedById,
      updateData,
    );
  }

  if (userType === "CUSTOMER") {
    throw new ForbiddenError(
      "Access Denied: Only System Administrators can modify customer profiles.",
    );
  }

  const targetStaff = await prisma.staff.findUnique({
    where: { id: targetUserId },
    include: {
      section: {
        include: {
          division: {
            include: { department: true },
          },
        },
      },
    },
  });

  if (!targetStaff) throw new NotFoundError("Target staff profile not found.");

  if (!targetStaff.section) {
    throw new ForbiddenError(
      "Access Denied: Target user falls outside your management scope.",
    );
  }

  const targetSectionId = targetStaff.section.id;
  const targetDivisionId = targetStaff.section.divisionId;
  const targetDepartmentId = targetStaff.section.division.departmentId;

  if (operator.isManager) {
    const managesTargetSection =
      (await prisma.section.count({
        where: { id: targetSectionId, managerId: requestedById },
      })) > 0;
    if (managesTargetSection)
      return await executeUpdate(
        targetUserId,
        "STAFF",
        requestedById,
        updateData,
      );

    const managesTargetDivision =
      (await prisma.division.count({
        where: { id: targetDivisionId, managerId: requestedById },
      })) > 0;
    if (managesTargetDivision)
      return await executeUpdate(
        targetUserId,
        "STAFF",
        requestedById,
        updateData,
      );

    const managesTargetDepartment =
      (await prisma.department.count({
        where: { id: targetDepartmentId, managerId: requestedById },
      })) > 0;
    if (managesTargetDepartment)
      return await executeUpdate(
        targetUserId,
        "STAFF",
        requestedById,
        updateData,
      );
  }

  throw new ForbiddenError(
    "Access Denied: You do not possess structural management clearance over this profile.",
  );
};

const executeUpdate = async (
  id: string,
  type: "STAFF" | "CUSTOMER",
  updatedById: string,
  data: any,
) => {
  const auditData = {
    ...data,
    updatedById: updatedById,
  };

  if (type === "STAFF") {
    return await prisma.staff.update({ where: { id }, data: auditData });
  } else {
    return await prisma.customer.update({ where: { id }, data: auditData });
  }
};
