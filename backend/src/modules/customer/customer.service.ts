import { prisma } from "../../config/database";
import { BcryptUtils } from "../../utils/bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "../../utils/email";

export const register = async (data: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  position: string;
  gender: "MALE" | "FEMALE";
  organizationId: string;
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

  const passwordHash = await BcryptUtils.hash(data.password);

  return await prisma.$transaction(async (tx) => {
    const newCustomer = await tx.customer.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        passwordHash,
        position: data.position,
        gender: data.gender,
        organizationId: data.organizationId,
        status: "PENDING_VERIFICATION",
        createdByType: "CUSTOMER",
        updatedByType: "CUSTOMER",
      },
    });

    const selfReferencedCustomer = await tx.customer.update({
      where: { id: newCustomer.id },
      data: {
        createdById: newCustomer.id,
        updatedById: newCustomer.id,
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
        userId: newCustomer.id,
        userType: "CUSTOMER",
        tokenType: "EMAIL_VERIFICATION",
        tokenHash,
        expiresAt,
      },
    });

    const loggedEmail = await tx.emailLog.create({
      data: {
        recipientId: selfReferencedCustomer.id,
        recipientEmail: selfReferencedCustomer.email,
        emailType: "EMAIL_VERIFICATION",
        status: "PENDING",
      },
    });

    setImmediate(async () => {
      const deliverySuccess = await sendVerificationEmail(
        selfReferencedCustomer.email,
        selfReferencedCustomer.fullName,
        rawToken,
        "CUSTOMER",
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

    return { customerId: selfReferencedCustomer.id, rawToken };
  });
};

export const verifyEmail = async (rawToken: string) => {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const tokenRecord = await tx.authToken.findFirst({
      where: {
        tokenHash,
        tokenType: "EMAIL_VERIFICATION",
        usedAt: null,
      },
    });

    if (!tokenRecord || now > tokenRecord.expiresAt) {
      throw new Error("The email verification link is invalid or has expired.");
    }

    await tx.authToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: now },
    });

    const updatedCustomer = await tx.customer.update({
      where: { id: tokenRecord.userId },
      data: {
        status: "PENDING_APPROVAL",
        emailVerifiedAt: now,
      },
    });

    await tx.notification.create({
      data: {
        recipientId: "SYSTEM_ADMIN_QUEUE",
        recipientType: "STAFF",
        type: "NEW_CUSTOMER_REGISTRATION",
        message: `New account from ${updatedCustomer.fullName} is awaiting administrative review.`,
      },
    });

    return {
      email: updatedCustomer.email,
      currentStatus: updatedCustomer.status,
    };
  });
};
