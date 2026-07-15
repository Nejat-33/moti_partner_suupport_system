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

    if (userType !== "STAFF" && userType !== "CUSTOMER") {
      res.status(400).json({
        message:
          "Invalid userType parameter provided. Must evaluate to 'STAFF' or 'CUSTOMER'.",
      });
      return;
    }

    const updatedProfile = await ProfileService.updateProfileWithRBAC({
      targetUserId,
      userType,
      requestedById,
      updateData,
    });

    res.status(200).json({
      message: "User Profile password updated successfully.",
      data: {
        id: updatedProfile.id,
        userType: userType,
        updatedAt: (updatedProfile as any).updatedAt,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
