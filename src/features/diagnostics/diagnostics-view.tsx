"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Database,
  ArrowRight,
  Shield,
  Radio,
  Webhook,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DiagnosticData {
  oauth: {
    connected: boolean;
    email: string | null;
    status: string;
    tokenExpiration: string | null;
    tokenExpired: boolean;
  };
  watch: {
    configured: boolean;
    resourceId: string | null;
    expiration: string | null;
    expired: boolean;
  };
  pubsub: {
    configured: boolean;
    topic: string | null;
  };
  webhook: {
    configured: boolean;
    url: string | null;
  };
  sync: {
    status: string;
    lastHistoryId: string | null;
    lastSuccessfulSync: string | null;
    lastError: string | null;
  };
  database: {
    messagesImported: number;
    conversationsImported: number;
  };
  queue: {
    queued: number;
    processing: number;
    failed: number;
    recentJobs: Array<{
      id: string;
      name: string;
      status: string;
      attempts: number;
      error?: string;
      createdAt: string;
    }>;
  };
  performance: {
    dbResponseTimeMs: number;
    apiTotalDurationMs: number;
  };
}

export function DiagnosticsView() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostics");
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
          setError(null);
        } else {
          setError(body.error?.message || "Failed to load diagnostics");
        }
      } else {
        setError(`Failed to fetch: HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch("/api/diagnostics");
        if (res.ok && active) {
          const body = await res.json();
          if (body.success) {
            setData(body.data);
            setError(null);
          } else if (active) {
            setError(body.error?.message || "Failed to load diagnostics");
          }
        } else if (active) {
          setError(`Failed to fetch: HTTP ${res.status}`);
        }
      } catch (err) {
        if (active) {
          console.error(err);
          setError("An unexpected error occurred.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-lg font-semibold text-zinc-200">
          Diagnostics Error
        </h2>
        <p className="text-sm text-zinc-400">{error}</p>
        <Button
          onClick={fetchDiagnostics}
          className="text-zinc-250 bg-zinc-800 hover:bg-zinc-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  const d = data!;

  const getPipelineStatus = () => {
    if (!d.oauth.connected || d.oauth.status !== "ACTIVE") {
      return {
        stage: "Google OAuth",
        desc: "Gmail connection is disconnected or disabled.",
        severity: "critical",
      };
    }
    if (!d.watch.configured || d.watch.expired) {
      return {
        stage: "Gmail Push Watch",
        desc: "Gmail watch state is not registered or has expired.",
        severity: "warning",
      };
    }
    if (!d.pubsub.configured) {
      return {
        stage: "Pub/Sub Configuration",
        desc: "Google Cloud Pub/Sub topic configuration is missing.",
        severity: "critical",
      };
    }
    if (d.sync.status === "FAILED") {
      return {
        stage: "Sync Importer",
        desc: "The background synchronization processor encountered an error.",
        severity: "warning",
      };
    }
    if (d.queue.failed > 0) {
      return {
        stage: "Background Queue",
        desc: "There are failed sync tasks in the background job queue.",
        severity: "warning",
      };
    }
    return null;
  };

  const stoppedStage = getPipelineStatus();

  return (
    <div className="mx-auto max-w-6xl space-y-8 font-sans text-zinc-300">
      <div className="border-zinc-850 flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            System Diagnostics
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Internal health diagnostics for mailbox synchronization, Google
            integrations, and queues.
          </p>
        </div>
        <Button
          onClick={fetchDiagnostics}
          disabled={loading}
          variant="outline"
          className="text-zinc-405 hover:text-zinc-205 h-8 border-zinc-800 text-xs font-semibold"
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh Status
        </Button>
      </div>

      {/* Sync Pipeline Status Visualization */}
      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/10">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-tight text-zinc-200">
            Synchronization Pipeline Health Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-zinc-850 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-zinc-950/20 p-5">
            {/* Step 1: OAuth */}
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${d.oauth.connected ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-900 text-zinc-500"}`}
              >
                <Shield className="h-4.5 w-4.5" />
              </div>
              <span className="text-zinc-450 font-mono text-[9px] tracking-wider uppercase">
                OAuth
              </span>
              <span className="text-[10px] text-zinc-500">
                {d.oauth.connected ? "Active" : "Offline"}
              </span>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-zinc-700 sm:block" />

            {/* Step 2: Push Watch */}
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${d.watch.configured && !d.watch.expired ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-900 text-zinc-500"}`}
              >
                <Clock className="h-4.5 w-4.5" />
              </div>
              <span className="text-zinc-450 font-mono text-[9px] tracking-wider uppercase">
                Push Watch
              </span>
              <span className="text-[10px] text-zinc-500">
                {d.watch.configured ? "Registered" : "Pending"}
              </span>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-zinc-700 sm:block" />

            {/* Step 3: Pub/Sub */}
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${d.pubsub.configured ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-900 text-zinc-500"}`}
              >
                <Radio className="h-4.5 w-4.5" />
              </div>
              <span className="text-zinc-450 font-mono text-[9px] tracking-wider uppercase">
                Pub/Sub
              </span>
              <span className="text-[10px] text-zinc-500">
                {d.pubsub.configured ? "Configured" : "Missing"}
              </span>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-zinc-700 sm:block" />

            {/* Step 4: Webhook */}
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${d.webhook.configured ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-900 text-zinc-500"}`}
              >
                <Webhook className="h-4.5 w-4.5" />
              </div>
              <span className="text-zinc-450 font-mono text-[9px] tracking-wider uppercase">
                Webhook
              </span>
              <span className="text-[10px] text-zinc-500">
                {d.webhook.configured ? "Listening" : "Unset"}
              </span>
            </div>

            <ArrowRight className="hidden h-4 w-4 text-zinc-700 sm:block" />

            {/* Step 5: Ingest Queue */}
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${d.queue.failed === 0 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}`}
              >
                <Database className="h-4.5 w-4.5" />
              </div>
              <span className="text-zinc-450 font-mono text-[9px] tracking-wider uppercase">
                Queue
              </span>
              <span className="text-[10px] text-zinc-500">
                {d.queue.failed > 0 ? "Degraded" : "Healthy"}
              </span>
            </div>
          </div>

          {/* Pipeline Stop Analysis */}
          {stoppedStage ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-900/30 bg-amber-950/15 p-4 text-xs text-amber-300">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-200">
                  Synchronization Stopped At: {stoppedStage.stage}
                </p>
                <p className="text-zinc-450">{stoppedStage.desc}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-900/30 bg-emerald-950/10 p-4 text-xs text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-300">
                  All Pipeline Stages Functional
                </p>
                <p className="text-zinc-450">
                  Google OAuth connected, push watch active, Pub/Sub webhook
                  operational, and sync queue healthy.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Google OAuth & Watch Details */}
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-200">
              Integration Configuration Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Connected Account</span>
              <span className="font-medium text-zinc-300">
                {d.oauth.email || "Not Connected"}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">OAuth Status</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${d.oauth.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
              >
                {d.oauth.status}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Token Expiration</span>
              <span className="font-mono text-zinc-300">
                {d.oauth.tokenExpiration
                  ? new Date(d.oauth.tokenExpiration).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Pub/Sub Topic</span>
              <span
                className="max-w-[240px] truncate font-mono text-zinc-300"
                title={d.pubsub.topic || ""}
              >
                {d.pubsub.topic || "Unconfigured"}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Push Subscription Webhook</span>
              <span
                className="max-w-[240px] truncate font-mono text-zinc-300"
                title={d.webhook.url || ""}
              >
                {d.webhook.url || "Unconfigured"}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Gmail Watch Resource ID</span>
              <span className="font-mono text-zinc-300">
                {d.watch.resourceId || "None"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Watch Expiration</span>
              <span className="font-mono text-zinc-300">
                {d.watch.expiration
                  ? new Date(d.watch.expiration).toLocaleString()
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sync Stats & Performance */}
        <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-200">
              Synchronization & Storage Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Sync Processor Status</span>
              <span className="text-zinc-350 font-semibold">
                {d.sync.status}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Last Synced History ID</span>
              <span className="font-mono text-zinc-300">
                {d.sync.lastHistoryId || "None"}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Last Successful Sync</span>
              <span className="font-mono text-zinc-300">
                {d.sync.lastSuccessfulSync
                  ? new Date(d.sync.lastSuccessfulSync).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Messages Ingested</span>
              <span className="font-mono font-medium text-zinc-300">
                {d.database.messagesImported}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Conversations Created</span>
              <span className="font-mono font-medium text-zinc-300">
                {d.database.conversationsImported}
              </span>
            </div>
            <div className="border-zinc-850 flex items-center justify-between border-b pb-2">
              <span className="text-zinc-500">Database Response Time</span>
              <span className="font-mono text-zinc-300">
                {d.performance.dbResponseTimeMs} ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">API Execution Overhead</span>
              <span className="font-mono text-zinc-300">
                {d.performance.apiTotalDurationMs} ms
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Background Jobs Queue Logs */}
      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-200">
              Sync Workers Queue (JobRecord)
            </CardTitle>
            <p className="mt-1 text-[10px] text-zinc-500">
              Pending: {d.queue.queued} | Active: {d.queue.processing} | Failed:{" "}
              {d.queue.failed}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {d.queue.recentJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No background sync tasks recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-[9px] tracking-wider text-zinc-500 uppercase">
                    <th className="py-2">Job Name</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Attempts</th>
                    <th className="py-2">Enqueued At</th>
                    <th className="py-2">Error Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {d.queue.recentJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-zinc-900/10">
                      <td className="py-2.5 font-sans font-medium text-zinc-300">
                        {j.name}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${j.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : j.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-2.5">{j.attempts}</td>
                      <td className="py-2.5 text-zinc-500">
                        {new Date(j.createdAt).toLocaleTimeString()}
                      </td>
                      <td
                        className="max-w-xs truncate py-2.5 text-red-400"
                        title={j.error || ""}
                      >
                        {j.error || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
