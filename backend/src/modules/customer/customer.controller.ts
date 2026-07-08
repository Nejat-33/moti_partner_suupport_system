import { Request, Response } from "express";
import {
  RegisterCustomer,
  verifyCustomerEmail,
  resendCustomerVerification,
} from "./customer.service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req: Request, res: Response): Promise<void> => {
  const {
    fullName,
    email,
    password,
    gender,
    phoneNumber,
    position,
    organizationId,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !password ||
    !gender ||
    !phoneNumber ||
    !position ||
    !organizationId
  ) {
    res.status(400).json({
      error: "All fields are required.",
    });
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Invalid email format string provided." });
    return;
  }

  if (password.trim().length < 8) {
    res.status(400).json({
      error:
        "Password fails complexity rule. Must contain at least 8 characters.",
    });
    return;
  }

  if (fullName.trim().length < 2) {
    res.status(400).json({ error: "Full name parameter is too short." });
    return;
  }

  if (gender !== "MALE" && gender !== "FEMALE") {
    res.status(400).json({ error: "Gender must be either MALE or FEMALE." });
    return;
  }

  try {
    const result = await RegisterCustomer({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      passwordPlain: password,
      gender,
      phoneNumber: phoneNumber.trim(),
      position: position.trim(),
      organizationId,
    });

    res.status(201).json({
      message:
        "Registration successful! Please look inside your inbox to confirm your email.",
      customerId: result.customerId,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ error: error.message || "Registration processing failed." });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const token = req.query.token || req.body.token;

  if (!token || typeof token !== "string" || token.length !== 64) {
    res.status(400).json({
      error: "A valid 64-character hexadecimal verification token is required.",
    });
    return;
  }

  try {
    const confirmation = await verifyCustomerEmail(token);
    res.status(200).json({
      message:
        "Email successfully verified. Your account is Waiting for Admin Approval",
      details: confirmation,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || "Verification route encountered an error.",
    });
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    res
      .status(400)
      .json({ error: "A valid email format structure is required." });
    return;
  }

  try {
    await resendCustomerVerification(email.trim().toLowerCase());

    res.status(200).json({
      message:
        "If a matching account was found, a fresh verification link has been delivered.",
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ error: error.message || "Resend processing failed." });
  }
};
