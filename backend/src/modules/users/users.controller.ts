import { Request, Response } from "express";
import { ForbiddenError, BadRequestError, NotFoundError } from "../../utils/error";
import * as ProfileService from "./users.service";


export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const actorId = actor.id || actor.userId;

    const accountData = await ProfileService.findAccountById(actorId);
    if (!accountData) throw new NotFoundError("User account profile not found.");

    const { type: accountType } = accountData;
    const allowedUpdates: Record<string, any> = {};
    const { firstName, middleName, lastName, password, phoneNumber, position } = req.body;

    // Allowed self fields
    if (firstName !== undefined) allowedUpdates.firstName = firstName;
    if (middleName !== undefined) allowedUpdates.middleName = middleName;
    if (lastName !== undefined) allowedUpdates.lastName = lastName;
    if (password !== undefined) allowedUpdates.password = password;

    if (accountType === "CUSTOMER") {
      if (phoneNumber !== undefined) allowedUpdates.phoneNumber = phoneNumber;
      if (position !== undefined) allowedUpdates.position = position;
    } else {
      if (phoneNumber !== undefined || position !== undefined) {
        throw new BadRequestError("Staff accounts cannot update phone numbers or positions.");
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new BadRequestError("No valid fields provided for update.");
    }

    const result = await ProfileService.updateSelfProfile(actorId, accountType, allowedUpdates);

    res.status(200).json({
      message: "Your profile has been successfully updated.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};


export const adminUpdateUserEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const adminId = actor.id || actor.userId;
    const targetAccountId = req.params.id as string;
    const { email, reason } = req.body;

    if (!actor.isSAdmin) {
      throw new ForbiddenError("Access Denied: System Administrator privileges required.");
    }

    if (!email) {
      throw new BadRequestError("Validation Failure: New email is required.");
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      throw new BadRequestError(
        "Validation Failure: System Administrators must provide a reason (at least 5 characters) for modifying a user's email."
      );
    }

    const targetData = await ProfileService.findAccountById(targetAccountId);
    if (!targetData) throw new NotFoundError("Target user profile not found.");

    const result = await ProfileService.updateEmailByAdmin(
      targetAccountId,
      targetData.type,
      email,
      adminId,
      reason.trim()
    );

    res.status(200).json({
      message: "User email updated successfully by System Admin.",
      data: result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};