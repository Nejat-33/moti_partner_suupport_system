// prisma/seed.ts
import {  Gender, StaffStatus } from "../generated/prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/database";



async function main() {
  const adminEmail = "admin@yourdomain.com";

  const existingAdmin = await prisma.staff.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("System Admin already exists. Skipping seed.");
    return;
  }

  const defaultPassword = "Admin@123"; 
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const admin = await prisma.staff.create({
    data: {
      firstName: "System",
      middleName: "Super",
      lastName: "Admin",
      email: "nejatebrahim35@gmail.com",
      passwordHash: passwordHash,
      gender: Gender.FEMALE, 
      isSAdmin: true,
      isManager: false,
      isPSsupport: false,
      status: StaffStatus.ACTIVE,
    },
  });

  console.log("System Admin seeded successfully:");
  console.log({
    id: admin.id,
    email: admin.email,
    isSAdmin: admin.isSAdmin,
  });
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });