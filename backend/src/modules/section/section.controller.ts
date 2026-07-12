import { Request, Response } from "express";
import * as SectionService from "./section.service";

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user!.userId;
    const { name, divisionId } = req.body;

    if (!divisionId) {
      res
        .status(400)
        .json({ message: "Parent divisionId parameter is mandatory." });
      return;
    }
    const section = await SectionService.createSection({
      name,
      divisionId,
      adminId,
    });
    res.status(201).json({
      message: "Operational section partition successfully created.",
      data: section,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await SectionService.getAllSections();
    res.status(200).json({ data: records });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to assemble systemic section matrices." });
  }
};

export const getSingle = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const record = await SectionService.getSectionById(id);
    res.status(200).json({ data: record });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.userId;
    const updatedRecord = await SectionService.updateSection(id, {
      name: req.body.name,
      adminId,
    });

    res.status(200).json({
      message: "Section data mapping profile updated.",
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
    await SectionService.setSectionStatus(id, false, adminId);
    res
      .status(200)
      .json({ message: "Section configuration safely set to inactive." });
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
    await SectionService.setSectionStatus(id, true, adminId);
    res.status(200).json({
      message:
        "Section functional mapping reactivated for ticketing workflows.",
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const linkStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { staffId } = req.body;
    if (!staffId) {
      res
        .status(400)
        .json({ message: "Target staffId is mandatory inside body payload." });
      return;
    }
    await SectionService.assignStaffToSection(id, staffId);
    res
      .status(200)
      .json({ message: "Staff structural assignment connected clean." });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const unlinkStaff = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const staffId = req.params.staffId as string;
    const id = req.params.id as string;
    await SectionService.removeStaffFromSection(id, staffId);
    res.status(200).json({
      message: "Staff assignment cleanly removed from target section.",
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
