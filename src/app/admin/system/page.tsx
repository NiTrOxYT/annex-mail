/* eslint-disable react-hooks/purity */
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/db";
import { APP_VERSION } from "@/config/version";
import { appConfig } from "@/config/app";
import { storageConfig } from "@/config/storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const session = await auth();

  // Enforce OWNER role only
  if (!session || !session.user || session.user.role !== "OWNER") {
    redirect("/login");
  }

  // 1. Database Ping
  const dbStart = Date.now();
  let dbStatus = "healthy";
  let dbLatency = 0;
  try {
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = "unavailable";
  }

  // 2. Queue Status
  const [queuedJobs, processingJobs, completedJobs, failedJobs] =
    await Promise.all([
      db.jobRecord.count({ where: { status: "queued" } }).catch(() => 0),
      db.jobRecord.count({ where: { status: "processing" } }).catch(() => 0),
      db.jobRecord.count({ where: { status: "completed" } }).catch(() => 0),
      db.jobRecord.count({ where: { status: "failed" } }).catch(() => 0),
    ]);

  // 3. Google watch status
  const activeWatches = await db.watchState
    .findMany({
      orderBy: { expiration: "asc" },
      take: 10,
    })
    .catch(() => []);

  // 4. Recent job errors
  const recentErrors = await db.jobRecord
    .findMany({
      where: { status: "failed" },
      orderBy: { updatedAt: "desc" },
      take: 5,
    })
    .catch(() => []);

  const googleOAuthStatus =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? "Configured"
      : "Missing Credentials";

  const brevoStatus =
    process.env.BREVO_API_KEY && process.env.BREVO_SMTP_LOGIN
      ? "Configured"
      : "Missing Credentials";

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-10 font-sans text-zinc-50">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
              System Observability
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Real-time server diagnostics and infrastructure status console.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900/80"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card: Core Settings */}
          <div className="border-zinc-850 flex flex-col justify-between rounded-xl border bg-zinc-900/10 p-6">
            <h2 className="text-sm font-semibold text-zinc-400">
              Core Environment
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Version</span>
                <span className="font-mono text-zinc-300">v{APP_VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Environment</span>
                <span className="text-zinc-300 capitalize">
                  {appConfig.env}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Storage Provider</span>
                <span className="text-zinc-300 capitalize">
                  {storageConfig.provider}
                </span>
              </div>
            </div>
            <div className="border-zinc-850 mt-6 flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-zinc-500">Node Version</span>
              <span className="font-mono text-zinc-300">{process.version}</span>
            </div>
          </div>

          {/* Card: Database Status */}
          <div className="border-zinc-850 flex flex-col justify-between rounded-xl border bg-zinc-900/10 p-6">
            <h2 className="text-sm font-semibold text-zinc-400">
              Database Engine
            </h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-zinc-100">
                {dbStatus === "healthy" ? `${dbLatency}ms` : "Offline"}
              </span>
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Latency
              </span>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Connection Status</span>
                <span
                  className={`font-semibold ${dbStatus === "healthy" ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {dbStatus.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="border-zinc-850 mt-6 flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-zinc-500">Target Driver</span>
              <span className="font-mono text-zinc-300">PostgreSQL</span>
            </div>
          </div>

          {/* Card: API Providers */}
          <div className="border-zinc-850 flex flex-col justify-between rounded-xl border bg-zinc-900/10 p-6">
            <h2 className="text-sm font-semibold text-zinc-400">
              External Integrations
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Google OAuth</span>
                <span
                  className={`font-medium ${googleOAuthStatus === "Configured" ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {googleOAuthStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Brevo Mailer</span>
                <span
                  className={`font-medium ${brevoStatus === "Configured" ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {brevoStatus}
                </span>
              </div>
            </div>
            <div className="border-zinc-850 mt-6 flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-zinc-500">OAuth Callback Uri</span>
              <span className="max-w-[150px] truncate font-mono text-[9px] text-zinc-300">
                /api/gmail/callback
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Sections */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Section: Queue Metrics */}
          <div className="border-zinc-850 space-y-6 rounded-xl border bg-zinc-900/10 p-6">
            <div>
              <h3 className="text-base font-semibold text-zinc-300">
                Background Job Queue
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                DB-backed queue processor metrics
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="border-zinc-850/60 rounded-lg border bg-zinc-950/40 p-3">
                <span className="block text-xl font-semibold text-zinc-300">
                  {queuedJobs}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Queued
                </span>
              </div>
              <div className="border-zinc-850/60 rounded-lg border bg-zinc-950/40 p-3">
                <span className="block text-xl font-semibold text-zinc-300">
                  {processingJobs}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Active
                </span>
              </div>
              <div className="border-zinc-850/60 rounded-lg border bg-zinc-950/40 p-3">
                <span className="block text-xl font-semibold text-zinc-300">
                  {completedJobs}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Done
                </span>
              </div>
              <div className="border-zinc-850/60 rounded-lg border bg-zinc-950/40 p-3">
                <span
                  className={`block text-xl font-semibold ${failedJobs > 0 ? "text-rose-400" : "text-zinc-300"}`}
                >
                  {failedJobs}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Failed
                </span>
              </div>
            </div>
          </div>

          {/* Section: Gmail Push Watchers */}
          <div className="border-zinc-850 space-y-4 rounded-xl border bg-zinc-900/10 p-6">
            <div>
              <h3 className="text-base font-semibold text-zinc-300">
                Active Gmail Watchers
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Real-time Pub/Sub push notification subscription states
              </p>
            </div>
            {activeWatches.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                No mailbox watchers active.
              </p>
            ) : (
              <div className="max-h-[140px] space-y-2 overflow-y-auto">
                {activeWatches.map((w) => {
                  const daysLeft = Math.ceil(
                    (w.expiration.getTime() - Date.now()) /
                      (24 * 60 * 60 * 1000),
                  );
                  return (
                    <div
                      key={w.id}
                      className="border-zinc-850/50 flex items-center justify-between rounded-lg border bg-zinc-950/20 p-2.5 text-xs"
                    >
                      <span className="max-w-[200px] truncate font-mono text-zinc-400">
                        Account ID: {w.emailAccountId}
                      </span>
                      <span
                        className={`font-semibold ${daysLeft < 2 ? "text-amber-400" : "text-emerald-400"}`}
                      >
                        {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Error Log */}
        <div className="border-zinc-850 space-y-4 rounded-xl border bg-zinc-900/10 p-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-300">
              Recent Queue Exceptions
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Detailed stack errors from failed background jobs
            </p>
          </div>
          {recentErrors.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Zero queue exceptions encountered. System clean.
            </p>
          ) : (
            <div className="space-y-3">
              {recentErrors.map((err) => (
                <div
                  key={err.id}
                  className="border-zinc-850 space-y-1 rounded-lg border bg-zinc-950/40 p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-400">
                      {err.name}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(err.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 rounded bg-zinc-950/20 p-2 font-mono text-[11px] break-all text-zinc-400">
                    {err.error || "No error stack recorded"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
