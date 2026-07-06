import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { container } from "@/lib/di/container";
import { StorageProvider } from "@/lib/storage/storage.interface";
import { EmailProvider } from "@/lib/email/provider.interface";
import { appConfig } from "@/config/app";

export async function GET() {
  const timestamp = new Date().toISOString();

  let dbStatus: "healthy" | "unhealthy" = "healthy";
  let dbError: string | undefined;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = "unhealthy";
    dbError = err instanceof Error ? err.message : String(err);
  }

  let storageStatus: "healthy" | "unhealthy" = "healthy";
  try {
    const storage = container.resolve<StorageProvider>("StorageProvider");
    await storage.exists("health-check-probe.txt");
  } catch {
    storageStatus = "unhealthy";
  }

  let mailStatus: "healthy" | "unhealthy" = "healthy";
  try {
    const emailProvider = container.resolve<EmailProvider>("EmailProvider");
    await emailProvider.sync();
  } catch {
    mailStatus = "unhealthy";
  }

  const isHealthy =
    dbStatus === "healthy" &&
    storageStatus === "healthy" &&
    mailStatus === "healthy";

  const responseData = {
    status: isHealthy ? "healthy" : "unhealthy",
    environment: appConfig.env,
    version: "1.0.0-phase1.5",
    timestamp,
    services: {
      database: {
        status: dbStatus,
        ...(appConfig.env === "development" && dbError
          ? { error: dbError }
          : {}),
      },
      storage: {
        status: storageStatus,
      },
      mailProvider: {
        status: mailStatus,
      },
      authentication: {
        status: "healthy",
      },
    },
  };

  return NextResponse.json(responseData, {
    status: isHealthy ? 200 : 503,
  });
}
