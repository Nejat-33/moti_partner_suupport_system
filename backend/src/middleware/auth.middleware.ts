import { Request, Response, NextFunction } from "express";
import { JwtUtils } from "../utils/jwt";

export const RequireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Access denied. Missing or malformed authorization token.",
    });
    return;
  }

  const token = authHeader.split("")[1];

  try {
    const decodedPayload = JwtUtils.verifyAccessToken(token);
    req.user = decodedPayload;
    next();
  } catch (error) {
    res.status(401).json({
      error: "Access denied. The provided session token is invalid or expired.",
    });
  }
};
