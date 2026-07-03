import { prisma } from "../../config/database";
import { BcryptUtils } from "../../utils/bcrypt";
import { sendVerificationEmail } from "../../utils/email";
import crypto from "crypto";

export const StaffService = {
  selfRegister: async (data: {
    fullName: string;
    email: string;
    passwordPlain: string;
    gender: "MALE" | "FEMALE";
    departmentId?: string;
  }) => {
    const emailExistsInStaff = await prisma.staff.findUnique({
      where: { email: data.email },
    });
    const emailExistsInCustomers = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (emailExistsInStaff || emailExistsInCustomers) {
      throw new Error("An account with this email address already exists.");
    }

    const passwordHash = await BcryptUtils.hash(data.passwordPlain);

    return await prisma.$transaction(async (tx) => {
      const newStaff = await tx.staff.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash,
          gender: data.gender,
          departmentId: data.departmentId || null,
          isSAdmin: false,
          isManager: false,
          isPSsupport: true,
          status: "PENDING",
        },
      });

      const selfReferencedStaff = await tx.staff.update({
        where: { id: newStaff.id },
        data: {
          createdById: newStaff.id,
          updatedById: newStaff.id,
        },
      });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await tx.authToken.create({
        data: {
          userId: selfReferencedStaff.id,
          userType: "STAFF",
          tokenType: "EMAIL_VERIFICATION",
          tokenHash,
          expiresAt,
        },
      });

      const loggedEmail = await tx.emailLog.create({
        data: {
          recipientId: selfReferencedStaff.id,
          recipientEmail: selfReferencedStaff.email,
          emailType: "EMAIL_VERIFICATION",
          status: "PENDING",
        },
      });

      setImmediate(async () => {
        const deliverySuccess = await sendVerificationEmail(
          selfReferencedStaff.email,
          selfReferencedStaff.fullName,
          rawToken,
          "STAFF",
        );

        await prisma.emailLog.update({
          where: { id: loggedEmail.id },
          data: {
            status: deliverySuccess ? "SENT" : "FAILED",
            sentAt: deliverySuccess ? new Date() : null,
            retryCount: deliverySuccess ? 0 : 1,
          },
        });
      });

      return { staffId: selfReferencedStaff.id, rawToken };
    });
  },

  verifyStaffEmail: async (rawToken: string) => {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      const tokenRecord = await tx.authToken.findFirst({
        where: {
          tokenHash,
          userType: "STAFF",
          tokenType: "EMAIL_VERIFICATION",
          usedAt: null,
        },
      });

      if (!tokenRecord || now > tokenRecord.expiresAt) {
        throw new Error(
          "The email verification link is invalid or has expired.",
        );
      }

      await tx.authToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: now },
      });

      const activatedStaff = await tx.staff.update({
        where: { id: tokenRecord.userId },
        data: { status: "ACTIVE" },
      });

      return { email: activatedStaff.email, status: activatedStaff.status };
    });
  },
};
