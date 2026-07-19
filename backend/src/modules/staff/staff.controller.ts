import { Request, Response } from "express";
import {
  Register,
  verifyStaffEmail,
  resendStaffVerification,
} from "./staff.service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, middleName, email, password, gender } = req.body;

  if (!firstName || !middleName || !lastName || !email || !password || !gender) {
    res
      .status(400)
      .json({ error: "Missing mandatory registration profile fields." });
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

  if (firstName.trim().length < 2) {
    res.status(400).json({ error: "First name parameter is too short." });
    return;
  }

  if (lastName.trim().length < 2) {
    res.status(400).json({ error: "Last name parameter is too short." });
    return;
  }

  try {
    const result = await Register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim(),
      email: email.trim().toLowerCase(),
      passwordPlain: password,
      gender,
    });

    res.status(201).json({
      message:
        "Staff registration submitted successfully. Please check your inbox to verify your account.",
      staffId: result.staffId,
    });
  } catch (error: any) {
    console.error("CRITICAL REGISTRATION FAILURE:", error);

    if (
      error instanceof Error &&
      (error.message.includes("exists") ||
        error.message.includes("corporate email"))
    ) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({
      error:
        "An unexpected error occurred while processing your registration. Please try again later.",
    });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const token = req.query.token || req.body.token;

  if (!token || typeof token !== "string" || token.length !== 64) {
    res.status(400).json({
      error:
        "A valid 64-character hexadecimal cryptographic token is required.",
    });
    return;
  }

  try {
    const confirmation = await verifyStaffEmail(token);
    res.status(200).json({
      message:
        "Email successfully verified. Your internal account is now active.",
      details: confirmation,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || "Activation routine encountered a failure.",
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
    await resendStaffVerification(email.trim().toLowerCase());

    res.status(200).json({
      message:
        "If an eligible matching account was found, a fresh verification link has been delivered.",
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Resend failed." });
  }
};
