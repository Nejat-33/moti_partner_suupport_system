import { Request, Response } from "express";
import * as RoleService from "./roleassignment.service";
/* 
export const assignRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { staffId, role, managerType, departmentId, divisionId, sectionId } =
      req.body;

    const adminId = (req as any).user?.userId;

    if (!staffId || !role) {
      res.status(400).json({
        message:
          "Both staffId and targeted role fields are required parameters.",
      });
      return;
    }

    const updatedStaff = await RoleService.updateStaffRole({
      staffId,
      role,
      managerType,
      departmentId,
      divisionId,
      sectionId,
      updatedById: adminId,
    });

    res.status(200).json({
      message: `Account privileges updated successfully to ${role}.`,
      data: updatedStaff,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
}; */

export const revokeRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { staffId, roleToRemove, targetStructureId, defaultSectionId } = req.body;
    const adminId = (req as any).user?.userId;

    if (!staffId || !roleToRemove) {
      res.status(400).json({
        message: "Both staffId and roleToRemove fields are required parameters.",
      });
      return;
    }

    const updatedStaff = await RoleService.removeStaffRolePermission({
      staffId,
      roleToRemove,
      targetStructureId,
      defaultSectionId,
      updatedById: adminId, 
    });

    const isRevertedToSupport =
      !updatedStaff.isSAdmin &&
      !updatedStaff.isManager &&
      updatedStaff.isPSsupport;

    const customSuccessMessage = isRevertedToSupport
      ? `Role '${roleToRemove}' removed. User had no remaining roles, so they were automatically downgraded to a baseline PS_SUPPORT agent.`
      : `Role assignment '${roleToRemove}' has been successfully stripped.`;

    res.status(200).json({
      message: customSuccessMessage,
      data: updatedStaff,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};