
import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError, ConflictError } from "../../utils/error";

export interface CreateDeptInput {
  name: string;
  adminId: string;
}

export interface UpdateDeptInput {
  name: string;
  adminId: string;
}

export const createDepartment = async (input: CreateDeptInput) => {
  if (!input.name || !input.name.trim()) {
    throw new BadRequestError(
      "Department title cannot match an empty sequence string."
    );
  }

  const existing = await prisma.department.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw new ConflictError(
      "A department with this name already exists inside the database."
    );
  }

  return prisma.department.create({
    data: {
      name: input.name,
      isActive: true,
      createdBy: {
        connect: { id: input.adminId }
      }
    },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });
};

export const updateDepartment = async (id: string, input: UpdateDeptInput) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    throw new NotFoundError("Target department reference missing.");
  }

  if (input.name !== department.name) {
    const duplicate = await prisma.department.findUnique({
      where: { name: input.name },
    });
    if (duplicate) {
      throw new ConflictError(
        "Another department is already using this corporate identity name."
      );
    }
  }

  return prisma.department.update({
    where: { id },
    data: {
      name: input.name,
      updatedBy: {
        connect: { id: input.adminId }
      }
    },
  });
};

export const setDepartmentStatus = async (
  id: string,
  setActive: boolean,
  adminId: string,
) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    throw new NotFoundError("Target department reference missing.");
  }

  return prisma.department.update({
    where: { id },
    data: {
      isActive: setActive,
      updatedBy: {
        connect: { id: adminId }
      }
    },
  });
};


export const getAllDepartments = async () => {
  return prisma.department.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      manager: { select: { id: true, fullName: true, email: true } },
      _count: {
        select: { divisions: true },
      },
    },
  });
};

export const getDepartmentById = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, firstName: true,middleName: true, lastName: true, email: true } },
      createdBy: { select: { firstName: true, middleName: true, lastName: true } },
      updatedBy: { select: { firstName: true, middleName: true, lastName: true } },
      divisions: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  if (!department)
    throw new NotFoundError(
      "Target department reference could not be located.",
    );
  return department;
};


