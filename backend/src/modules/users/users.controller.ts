import { Request, Response } from "express";
import * as ProfileService from "./users.service";

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { targetUserId, userType, updateData } = req.body;
    const requestedById = (req as any).user?.userId;

    if (!targetUserId || !userType || !updateData) {
      res
        .status(400)
        .json({ message: "Missing required profile payload parameters." });
      return;
    }

    const updatedProfile = await ProfileService.updateProfileWithRBAC({
      targetUserId,
      userType,
      requestedById,
      updateData,
    });

    res.status(200).json({
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
