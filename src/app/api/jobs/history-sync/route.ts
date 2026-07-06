import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/di/container";
import { SyncStateRepository } from "@/repositories/sync-state.repository";
import { historyService } from "@/services/history.service";
import { logger } from "@/lib/logger/logger";

export const dynamic = "force-dynamic";

function validateCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const syncStateRepo = container.resolve<SyncStateRepository>(
    "SyncStateRepository",
  );
  const results: { accountId: string; status: string; error?: string }[] = [];

  try {
    // Get all orgs from DB — for now fetch all accounts by iterating orgs
    // Simple approach: query all emailAccounts directly via Prisma
    const { db } = await import("@/lib/db/db");
    const accounts = await db.emailAccount.findMany({
      where: { status: "ACTIVE" },
    });

    for (const account of accounts) {
      try {
        const syncState = await syncStateRepo.findByEmailAccountId(account.id);
        if (!syncState?.historyId) {
          results.push({ accountId: account.id, status: "skipped_no_history" });
          continue;
        }
        await historyService.processHistorySync(account, syncState.historyId);
        results.push({ accountId: account.id, status: "success" });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({ accountId: account.id, status: "error", error });
        logger.error("History sync failed", "CronHistorySync", {
          accountId: account.id,
          error,
        });
      }
    }

    logger.info("History sync cron completed", "CronHistorySync", {
      duration: Date.now() - started,
      processed: results.length,
    });

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("History sync cron fatal", "CronHistorySync", { error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
