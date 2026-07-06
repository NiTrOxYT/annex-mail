"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleConnectGmail = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail/connect", { method: "POST" });
      if (res.ok) {
        const body = (await res.json()) as {
          success: boolean;
          data: { url: string };
        };
        if (body.success && body.data.url) {
          window.location.href = body.data.url;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure email provider connections and platform integrations.
        </p>
      </div>

      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-tight text-zinc-100">
            Email Provider Connection
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Connect your organization&apos;s business mailbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-4">
            <div>
              <p className="text-xs font-semibold text-zinc-300">
                Google Gmail API
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Enable secure, automated message ingestion and watchers
                synchronization.
              </p>
            </div>
            <button
              onClick={handleConnectGmail}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" />
              {loading ? "Connecting..." : "Connect Gmail"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
