import { Request, Response, NextFunction } from "express";
import { JwtUtils, JwtPayload } from "../utils/jwt";
import { UnauthorizedError } from "../utils/error";
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Access denied. Secure authorization token missing.",
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = JwtUtils.verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};
