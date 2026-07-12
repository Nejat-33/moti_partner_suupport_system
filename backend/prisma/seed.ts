import dotenv from "dotenv";

dotenv.config({ path: ".env" });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ""),
});

async function main() {
  const organizations = [
    {
      name: "Commercial Bank of Ethiopia",
    },
    {
      name: "Dashen Bank",
    },
    {
      name: "Awash Bank",
    },
  ];

  for (const organization of organizations) {
    await prisma.organization.upsert({
      where: { name: organization.name },
      update: { name: organization.name },
      create: organization,
    });
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
