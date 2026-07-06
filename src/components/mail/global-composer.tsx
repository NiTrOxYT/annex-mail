"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  ChevronDown,
  ChevronUp,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichEditor } from "./rich-editor";

export interface AttachmentFile {
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  content: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  html: string;
}

interface GlobalComposerProps {
  onClose: () => void;
  onSent?: () => void;
  defaultTo?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  defaultDraftId?: string;
}

export function GlobalComposer({
  onClose,
  onSent,
  defaultTo = [],
  defaultSubject = "",
  defaultBody = "",
  defaultDraftId,
}: GlobalComposerProps) {
  const [to, setTo] = useState(defaultTo.join(", "));
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(defaultDraftId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const composerRef = useRef<HTMLDivElement>(null);

  // Auto-save every 5s
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const saveDraft = useCallback(async () => {
    const toList = to
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const ccList = cc
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const bccList = bcc
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    try {
      if (draftId) {
        await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject,
            html: body,
          }),
        });
      } else {
        const res = await fetch("/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject,
            html: body,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            success: boolean;
            data: { id: string };
          };
          if (data.success) setDraftId(data.data.id);
        }
      }
      setLastSaved(new Date());
    } catch {
      // silent autosave failure
    }
  }, [to, cc, bcc, subject, body, draftId]);

  // Declared before useEffect so the keyboard shortcut effect can reference it
  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      showToast("Please enter at least one recipient.");
      return;
    }
    setIsSending(true);
    try {
      const toList = to
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const ccList = cc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const bccList = bcc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: toList,
          cc: ccList.length > 0 ? ccList : undefined,
          bcc: bccList.length > 0 ? bccList : undefined,
          subject,
          html: body,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (!res.ok) {
        // API shape: { success: false, error: { code: string, message: string } }
        // or fallback plain { message: string } or { error: string }
        const errData = (await res.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string } | string;
          message?: string;
        };
        console.error("[Composer] Send failed — full response body:", errData);

        const extracted =
          (typeof errData.error === "object"
            ? errData.error?.message
            : errData.error) ??
          errData.message ??
          `HTTP ${res.status}`;

        throw new Error(extracted);
      }

      if (draftId) {
        await fetch(`/api/drafts/${draftId}`, { method: "DELETE" }).catch(
          () => {},
        );
      }

      showToast("Email sent successfully.");
      onSent?.();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      showToast(
        `Send failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsSending(false);
    }
  }, [to, cc, bcc, subject, body, attachments, draftId, onSent, onClose]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      saveDraft();
    }, 5000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [saveDraft]);

  // Load templates
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = (await res.json()) as {
            success: boolean;
            data: Template[];
          };
          if (data.success) setTemplates(data.data);
        }
      } catch {
        // silent
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts — depends on handleSend and isFullscreen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setIsMinimized(true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSend, isFullscreen]);

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: dragStart.current.px + (me.clientX - dragStart.current.mx),
        y: dragStart.current.py + (me.clientY - dragStart.current.my),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAtts: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        showToast(`${file.name} exceeds 10 MB limit.`);
        continue;
      }
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      newAtts.push({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        storagePath: `temp/${Date.now()}_${file.name}`,
        content: base64,
      });
    }
    setAttachments((prev) => [...prev, ...newAtts]);
  };

  const applyTemplate = (tpl: Template) => {
    setSubject(tpl.subject);
    setBody(tpl.html);
    setShowTemplates(false);
  };

  const handleDiscard = useCallback(async () => {
    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    if (draftId) {
      await fetch(`/api/drafts/${draftId}`, { method: "DELETE" }).catch(
        () => {},
      );
    }
    onClose();
  }, [draftId, onClose]);

  const sizeClass = isFullscreen
    ? "fixed inset-0 z-50 w-full h-full rounded-none"
    : isMinimized
      ? "fixed bottom-4 right-4 z-50 w-80 shadow-2xl"
      : "fixed bottom-4 right-4 z-50 w-[640px] max-w-[96vw] shadow-2xl";

  return (
    <>
      {/* Backdrop for fullscreen */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        />
      )}

      <div
        ref={composerRef}
        style={
          isFullscreen
            ? {}
            : {
                bottom: 16,
                right: 16,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }
        }
        className={`${sizeClass} flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 transition-none`}
      >
        {/* Header — draggable */}
        <div
          onMouseDown={onMouseDown}
          className={`flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5 ${!isFullscreen ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold tracking-tight text-zinc-200">
              New Message
            </span>
            {lastSaved && !isMinimized && (
              <span className="font-mono text-[9px] text-zinc-600">
                Auto-saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              title={isMinimized ? "Restore" : "Minimize (Esc)"}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleDiscard}
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-red-900/40 hover:text-red-400"
              title="Discard & close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body — hidden when minimized */}
        {!isMinimized && (
          <>
            {/* Header fields */}
            <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-950">
              {/* From */}
              <div className="flex items-center gap-3 border-b border-zinc-900/60 px-4 py-2">
                <span className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-zinc-600 uppercase">
                  From
                </span>
                <span className="text-xs text-zinc-400">
                  Annex &lt;business@annex-consultancy.com&gt;
                </span>
              </div>

              {/* To */}
              <div className="flex items-center gap-3 border-b border-zinc-900/60 px-4 py-2">
                <span className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-zinc-600 uppercase">
                  To
                </span>
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients, separated by commas"
                  className="h-5 flex-1 border-0 bg-transparent p-0 text-xs text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-0"
                />
                <button
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="flex items-center gap-1 font-mono text-[10px] text-zinc-600 transition-colors hover:text-zinc-400"
                >
                  {showCcBcc ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Cc/Bcc
                </button>
              </div>

              {/* Cc / Bcc */}
              {showCcBcc && (
                <>
                  <div className="flex items-center gap-3 border-b border-zinc-900/60 px-4 py-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-zinc-600 uppercase">
                      Cc
                    </span>
                    <Input
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="Carbon copy"
                      className="h-5 flex-1 border-0 bg-transparent p-0 text-xs text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-0"
                    />
                  </div>
                  <div className="flex items-center gap-3 border-b border-zinc-900/60 px-4 py-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-zinc-600 uppercase">
                      Bcc
                    </span>
                    <Input
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="Blind carbon copy"
                      className="h-5 flex-1 border-0 bg-transparent p-0 text-xs text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-0"
                    />
                  </div>
                </>
              )}

              {/* Subject */}
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="w-14 shrink-0 font-mono text-[10px] tracking-wider text-zinc-600 uppercase">
                  Subject
                </span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="h-5 flex-1 border-0 bg-transparent p-0 text-xs font-medium text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Editor body */}
            <div
              className={`flex-1 overflow-y-auto bg-zinc-950 ${isFullscreen ? "min-h-0" : ""}`}
            >
              <RichEditor content={body} onChange={setBody} />
            </div>

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="flex shrink-0 flex-wrap gap-2 border-t border-zinc-800/60 bg-zinc-950 px-4 py-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-300"
                  >
                    <Paperclip className="h-3 w-3 text-zinc-500" />
                    <span className="max-w-[120px] truncate">
                      {att.filename}
                    </span>
                    <span className="text-zinc-600">
                      ({Math.round(att.size / 1024)} KB)
                    </span>
                    <button
                      onClick={() =>
                        setAttachments((p) => p.filter((_, i) => i !== idx))
                      }
                      className="text-zinc-600 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer toolbar */}
            <div className="flex shrink-0 items-center justify-between border-t border-zinc-800/60 bg-zinc-900/20 px-4 py-3">
              <div className="flex items-center gap-2">
                {/* Send */}
                <Button
                  onClick={handleSend}
                  disabled={isSending}
                  className="h-8 cursor-pointer rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.97] disabled:opacity-50"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {isSending ? "Sending…" : "Send"}
                </Button>
                <span className="font-mono text-[9px] text-zinc-700">⌘↵</span>

                {/* Attach */}
                <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200">
                  <Paperclip className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Templates */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                    title="Templates"
                  >
                    <Layout className="h-3.5 w-3.5" />
                  </button>
                  {showTemplates && templates.length > 0 && (
                    <div className="absolute bottom-10 left-0 z-50 min-w-[200px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
                      <div className="border-b border-zinc-800 px-3 py-2">
                        <span className="font-mono text-[9px] tracking-wider text-zinc-600 uppercase">
                          Templates
                        </span>
                      </div>
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => applyTemplate(tpl)}
                          className="flex w-full items-center px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          {tpl.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-zinc-700">
                  Esc to minimize
                </span>
              </div>
            </div>
          </>
        )}

        {/* Minimized pill — click to expand */}
        {isMinimized && (
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full py-2 text-center font-mono text-[10px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            New Message — click to expand
          </button>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-200 shadow-xl">
          {toastMsg}
        </div>
      )}
    </>
  );
}
