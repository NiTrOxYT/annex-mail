import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "owner@annex.com";
  const password = "password123";
  const name = "Annex Owner";

  console.log("Seeding initial database...");

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: "annex-consultancy" },
    create: {
      name: "Annex Consultancy",
      slug: "annex-consultancy",
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
    },
    update: {
      passwordHash,
    },
  });

  // Assign to organization as OWNER
  await prisma.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
    update: {
      role: "OWNER",
    },
  });

  console.log("Seeding complete!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Org Slug: ${org.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
