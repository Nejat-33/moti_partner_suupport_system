import { Request, Response } from "express";
import { NotificationService } from "./notification.service";

export const getMyNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const data = await NotificationService.getUserNotifications(
      userId,
      page,
      limit,
    );

    res.status(200).json({ message: "Notifications retrieved.", data });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
