import { Request, Response } from "express";
import * as DivisionService from "./division.service";

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user!.userId;
    const { name, departmentId } = req.body;

    if (!departmentId) {
      res
        .status(400)
        .json({ message: "Parent departmentId is required parameters." });
      return;
    }

    const division = await DivisionService.createDivision({
      name,
      departmentId,
      adminId,
    });
    res.status(201).json({
      message: "Division context initialized successfully.",
      data: division,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await DivisionService.getAllDivisions();
    res.status(200).json({ data: records });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to assemble division listings arrays." });
  }
};

export const getSingle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const record = await DivisionService.getDivisionById(id);
    res.status(200).json({ data: record });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.userId;
    const updatedRecord = await DivisionService.updateDivision(id, {
      name: req.body.name,
      adminId,
    });

    res.status(200).json({
      message: "Division changes processed smoothly.",
      data: updatedRecord,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const deactivate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.userId;
    await DivisionService.setDivisionStatus(id, false, adminId);
    res
      .status(200)
      .json({ message: "Division visibility flags set to inactive state." });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const reactivate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.userId;
    await DivisionService.setDivisionStatus(id, true, adminId);
    res
      .status(200)
      .json({ message: "Division workspace activation pipeline restored." });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
