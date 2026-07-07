import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Forbidden } from "@/components/auth/forbidden";

export const metadata = {
  title: "Audit Logs - Annex Mail",
};

export default async function LogsPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return <Forbidden />;
  }

  const orgId = session.user.organizationId;

  // Query recent database records
  const [messages, jobs] = await Promise.all([
    db.message.findMany({
      where: { conversation: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.jobRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  interface AuditEvent {
    id: string;
    action: string;
    actor: string;
    message: string;
    time: Date;
    status: "success" | "error" | "pending";
    color: string;
  }

  const events: AuditEvent[] = [];

  messages.forEach((msg) => {
    const isOut = msg.direction === "OUTBOUND";
    const failed = msg.deliveryStatus === "FAILED";
    const pending = msg.deliveryStatus === "QUEUED";

    events.push({
      id: `msg-${msg.id}`,
      action: failed ? "EMAIL_FAILED" : isOut ? "EMAIL_SENT" : "EMAIL_RECEIVED",
      actor: msg.sender,
      message: `${isOut ? "To: " + msg.recipients.join(", ") : "From: " + msg.sender} | Subject: "${msg.subject}"`,
      time: msg.createdAt,
      status: failed ? "error" : pending ? "pending" : "success",
      color: failed
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : pending
          ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
          : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    });
  });

  jobs.forEach((job) => {
    const failed = job.status === "failed";
    const completed = job.status === "completed";

    events.push({
      id: `job-${job.id}`,
      action: `JOB_${job.name.toUpperCase()}`,
      actor: "SYSTEM_QUEUE",
      message: `Execution task: ${job.name} (Attempts: ${job.attempts}/${job.maxAttempts})${job.error ? ` | Error: ${job.error}` : ""}`,
      time: job.createdAt,
      status: failed ? "error" : completed ? "success" : "pending",
      color: failed
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : completed
          ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
          : "text-amber-400 bg-amber-500/10 border-amber-500/20",
    });
  });

  // Sort chronologically descending
  const sortedEvents = events
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 50);

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Historical log of platform database operations, access audits, and
          scheduler execution routines.
        </p>
      </div>

      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-zinc-400" />
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-100">
              Operations Audit Ledger
            </CardTitle>
          </div>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
            {sortedEvents.length} Recent Logs
          </span>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Historical Audit Logs"
              description="System log updates, role adjustments, scheduled sync loops, and mailbox events will compile here."
            />
          ) : (
            <div className="divide-zinc-850 divide-y">
              {sortedEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[9px] leading-relaxed font-semibold tracking-wider ${evt.color}`}
                    >
                      {evt.action}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs leading-normal font-semibold break-words text-zinc-300">
                        {evt.message}
                      </p>
                      <p className="font-mono text-[10px] break-all text-zinc-500">
                        Actor: {evt.actor}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 self-end font-mono text-[10px] text-zinc-500 sm:self-start">
                    <span className="hidden sm:inline">|</span>
                    <span>
                      {new Date(evt.time).toLocaleString([], {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
