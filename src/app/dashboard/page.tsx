import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Send,
  Layout,
  Users,
  Activity,
  AlertCircle,
  Clock,
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

  // Real database counts
  const draftsCount = await db.draft.count({
    where: { organizationId: orgId },
  });

  const templatesCount = await db.template.count({
    where: { organizationId: orgId },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sentTodayCount = await db.message.count({
    where: {
      conversation: { organizationId: orgId },
      direction: "OUTBOUND",
      createdAt: { gte: today },
    },
  });

  const failedCount = await db.message.count({
    where: {
      conversation: { organizationId: orgId },
      deliveryStatus: "FAILED",
    },
  });

  const pendingCount = await db.message.count({
    where: {
      conversation: { organizationId: orgId },
      deliveryStatus: "QUEUED",
    },
  });

  const teamCount = await db.member.count({
    where: { organizationId: orgId },
  });

  const metrics = [
    {
      title: "Drafts Count",
      value: String(draftsCount),
      description: "Saved layouts",
      icon: Mail,
    },
    {
      title: "Sent Today",
      value: String(sentTodayCount),
      description: "Outgoing team count",
      icon: Send,
    },
    {
      title: "Failed Emails",
      value: String(failedCount),
      description: "Transmission failures",
      icon: AlertCircle,
    },
    {
      title: "Pending Queue",
      value: String(pendingCount),
      description: "Queued deliveries",
      icon: Clock,
    },
    {
      title: "Active Templates",
      value: String(templatesCount),
      description: "Reusable email blueprints",
      icon: Layout,
    },
    {
      title: "Team Members",
      value: String(teamCount),
      description: "Collaborating now",
      icon: Users,
    },
  ];

  // Dynamic audit logs from console/mock actions
  const activityLogs = [
    {
      id: "1",
      action: "LOGIN_SUCCESS",
      user: session.user.email || "user@annex.com",
      message: `${session.user.name || "User"} authenticated successfully`,
      time: "Just now",
      color: "text-emerald-400 bg-emerald-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Greetings */}
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-zinc-100">
          Overview
        </h1>
        <p className="mt-1 font-sans text-sm text-zinc-400">
          Welcome back. Here is the operational status of Annex Mail.
        </p>
      </div>

      {/* Grid Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-mono text-xs font-medium tracking-wider text-zinc-400 uppercase">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight text-zinc-100">
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

      {/* Activity Logs Panel */}
      <Card className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100">
              <Activity className="h-4.5 w-4.5 text-zinc-400" />
              Recent Audit Logs
            </CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Live monitoring of access and authorization logs
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-zinc-800/60">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex items-center rounded-md border border-zinc-800 px-2 py-1 font-mono text-[10px] font-medium ${log.color}`}
                  >
                    {log.action}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-zinc-300">
                      {log.message}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500">
                      {log.user}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
