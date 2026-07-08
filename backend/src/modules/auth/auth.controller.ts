import { Request, Response, NextFunction } from "express";
import { Login } from "./auth.service";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const { accessToken, refreshToken, partyType } = await Login(
      email,
      password,
    );

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      message: "Authentication successful",
      accessToken,
      partyType,
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || "Authentication failed" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An unexpected error occurred during logout" });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  res.status(200).json({
    userId: req.user.userId,
    email: req.user.email,
    partyType: req.user.partyType,
    isSAdmin: req.user.isSAdmin ?? false,
    isManager: req.user.isManager ?? false,
    isPSsupport: req.user.isPSsupport ?? false,
  });
};
