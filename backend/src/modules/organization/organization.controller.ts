import { Request, Response } from "express";
import { prisma } from "../../config/database";

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {},
    });

    return res.status(200).json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return res.status(500).json({
      message: "Internal server error occurred while retrieving organizations",
    });
  }
};
