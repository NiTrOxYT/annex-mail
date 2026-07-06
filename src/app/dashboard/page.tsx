import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Reply, Layout, Users, Activity } from "lucide-react";

export const metadata = {
  title: "Dashboard - Annex Mail",
};

export default function DashboardPage() {
  // Temporary mock data for metrics
  const metrics = [
    {
      title: "Unread Messages",
      value: "12",
      description: "Requires attention",
      icon: Mail,
    },
    {
      title: "Sent Today",
      value: "28",
      description: "Outgoing team count",
      icon: Send,
    },
    {
      title: "Pending Replies",
      value: "4",
      description: "Assigned to you",
      icon: Reply,
    },
    {
      title: "Active Templates",
      value: "16",
      description: "Reusable email blueprints",
      icon: Layout,
    },
    {
      title: "Team Members",
      value: "5",
      description: "Collaborating now",
      icon: Users,
    },
  ];

  // Mock activity logs
  const activityLogs = [
    {
      id: "1",
      action: "LOGIN_SUCCESS",
      user: "owner@annex.com",
      message: "Owner authenticated successfully",
      time: "2 mins ago",
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      id: "2",
      action: "USER_UPDATED",
      user: "admin@annex.com",
      message: "Updated profile details",
      time: "15 mins ago",
      color: "text-blue-400 bg-blue-500/10",
    },
    {
      id: "3",
      action: "LOGIN_SUCCESS",
      user: "employee@annex.com",
      message: "Employee authenticated successfully",
      time: "1 hour ago",
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      id: "4",
      action: "USER_CREATED",
      user: "system",
      message: "Created user account client-support@annex-consultancy.com",
      time: "1 day ago",
      color: "text-purple-400 bg-purple-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Greetings */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Welcome back. Here is the operational status of Annex Mail.
        </p>
      </div>

      {/* Grid Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
