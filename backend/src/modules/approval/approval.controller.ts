import { Request, Response } from "express";
import * as ApprovalService from "./approval.service";

export const getPendingList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const pendingData = await ApprovalService.getPendingUsers();
    res.status(200).json({ data: pendingData });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to retrieve pending users." });
  }
};

export const approveUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, userType } = req.body;
    const adminId = (req as any).user?.userId;
    if (!userId || !userType) {
      res.status(400).json({
        message: "Both userId and userType are required for approval.",
      });
      return;
    }

    const approvedUser = await ApprovalService.approveUserAccount(
      userId,
      userType,
      adminId,
    );

    res.status(200).json({
      message: `${userType} account has been successfully approved and activated.`,
      data: approvedUser,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

export const rejectUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, userType } = req.body;

    if (!userId || !userType) {
      res
        .status(400)
        .json({ message: "Both userId and userType are required fields." });
      return;
    }

    const removedUser = await ApprovalService.rejectUserAccount(
      userId,
      userType,
    );
    res.status(200).json({
      message: `${userType} application registration has been rejected.`,
      data: removedUser,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

export const deactivateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, userType } = req.body;
    if (!userId || !userType) {
      res
        .status(400)
        .json({ message: "Both userId and userType are required fields." });
      return;
    }

    const updatedUser = await ApprovalService.deactivateUserAccount(
      userId,
      userType,
    );
    res.status(200).json({
      message: `${userType} account access has been suspended successfully.`,
      data: updatedUser,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

export const reactivateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, userType } = req.body;
    if (!userId || !userType) {
      res
        .status(400)
        .json({ message: "Both userId and userType are required fields." });
      return;
    }

    const restoredUser = await ApprovalService.reactivateUserAccount(
      userId,
      userType,
    );
    res.status(200).json({
      message: `${userType} account status restored to active operational mode.`,
      data: restoredUser,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};
