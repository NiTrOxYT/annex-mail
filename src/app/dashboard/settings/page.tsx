"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  status: string;
  updatedAt: string;
  syncState?: {
    lastSuccessfulSync?: string;
    status: string;
  } | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/email-accounts");
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          setAccounts(body.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch email accounts", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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

  const handleDisconnect = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to disconnect this Gmail account? All historical database synchronization metadata will be removed.",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/email-accounts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAccounts();
      } else {
        alert("Failed to disconnect mailbox.");
      }
    } catch (err) {
      console.error(err);
      alert("Error during disconnect.");
    } finally {
      setLoading(false);
    }
  };

  // Connection validation rule: Account exists and status == "ACTIVE" and provider == "gmail"
  const gmailAccount = accounts.find(
    (acc) => acc.provider === "gmail" && acc.status === "ACTIVE",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 font-sans text-zinc-300">
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
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100">
            <Mail className="h-4.5 w-4.5 text-zinc-400" />
            Email Provider Connection
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Connect your organization&apos;s business mailbox for synchronized
            ingestion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fetching ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : gmailAccount ? (
            /* Active Connection UI */
            <div className="space-y-4 border-t border-zinc-800/60 pt-4 text-xs">
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400">
                      ✓ Connected
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {gmailAccount.email}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-zinc-500">
                    <p>
                      Provider:{" "}
                      <span className="font-mono text-zinc-400">
                        Google Gmail API
                      </span>
                    </p>
                    <p>
                      Status:{" "}
                      <span className="font-mono text-zinc-400 uppercase">
                        {gmailAccount.status}
                      </span>
                    </p>
                    {gmailAccount.syncState?.lastSuccessfulSync && (
                      <p>
                        Last Sync:{" "}
                        <span className="font-mono text-zinc-400">
                          {new Date(
                            gmailAccount.syncState.lastSuccessfulSync,
                          ).toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleConnectGmail}
                    disabled={loading}
                    variant="outline"
                    className="text-zinc-450 hover:text-zinc-250 flex h-8 cursor-pointer items-center gap-1.5 border-zinc-800 text-[11px] font-semibold"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reconnect
                  </Button>
                  <Button
                    onClick={() => handleDisconnect(gmailAccount.id)}
                    disabled={loading}
                    variant="destructive"
                    className="flex h-8 cursor-pointer items-center gap-1.5 border border-red-900/30 bg-red-950/20 text-[11px] font-semibold text-red-400 hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Disconnected / Ready to Connect UI */
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
              <Button
                onClick={handleConnectGmail}
                disabled={loading}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" />
                {loading ? "Connecting..." : "Connect Gmail"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
