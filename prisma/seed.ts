/**
 * Prisma Seed — Annex Mail
 *
 * Idempotent: safe to run multiple times. Uses upsert/findFirst to avoid
 * creating duplicate records.
 *
 * Usage:
 *   npx prisma db seed
 *   npx tsx prisma/seed.ts
 */

import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Neither DIRECT_URL nor DATABASE_URL is set in environment.");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SEED_ORG_NAME = "Annex Consultancy";
const SEED_ORG_SLUG = "annex-consultancy";
const SEED_USER_EMAIL = "business@annex-consultancy.com";
const SEED_USER_NAME = "Annex Admin";
const INITIAL_OWNER_PASSWORD = process.env.INITIAL_OWNER_PASSWORD;

const SYSTEM_LABELS = [
  { name: "Inbox", color: "#4285F4" },
  { name: "Sent", color: "#34A853" },
  { name: "Drafts", color: "#FBBC04" },
  { name: "Spam", color: "#EA4335" },
  { name: "Trash", color: "#9E9E9E" },
  { name: "Starred", color: "#FBBC04" },
  { name: "Important", color: "#FF6D00" },
];

const STARTER_TEMPLATES = [
  {
    name: "Welcome Email",
    category: "onboarding",
    description: "Send to new clients after onboarding",
    subject: "Welcome to Annex Consultancy — we're glad you're here",
    html: `<p>Hi {{first_name}},</p>
<p>Welcome to Annex Consultancy. We're excited to have you on board.</p>
<p>If you have any questions, reply to this email and we'll be happy to help.</p>
<p>Warm regards,<br>The Annex Team</p>`,
    variables: ["first_name"],
  },
  {
    name: "Follow-Up",
    category: "sales",
    description: "General follow-up after a meeting or proposal",
    subject: "Following up — {{subject_context}}",
    html: `<p>Hi {{first_name}},</p>
<p>I wanted to follow up on our recent conversation about {{subject_context}}.</p>
<p>Please let me know if you have any questions or would like to move forward.</p>
<p>Best,<br>{{sender_name}}<br>Annex Consultancy</p>`,
    variables: ["first_name", "subject_context", "sender_name"],
  },
  {
    name: "Out of Office",
    category: "auto-reply",
    description: "Automatic out-of-office reply",
    subject: "Re: {{original_subject}} — Out of Office",
    html: `<p>Thank you for your email.</p>
<p>I'm currently out of the office until {{return_date}} with limited access to email.</p>
<p>For urgent matters, please contact {{alternate_contact}}.</p>
<p>I will respond to your message when I return.</p>
<p>Regards,<br>{{sender_name}}</p>`,
    variables: [
      "original_subject",
      "return_date",
      "alternate_contact",
      "sender_name",
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedOrganization() {
  const existing = await db.organization.findUnique({
    where: { slug: SEED_ORG_SLUG },
  });

  if (existing) {
    console.log(`  ✓ Organization already exists: ${existing.name}`);
    return existing;
  }

  const org = await db.organization.create({
    data: {
      name: SEED_ORG_NAME,
      slug: SEED_ORG_SLUG,
    },
  });

  console.log(`  ✓ Created organization: ${org.name} (${org.id})`);
  return org;
}

async function seedUser(orgId: string) {
  const existing = await db.user.findUnique({
    where: { email: SEED_USER_EMAIL },
    include: { memberships: true },
  });

  if (existing) {
    console.log(`  ✓ User already exists: ${existing.email}`);

    // Ensure membership exists
    const isMember = existing.memberships.some((m) => m.organizationId === orgId);
    if (!isMember) {
      await db.member.create({
        data: { userId: existing.id, organizationId: orgId, role: Role.OWNER, status: "ACTIVE" },
      });
      console.log(`  ✓ Added existing user to organization as OWNER`);
    }

    // Ensure user role/status is set correctly
    if (existing.role !== Role.OWNER || existing.status !== "ACTIVE") {
      await db.user.update({
        where: { id: existing.id },
        data: { role: Role.OWNER, status: "ACTIVE" },
      });
    }

    return existing;
  }

  if (!INITIAL_OWNER_PASSWORD || INITIAL_OWNER_PASSWORD.length < 8) {
    throw new Error(
      "INITIAL_OWNER_PASSWORD environment variable must be set and at least 8 characters long to create the initial OWNER account."
    );
  }

  const passwordHash = await bcrypt.hash(INITIAL_OWNER_PASSWORD, 10);

  const user = await db.user.create({
    data: {
      email: SEED_USER_EMAIL,
      name: SEED_USER_NAME,
      passwordHash,
      role: Role.OWNER,
      status: "ACTIVE",
      memberships: {
        create: [{ organizationId: orgId, role: Role.OWNER, status: "ACTIVE" }],
      },
    },
  });

  console.log(`  ✓ Created user: ${user.email} (${user.id})`);
  return user;
}

async function seedEmailAccount(orgId: string) {
  const existing = await db.emailAccount.findUnique({
    where: { email: SEED_USER_EMAIL },
  });

  if (existing) {
    console.log(`  ✓ EmailAccount already exists: ${existing.email}`);
    return existing;
  }

  const account = await db.emailAccount.create({
    data: {
      organizationId: orgId,
      provider: "gmail",
      displayName: "Annex Mail",
      email: SEED_USER_EMAIL,
      status: "PENDING_OAUTH",
      isPrimary: true,
    },
  });

  console.log(`  ✓ Created EmailAccount: ${account.email} (${account.id})`);
  return account;
}

async function seedLabels(orgId: string) {
  let created = 0;
  let skipped = 0;

  for (const label of SYSTEM_LABELS) {
    const existing = await db.label.findUnique({
      where: { organizationId_name: { organizationId: orgId, name: label.name } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.label.create({
      data: { organizationId: orgId, ...label },
    });
    created++;
  }

  console.log(`  ✓ Labels: ${created} created, ${skipped} already existed`);
}

async function seedTemplates(orgId: string, userId: string) {
  let created = 0;
  let skipped = 0;

  for (const tpl of STARTER_TEMPLATES) {
    const existing = await db.template.findFirst({
      where: { organizationId: orgId, name: tpl.name },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.template.create({
      data: { organizationId: orgId, createdBy: userId, ...tpl },
    });
    created++;
  }

  console.log(`  ✓ Templates: ${created} created, ${skipped} already existed`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🌱 Annex Mail — Database Seed\n");

  console.log("→ Organization");
  const org = await seedOrganization();

  console.log("→ User");
  const user = await seedUser(org.id);

  console.log("→ Email Account");
  await seedEmailAccount(org.id);

  console.log("→ Labels");
  await seedLabels(org.id);

  console.log("→ Templates");
  await seedTemplates(org.id, user.id);

  console.log("\n✅ Seed complete.\n");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
