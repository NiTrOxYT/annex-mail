"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Edit, X, Send } from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface Draft {
  id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject?: string;
  html?: string;
  updatedAt: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Editor Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    html: "",
  });

  const fetchDrafts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/drafts");
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          setDrafts(body.data);
        } else {
          setError(body.error?.message || "Failed to load drafts.");
        }
      } else {
        setError("Network error fetching drafts.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrafts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const openCreateModal = () => {
    setSelectedDraft(null);
    setFormData({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      html: "",
    });
    setIsOpen(true);
  };

  const openEditModal = (draft: Draft) => {
    setSelectedDraft(draft);
    setFormData({
      to: draft.to.join(", "),
      cc: draft.cc.join(", "),
      bcc: draft.bcc.join(", "),
      subject: draft.subject || "",
      html: draft.html || "",
    });
    setIsOpen(true);
  };

  const parseEmails = (str: string): string[] => {
    return str
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));
  };

  const handleSaveDraft = async () => {
    const payload = {
      to: parseEmails(formData.to),
      cc: parseEmails(formData.cc),
      bcc: parseEmails(formData.bcc),
      subject: formData.subject,
      html: formData.html,
    };

    try {
      const url = selectedDraft
        ? `/api/drafts/${selectedDraft.id}`
        : "/api/drafts";
      const method = selectedDraft ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setIsOpen(false);
        fetchDrafts();
      } else {
        alert("Failed to save draft.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving draft.");
    }
  };

  const handleSendDraft = async () => {
    const toList = parseEmails(formData.to);
    if (toList.length === 0) {
      alert("Please specify at least one valid recipient address in 'To'.");
      return;
    }

    setIsSending(true);
    const payload = {
      to: toList,
      cc: parseEmails(formData.cc),
      bcc: parseEmails(formData.bcc),
      subject: formData.subject || "(No Subject)",
      html: formData.html || "",
    };

    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        // If sent successfully, delete the draft as it is now sent
        if (selectedDraft) {
          await fetch(`/api/drafts/${selectedDraft.id}`, { method: "DELETE" });
        }
        setIsOpen(false);
        fetchDrafts();
      } else {
        const body = await res.json();
        alert(body.error?.message || "Failed to send email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending email.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDrafts();
      } else {
        alert("Failed to delete draft.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting draft.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-zinc-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Drafts
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Work in progress responses and outbound drafts.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Compose Draft
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="animate-in fade-in grid gap-4 duration-200 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Outbound Drafts Found"
          description="Your drafts folder is empty. Create a new message draft or click compose to draft a response."
          action={{
            label: "Create Draft",
            onClick: openCreateModal,
          }}
        />
      ) : (
        /* Drafts Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => (
            <Card
              key={draft.id}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 transition-all hover:border-zinc-700/80"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-zinc-500">
                    Last saved: {new Date(draft.updatedAt).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEditModal(draft)}
                      className="text-zinc-450 rounded p-1 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                      title="Edit/Send Draft"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="text-zinc-450 rounded p-1 transition-all hover:bg-zinc-800 hover:text-red-400"
                      title="Delete Draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <CardTitle className="mt-2 truncate text-sm leading-tight font-semibold text-zinc-200">
                  {draft.subject || "(No Subject)"}
                </CardTitle>
                <CardDescription className="mt-1 truncate text-xs text-zinc-500">
                  To: {draft.to.length > 0 ? draft.to.join(", ") : "(Empty)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="border-zinc-850 flex flex-1 flex-col justify-between border-t pt-3">
                <p className="line-clamp-3 min-h-[48px] text-xs leading-relaxed text-zinc-400">
                  {draft.html
                    ? draft.html.replace(/<[^>]*>/g, "")
                    : "(No Content)"}
                </p>
                <div className="mt-4 flex items-center justify-end">
                  <button
                    onClick={() => openEditModal(draft)}
                    className="text-zinc-350 hover:text-zinc-250 flex items-center gap-1 text-[10px] font-semibold transition-all"
                  >
                    Open Draft
                    <X className="h-3 w-3 rotate-45" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compose/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <FileText className="h-4.5 w-4.5 text-zinc-400" />
              {selectedDraft ? "Edit Outbound Draft" : "Compose New Message"}
            </DialogTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                To (comma-separated)
              </label>
              <Input
                value={formData.to}
                onChange={(e) =>
                  setFormData({ ...formData, to: e.target.value })
                }
                placeholder="recipient@domain.com"
                required
                className="w-full border-zinc-800 bg-zinc-900/40 font-mono text-zinc-300"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-zinc-500 uppercase">
                  Cc
                </label>
                <Input
                  value={formData.cc}
                  onChange={(e) =>
                    setFormData({ ...formData, cc: e.target.value })
                  }
                  placeholder="carboncopy@domain.com"
                  className="w-full border-zinc-800 bg-zinc-900/40 font-mono text-zinc-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-zinc-500 uppercase">
                  Bcc
                </label>
                <Input
                  value={formData.bcc}
                  onChange={(e) =>
                    setFormData({ ...formData, bcc: e.target.value })
                  }
                  placeholder="blindcc@domain.com"
                  className="w-full border-zinc-800 bg-zinc-900/40 font-mono text-zinc-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                Subject
              </label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Enter subject header"
                className="w-full border-zinc-800 bg-zinc-900/40 text-zinc-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                HTML Message Body
              </label>
              <textarea
                value={formData.html}
                onChange={(e) =>
                  setFormData({ ...formData, html: e.target.value })
                }
                placeholder="Write body content here (HTML supported)..."
                rows={8}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 text-zinc-300 focus:ring-1 focus:ring-zinc-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDraft}
                  className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/20 px-3.5 py-1.5 text-zinc-400 transition-all hover:text-zinc-200"
                >
                  Save Draft
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="border-zinc-850 text-zinc-450 hover:text-zinc-250 cursor-pointer rounded-lg border px-3 py-1.5 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSending}
                  onClick={handleSendDraft}
                  className="bg-zinc-105 hover:bg-zinc-205 flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-1.5 font-semibold text-zinc-950 transition-all"
                >
                  {isSending ? "Sending..." : "Send Email"}
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
