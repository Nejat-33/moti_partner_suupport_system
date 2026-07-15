import { Request, Response } from "express";
import * as SectionService from "./section.service";
import { prisma } from "../../config/database";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../utils/error";

const verifySectionAccess = async (
  operatorId: string,
  divisionId: string,
): Promise<void> => {
  const staff = await prisma.staff.findUnique({
    where: { id: operatorId },
    include: {
      managedDepartment: true,
      managedDivision: true,
      managedSection: true,
    },
  });

  if (!staff) {
    throw new ForbiddenError("Access Denied: Operating user record not found.");
  }

  // Rule 1: System Admin has universal permissions
  if (staff.isSAdmin) return;

  // Resolve the structural path up to the department level
  const divisionContext = await prisma.division.findUnique({
    where: { id: divisionId },
    select: { id: true, departmentId: true },
  });

  if (!divisionContext) {
    throw new NotFoundError(
      "The specified parent division configuration does not exist.",
    );
  }

  // Rule 2: Check if user is the direct Section Manager (handled when inspecting existing records via sectionId)
  // Rule 3: Check if user manages the parent Division
  const managesDivision =
    staff.managedDivision && staff.managedDivision.id === divisionId;

  // Rule 4: Check if user manages the top parent Department
  const managesDepartment =
    staff.managedDepartment &&
    staff.managedDepartment.id === divisionContext.departmentId;

  if (managesDivision || managesDepartment) return;

  // Fallback: If no conditions met, reject request stringently
  throw new ForbiddenError(
    "Access Denied: You do not have hierarchical clearance (Section/Division/Dept Manager or System Admin) for this operation.",
  );
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user!.userId;
    const { name, divisionId } = req.body;

    if (!divisionId) {
      throw new BadRequestError("Parent divisionId parameter is mandatory.");
    }

    // 🔒 Enforce structural tree checks before write
    await verifySectionAccess(adminId, divisionId);

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

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.userId;

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundError("Target section missing.");

    // Check direct Section Manager assignment first
    const staff = await prisma.staff.findUnique({
      where: { id: adminId },
      select: { managedSection: true },
    });
    const isDirectSectionManager =
      staff?.managedSection && staff.managedSection.id === id;

    if (!isDirectSectionManager) {
      // 🔒 Check upper hierarchy (Division and Department levels)
      await verifySectionAccess(adminId, section.divisionId);
    }

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

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundError("Target section missing.");

    const staff = await prisma.staff.findUnique({
      where: { id: adminId },
      select: { managedSection: true },
    });
    const isDirectSectionManager =
      staff?.managedSection && staff.managedSection.id === id;

    if (!isDirectSectionManager) {
      await verifySectionAccess(adminId, section.divisionId);
    }

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

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundError("Target section missing.");

    const staff = await prisma.staff.findUnique({
      where: { id: adminId },
      select: { managedSection: true },
    });
    const isDirectSectionManager =
      staff?.managedSection && staff.managedSection.id === id;

    if (!isDirectSectionManager) {
      await verifySectionAccess(adminId, section.divisionId);
    }

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
