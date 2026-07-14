import { prisma } from "../../config/database";
import { BcryptUtils } from "../../utils/bcrypt";
import { sendVerificationEmail } from "../../utils/email";
import crypto from "crypto";
import { NotFoundError } from "../../utils/error";

export const RegisterCustomer = async (data: {
  fullName: string;
  email: string;
  passwordPlain: string;
  gender: "MALE" | "FEMALE";
  position: string;
  organizationId: string;
  phoneNumber: string;
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

  const txResult = await prisma.$transaction(async (tx) => {
    const newCustomer = await tx.customer.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        position: data.position,
        passwordHash,
        gender: data.gender,
        status: "PENDING_VERIFICATION",

        createdByType: "CUSTOMER",
        updatedByType: "CUSTOMER",

        organization: {
          connect: {
            id: data.organizationId,
          },
        },
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
        recipientId: newCustomer.id,
        recipientEmail: newCustomer.email,
        emailType: "EMAIL_VERIFICATION",
        status: "PENDING",
      },
    });

    return {
      customerId: newCustomer.id,
      email: newCustomer.email,
      fullName: newCustomer.fullName,
      emailLogId: loggedEmail.id,
      rawToken,
    };
  });

  const deliverySuccess = await sendVerificationEmail(
    txResult.email,
    txResult.fullName,
    txResult.rawToken,
    "CUSTOMER",
  );

  await prisma.emailLog.update({
    where: { id: txResult.emailLogId },
    data: {
      status: deliverySuccess ? "SENT" : "FAILED",
      sentAt: deliverySuccess ? new Date() : null,
      retryCount: deliverySuccess ? 0 : 1,
    },
  });

  if (!deliverySuccess) {
    throw new Error(
      "Failed to deliver verification email. Please contact support.",
    );
  }

  return { customerId: txResult.customerId };
};

export const verifyCustomerEmail = async (rawToken: string) => {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const tokenRecord = await tx.authToken.findFirst({
      where: {
        tokenHash,
        userType: "CUSTOMER",
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

    const activatedCustomer = await tx.customer.update({
      where: { id: tokenRecord.userId },
      data: { status: "PENDING_APPROVAL" },
    });

    return { email: activatedCustomer.email, status: activatedCustomer.status };
  });
};

export const resendCustomerVerification = async (email: string) => {
  const customer = await prisma.customer.findUnique({ where: { email } });

  if (!customer || customer.status !== "PENDING_VERIFICATION") {
    return { email, dummyMode: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.authToken.deleteMany({
      where: {
        userId: customer.id,
        tokenType: "EMAIL_VERIFICATION",
      },
    });

    const authToken = await tx.authToken.create({
      data: {
        userId: customer.id,
        userType: "CUSTOMER",
        tokenType: "EMAIL_VERIFICATION",
        tokenHash,
        expiresAt,
      },
    });

    const loggedEmail = await tx.emailLog.create({
      data: {
        recipientId: customer.id,
        recipientEmail: customer.email,
        emailType: "EMAIL_VERIFICATION",
        status: "PENDING",
      },
    });

    return {
      emailLogId: loggedEmail.id,
      rawToken,
      email: customer.email,
      fullName: customer.fullName,
    };
  });

  const deliverySuccess = await sendVerificationEmail(
    txResult.email,
    txResult.fullName,
    txResult.rawToken,
    "CUSTOMER",
  );

  await prisma.emailLog.update({
    where: { id: txResult.emailLogId },
    data: {
      status: deliverySuccess ? "SENT" : "FAILED",
      sentAt: deliverySuccess ? new Date() : null,
    },
  });

  return { email: txResult.email };
};

export const getCustomerCaseHistory = async (customerId: string) => {
  const customerWithHistory = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      createdAt: true,
      cases: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          serviceType: {
            select: { name: true },
          },
          productCategory: {
            select: { name: true },
          },
          assignedSupport: {
            select: { fullName: true },
          },
        },
      },
    },
  });

  if (!customerWithHistory) {
    throw new NotFoundError("Customer profile record not found.");
  }

  return customerWithHistory;
};
