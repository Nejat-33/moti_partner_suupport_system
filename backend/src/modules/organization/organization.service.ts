import { prisma } from "../../config/database";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/error";
interface CreateOrgInput {
  name: string;
  emailDomain: string;
}

interface UpdateOrgInput {
  name?: string;
  emailDomain?: string;
}

export const createOrganization = async (input: CreateOrgInput) => {
  if (!input.name || !input.emailDomain) {
    throw new BadRequestError(
      "Both organization name and official email domain are required.",
    );
  }

  const nameTaken = await prisma.organization.findUnique({
    where: { name: input.name },
  });
  if (nameTaken)
    throw new ConflictError("An organization with this name already exists.");

  const domainTaken = await prisma.organization.findUnique({
    where: { emailDomain: input.emailDomain.toLowerCase() },
  });
  if (domainTaken)
    throw new ConflictError(
      "This email domain is already registered to another tenant.",
    );

  return prisma.organization.create({
    data: {
      name: input.name,
      emailDomain: input.emailDomain.toLowerCase(),
      isActive: true,
    },
  });
};

export const getAllOrganizations = async () => {
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          customers: true,
        },
      },
    },
  });
};

export const getOrganizationById = async (id: string) => {
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      customers: {
        select: { id: true, fullName: true, email: true, status: true },
      },
    },
  });

  if (!organization)
    throw new NotFoundError(
      "Requested organization workspace could not be located.",
    );
  return organization;
};

export const updateOrganization = async (id: string, input: UpdateOrgInput) => {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Organization not found");

  if (input.name && input.name !== existing.name) {
    const nameTaken = await prisma.organization.findUnique({
      where: { name: input.name },
    });
    if (nameTaken)
      throw new ConflictError("An organization with this name already exists");
  }

  if (
    input.emailDomain &&
    input.emailDomain.toLowerCase() !== existing.emailDomain
  ) {
    const domainTaken = await prisma.organization.findUnique({
      where: { emailDomain: input.emailDomain.toLowerCase() },
    });
    if (domainTaken)
      throw new ConflictError(
        "This email domain is already allocated elsewhere.",
      );
  }

  return prisma.organization.update({
    where: { id },
    data: {
      ...input,
      emailDomain: input.emailDomain
        ? input.emailDomain.toLowerCase()
        : undefined,
    },
  });
};

export const deactivateOrganization = async (id: string) => {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Organization target missing.");

  return prisma.organization.update({
    where: { id },
    data: { isActive: false },
  });
};

export const reactivateOrganization = async (id: string) => {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Organization target missing.");

  return prisma.organization.update({
    where: { id },
    data: { isActive: true },
  });
};
