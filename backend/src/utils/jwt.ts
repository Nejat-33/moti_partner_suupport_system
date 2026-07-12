import jwt from "jsonwebtoken";
import { ENV } from "../config/env";

export type AuthPartyType = "CUSTOMER" | "STAFF";

export type ManagerDivisionType = "DIVISION" | "DEPARTMENT" | "SECTION" | null;
export interface JwtPayload {
  userId: string;
  email: string;
  partyType: AuthPartyType;
  isSAdmin?: boolean;
  isManager?: boolean;
  managerType?: ManagerDivisionType;
  isPSsupport?: boolean;
  departmentId?: string | null;
  divisionId?: string | null;
  sectionId?: string | null;
}

export const JwtUtils = {
  generateAccessToken: (payload: JwtPayload): string => {
    return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });
  },

  generateRefreshToken: (userId: string, partyType: AuthPartyType): string => {
    const payload = { userId, partyType };
    return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
  },

  verifyAccessToken: (token: string): JwtPayload => {
    try {
      return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  },

  verifyRefreshToken: (
    token: string,
  ): { userId: string; partyType: AuthPartyType } => {
    try {
      return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as {
        userId: string;
        partyType: AuthPartyType;
      };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  },
};
