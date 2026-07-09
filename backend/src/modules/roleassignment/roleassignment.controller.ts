import { Request, Response } from "express";
import * as RoleService from "./roleAssignment.service";

export const assignRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { staffId, role, managerType } = req.body;

    if (!staffId || !role) {
      res
        .status(400)
        .json({
          message:
            "Both staffId and targeted role fields are required parameters.",
        });
      return;
    }

    const updatedStaff = await RoleService.updateStaffRole({
      staffId,
      role,
      managerType,
    });

    res.status(200).json({
      message: `Account privileges updated successfully to ${role}.`,
      data: updatedStaff,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
