import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { container } from "@/lib/di/container";
import { StorageProvider } from "@/lib/storage/storage.interface";
import { EmailProvider } from "@/lib/email/provider.interface";
import { appConfig } from "@/config/app";
import { APP_VERSION } from "@/config/version";

type ServiceStatus = "healthy" | "degraded" | "unavailable";

async function probeDatabase(): Promise<{
  status: ServiceStatus;
  error?: string;
}> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "healthy" };
  } catch (err) {
    return {
      status: "unavailable",
      error: appConfig.env === "development" ? String(err) : undefined,
    };
  }
}

async function probeStorage(): Promise<{ status: ServiceStatus }> {
  try {
    const storage = container.resolve<StorageProvider>("StorageProvider");
    await storage.exists("health-check-probe.txt");
    return { status: "healthy" };
  } catch {
    return { status: "degraded" };
  }
}

async function probeQueue(): Promise<{
  status: ServiceStatus;
  pendingJobs?: number;
}> {
  try {
    const pending = await db.jobRecord
      .count({ where: { status: "queued" } })
      .catch(() => null);
    return {
      status: "healthy",
      ...(pending !== null && { pendingJobs: pending }),
    };
  } catch {
    // Queue table may not exist in dev without migration
    return { status: "degraded" };
  }
}

async function probeMail(): Promise<{ status: ServiceStatus }> {
  try {
    const emailProvider = container.resolve<EmailProvider>("EmailProvider");
    await emailProvider.sync();
    return { status: "healthy" };
  } catch {
    return { status: "degraded" };
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();

  const [dbResult, storageResult, queueResult, mailResult] = await Promise.all([
    probeDatabase(),
    probeStorage(),
    probeQueue(),
    probeMail(),
  ]);

  const googleOAuth: ServiceStatus =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? "healthy"
      : "unavailable";

  const brevo: ServiceStatus =
    process.env.BREVO_API_KEY && process.env.BREVO_SMTP_LOGIN
      ? "healthy"
      : "unavailable";

  // Database unavailable = unhealthy. Others degrade gracefully.
  const isHealthy = dbResult.status !== "unavailable";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      version: APP_VERSION,
      environment: appConfig.env,
      timestamp,
      services: {
        database: dbResult,
        storage: storageResult,
        queue: queueResult,
        mailProvider: mailResult,
        authentication: { status: "healthy" as ServiceStatus },
        googleOAuth: { status: googleOAuth },
        brevo: { status: brevo },
      },
    },
    { status: isHealthy ? 200 : 503 },
  );
}
