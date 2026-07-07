import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Send,
  Layout,
  Activity,
  Clock,
  Database,
  RefreshCw,
  HardDrive,
  User as UserIcon,
  Folder,
} from "lucide-react";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard - Annex Mail",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const orgId = session.user.organizationId;

  // 1. Fetch Organization Details & Primary Mailbox in parallel
  const [organization, primaryMailbox] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
    }),
    db.emailAccount
      .findFirst({
        where: { organizationId: orgId, isPrimary: true },
      })
      .then(async (primary) => {
        if (primary) return primary;
        return db.emailAccount.findFirst({
          where: { organizationId: orgId },
        });
      }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. Fetch all counts, sync stats, storage usage, and activity logs in parallel
  const [
    syncState,
    totalConversations,
    unreadMessages,
    draftsCount,
    templatesCount,
    sentTodayCount,
    storageAggregate,
    queuedJobs,
    processingJobs,
    failedJobs,
    recentMessages,
    recentJobs,
  ] = await Promise.all([
    primaryMailbox
      ? db.syncState.findUnique({
          where: { emailAccountId: primaryMailbox.id },
        })
      : Promise.resolve(null),
    db.conversation.count({
      where: { organizationId: orgId },
    }),
    db.message.count({
      where: {
        conversation: { organizationId: orgId },
        isRead: false,
        direction: "INBOUND",
      },
    }),
    db.draft.count({
      where: { organizationId: orgId },
    }),
    db.template.count({
      where: { organizationId: orgId },
    }),
    db.message.count({
      where: {
        conversation: { organizationId: orgId },
        direction: "OUTBOUND",
        createdAt: { gte: today },
      },
    }),
    db.attachment.aggregate({
      _sum: { size: true },
    }),
    db.jobRecord.count({ where: { status: "queued" } }),
    db.jobRecord.count({ where: { status: "processing" } }),
    db.jobRecord.count({ where: { status: "failed" } }),
    db.message.findMany({
      where: { conversation: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.jobRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalSizeBytes = storageAggregate._sum.size || 0;
  const storageUsageFormatted =
    totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalSizeBytes / 1024).toFixed(0)} KB`;

  interface ActivityLog {
    id: string;
    action: string;
    user: string;
    message: string;
    time: Date;
    color: string;
  }

  const logs: ActivityLog[] = [];

  // Map messages to activity logs
  recentMessages.forEach((msg) => {
    const isOut = msg.direction === "OUTBOUND";
    const failed = msg.deliveryStatus === "FAILED";
    logs.push({
      id: `msg-${msg.id}`,
      action: failed ? "EMAIL_FAILED" : isOut ? "EMAIL_SENT" : "EMAIL_RECEIVED",
      user: msg.sender,
      message: `${isOut ? "Sent" : "Received"} email: "${msg.subject}"`,
      time: msg.createdAt,
      color: failed
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : isOut
          ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
          : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    });
  });

  // Map jobs to activity logs
  recentJobs.forEach((job) => {
    const failed = job.status === "failed";
    const completed = job.status === "completed";
    logs.push({
      id: `job-${job.id}`,
      action: `JOB_${job.name.toUpperCase()}`,
      user: "SYSTEM_QUEUE",
      message: `Queue job: ${job.name} (${job.status})${job.error ? ` - ${job.error}` : ""}`,
      time: job.createdAt,
      color: failed
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : completed
          ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
          : "text-amber-400 bg-amber-500/10 border-amber-500/20",
    });
  });

  // Add organization creation log as baseline if exists
  if (organization) {
    logs.push({
      id: `org-${organization.id}`,
      action: "ORG_CREATED",
      user: session.user.email || "system",
      message: `Organization "${organization.name}" initialized`,
      time: organization.createdAt,
      color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
    });
  }

  // Sort unified logs chronologically desc
  const sortedLogs = logs
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 8);

  const stats = [
    {
      title: "Total Conversations",
      value: String(totalConversations),
      description: "Mailbox threads",
      icon: Folder,
    },
    {
      title: "Unread Messages",
      value: String(unreadMessages),
      description: "Awaiting review",
      icon: Mail,
    },
    {
      title: "Sent Today",
      value: String(sentTodayCount),
      description: "Outbound deliveries",
      icon: Send,
    },
    {
      title: "Active Templates",
      value: String(templatesCount),
      description: "Email blueprints",
      icon: Layout,
    },
    {
      title: "Saved Drafts",
      value: String(draftsCount),
      description: "Work in progress",
      icon: Clock,
    },
    {
      title: "Storage Usage",
      value: storageUsageFormatted,
      description: "Email attachments",
      icon: HardDrive,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans">
      {/* Greetings Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-800/40 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Overview
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Welcome back, {session.user.name}. Operational dashboard for{" "}
            {organization?.name || "Annex consultancy"}.
          </p>
        </div>

        {/* Identity Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-1.5 text-xs text-zinc-300">
            <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-medium">{session.user.email}</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 uppercase">
              {session.user.role}
            </span>
          </div>

          {primaryMailbox && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-1.5 text-xs text-zinc-300">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              <span>
                Mailbox:{" "}
                <strong className="text-zinc-200">
                  {primaryMailbox.email}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {stats.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-mono text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-zinc-100">
                  {metric.value}
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Status & Queue Health Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* System Sync Info */}
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100">
              <RefreshCw className="h-4 w-4 text-zinc-400" />
              Gmail Watch Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">Integration Status</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${primaryMailbox?.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${primaryMailbox?.status === "ACTIVE" ? "bg-emerald-500" : "bg-zinc-500"}`}
                />
                {primaryMailbox?.status || "None connected"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">Sync Status</span>
              <span className="font-medium text-zinc-300">
                {syncState?.status || "IDLE"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">Last Sync</span>
              <span className="font-mono text-zinc-300">
                {syncState?.lastSuccessfulSync
                  ? new Date(syncState.lastSuccessfulSync).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Last Attempt</span>
              <span className="font-mono text-zinc-300">
                {syncState?.lastAttempt
                  ? new Date(syncState.lastAttempt).toLocaleString()
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Database Queue Health */}
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100">
              <Database className="h-4 w-4 text-zinc-400" />
              Background Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">Queued Tasks</span>
              <span
                className={`font-mono font-medium ${queuedJobs > 0 ? "text-amber-400" : "text-zinc-400"}`}
              >
                {queuedJobs}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">In Progress</span>
              <span
                className={`font-mono font-medium ${processingJobs > 0 ? "text-purple-450 animate-pulse" : "text-zinc-400"}`}
              >
                {processingJobs}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Failed Retries</span>
              <span
                className={`font-mono font-medium ${failedJobs > 0 ? "text-red-400" : "text-zinc-400"}`}
              >
                {failedJobs}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Audit Summary */}
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100">
              <Activity className="h-4 w-4 text-zinc-400" />
              Event Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">System Logs</span>
              <span className="font-mono text-zinc-300">Live DB Ingestion</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
              <span className="text-zinc-500">Realtime Listener</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Database Connector</span>
              <span className="font-medium text-zinc-300">Supabase Pooler</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Activity Logs Panel */}
      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100">
              <Activity className="h-4.5 w-4.5 text-zinc-400" />
              Recent Operations Logs
            </CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Combined live database audits (emails and scheduler tasks)
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {sortedLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No historical log events recorded in the database.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[9px] font-medium ${log.color}`}
                    >
                      {log.action}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-zinc-300">
                        {log.message}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500">
                        Sender/Actor: {log.user}
                      </p>
                    </div>
                  </div>
                  <span className="ml-4 shrink-0 font-mono text-[10px] text-zinc-500">
                    {new Date(log.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
