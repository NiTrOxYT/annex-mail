import { NextRequest, NextResponse } from "next/server";
import { schedulerService } from "@/services/scheduler.service";
import { withRateLimit } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

function validateCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function getHandler(req: Request) {
  // Convert basic Request to NextRequest for utility functions
  const nextReq = new NextRequest(req.url, { headers: req.headers });

  if (!validateCronSecret(nextReq)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await schedulerService.runDailyMaintenance();
    const isDegraded = summary.status === "degraded";
    return NextResponse.json(
      { ok: !isDegraded, summary },
      { status: isDegraded ? 200 : 200 },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export const GET = withRateLimit(getHandler, {
  keyPrefix: "cron_daily_maintenance",
  limit: 10,
  windowMs: 60 * 1000,
});
