import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError } from "../../utils/error";

export interface CreateSectionInput {
  name: string;
  divisionId: string;
  adminId: string;
}

export interface UpdateSectionInput {
  name: string;
  adminId: string;
}

export const createSection = async (input: CreateSectionInput) => {
  if (!input.name || !input.name.trim()) {
    throw new BadRequestError("Section name cannot be left empty.");
  }

  const division = await prisma.division.findUnique({
    where: { id: input.divisionId },
  });
  if (!division) throw new NotFoundError("Parent division not found.");
  if (!division.isActive) {
    throw new BadRequestError("Cannot add sections to an inactive division.");
  }

  return prisma.section.create({
    data: {
      name: input.name,
      divisionId: input.divisionId,
      isActive: true,
      createdBy: input.adminId, // Passed cleanly as a plain string ID
    },
    include: {
      division: { select: { id: true, name: true } },
    },
  });
};

export const updateSection = async (id: string, input: UpdateSectionInput) => {
  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) throw new NotFoundError("Target section missing.");

  return prisma.section.update({
    where: { id },
    data: {
      name: input.name,
      updatedBy: input.adminId, // Passed cleanly as a plain string ID
    },
  });
};

export const setSectionStatus = async (id: string, setActive: boolean, adminId: string) => {
  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) throw new NotFoundError("Target section missing.");

  return prisma.section.update({
    where: { id },
    data: {
      isActive: setActive,
      updatedBy: adminId, // Passed cleanly as a plain string ID
    },
  });
};

export const assignStaffToSection = async (sectionId: string, staffId: string) => {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundError("Target section team map missing.");

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) throw new NotFoundError("Target staff record not found.");

  return prisma.section.update({
    where: { id: sectionId },
    data: {
      staff: {
        connect: { id: staffId },
      },
    },
  });
};

export const removeStaffFromSection = async (sectionId: string, staffId: string) => {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundError("Target section team map missing.");

  return prisma.section.update({
    where: { id: sectionId },
    data: {
      staff: {
        disconnect: { id: staffId },
      },
    },
  });
};

export const getAllSections = async () => {
  return prisma.section.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      division: {
        select: {
          id: true,
          name: true,
          department: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: { staff: true },
      },
    },
  });
};

export const getSectionById = async (id: string) => {
  const section = await prisma.section.findUnique({
    where: { id },
    include: {
      division: {
        select: {
          id: true,
          name: true,
          department: { select: { id: true, name: true } },
        },
      },
      staff: {
        select: { id: true, fullName: true, email: true, isPSsupport: true },
      },
    },
  });

  if (!section) throw new NotFoundError("Target section record not found.");
  return section;
};
