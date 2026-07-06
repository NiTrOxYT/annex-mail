import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { container, ensureInitialized } from "@/lib/di/container";
import { StorageProvider } from "@/lib/storage/storage.interface";
import { EmailProvider } from "@/lib/email/provider.interface";
import { appConfig } from "@/config/app";
import { APP_VERSION } from "@/config/version";
import { googleConfig } from "@/config/google";
import { emailConfig } from "@/config/email";

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
    await ensureInitialized();
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
    googleConfig.clientId && googleConfig.clientSecret
      ? "healthy"
      : "unavailable";

  const brevo: ServiceStatus =
    emailConfig.brevo.apiKey && emailConfig.brevo.smtpLogin
      ? "healthy"
      : "unavailable";

  // Fetch scheduler metadata logs
  const metadata = await db.systemMetadata.findMany().catch(() => []);
  const metaMap = new Map(metadata.map((m) => [m.key, m.value]));

  const lastDailyMaintenance = metaMap.get("last_daily_maintenance") || null;
  const lastWatchRenewal = metaMap.get("last_watch_renewal") || null;
  const lastQueueCleanup = metaMap.get("last_queue_cleanup") || null;
  const lastHistorySync = metaMap.get("last_history_sync") || null;

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
      scheduler: {
        lastDailyMaintenance,
        lastWatchRenewal,
        lastQueueCleanup,
        lastHistorySync,
      },
    },
    { status: isHealthy ? 200 : 503 },
  );
}
