import { Request, Response } from "express";
import { StaffService } from "./staff.service";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, gender, departmentId } = req.body;

  if (!fullName || !email || !password || !gender) {
    res
      .status(400)
      .json({ error: "Missing mandatory registration profile fields." });
    return;
  }

  try {
    const result = await StaffService.selfRegister({
      fullName,
      email,
      passwordPlain: password,
      gender,
      departmentId,
    });

    res.status(201).json({
      message:
        "Staff registration submitted successfully. Please check your inbox to verify your account.",
      staffId: result.staffId,
      debug_verification_token: result.rawToken, // Exposing raw token text for local test scenarios
    });
  } catch (error: any) {
    res
      .status(400)
      .json({
        error: error.message || "Staff registration processing failed.",
      });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    res
      .status(400)
      .json({ error: "A matching validation token parameter is required." });
    return;
  }

  try {
    const confirmation = await StaffService.verifyStaffEmail(token);
    res.status(200).json({
      message:
        "Email successfully verified. Your internal account is now active.",
      details: confirmation,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({
        error: error.message || "Activation routine encountered a failure.",
      });
  }
};
