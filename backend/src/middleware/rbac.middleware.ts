import { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../utils/error";

type AllowedRoles =
  | "SYSTEM_ADMIN"
  | "STAFF"
  | "CUSTOMER"
  | "DIVISION_MANAGER"
  | "DEPARTMENT_MANAGER"
  | "SECTION_MANAGER"
  | "PSSUPPORT";
export const requireRole = (...allowedRoles: AllowedRoles[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError(
          "System identity tracking parameter context unavailable.",
        );
      }

      let hasClearance = false;

      if (allowedRoles.includes("SYSTEM_ADMIN")) {
        if (req.user.partyType === "STAFF" && req.user.isSAdmin === true) {
          hasClearance = true;
        }
      }

      if (req.user.partyType === "STAFF" && req.user.isManager === true) {
        if (
          allowedRoles.includes("DIVISION_MANAGER") &&
          req.user.managerType === "DIVISION"
        ) {
          hasClearance = true;
        }

        if (
          allowedRoles.includes("DEPARTMENT_MANAGER") &&
          req.user.managerType === "DEPARTMENT"
        ) {
          hasClearance = true;
        }

        if (
          allowedRoles.includes("SECTION_MANAGER") &&
          req.user.managerType === "SECTION"
        ) {
          hasClearance = true;
        }
      }

      if (allowedRoles.includes("PSSUPPORT")) {
        if (req.user.partyType === "STAFF" && req.user.isPSsupport === true) {
          hasClearance = true;
        }
      }

      if (allowedRoles.includes("CUSTOMER")) {
        if (req.user.partyType === "CUSTOMER") {
          hasClearance = true;
        }
      }

      if (!hasClearance) {
        throw new ForbiddenError(
          "Access Denied. Your profile tier lacks required clearance.",
        );
      }

      next();
    } catch (error: any) {
      const statusCode = error.statusCode || 403;
      res.status(statusCode).json({ message: error.message });
    }
  };
};
