"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Archive,
  Star,
  Trash2,
  Inbox,
  AlertCircle,
  Search,
  ChevronRight,
  Paperclip,
  PanelRightClose,
  PanelRight,
  CornerUpLeft,
  X,
} from "lucide-react";
import { RichEditor } from "@/components/mail/rich-editor";

type Label = {
  id: string;
  name: string;
  color: string;
};

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

type Message = {
  id: string;
  sender: string;
  recipients: string[];
  cc: string[];
  subject: string;
  snippet: string;
  htmlBody: string;
  isRead: boolean;
  isStarred: boolean;
  internalDate: string;
  direction: "INBOUND" | "OUTBOUND";
  attachments: Attachment[];
  labels: { label: Label }[];
};

type Conversation = {
  id: string;
  subject: string;
  lastMessageAt: string;
  messages: Message[];
  status: "OPEN" | "PENDING" | "ARCHIVED";
};

export function WorkspaceShell() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>("INBOX");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [replyBody, setReplyBody] = useState<string>("");

  // Column width sizes
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [listWidth, setListWidth] = useState(340);
  const [inspectorWidth, setInspectorWidth] = useState(260);

  const fetchConversations = React.useCallback(async () => {
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const labelParam = activeLabel ? `&label=${activeLabel}` : "";
      const res = await fetch(
        `/api/mailboxes/default/conversations?limit=50${labelParam}${q}`,
      );
      if (res.ok) {
        const body = (await res.json()) as {
          success: boolean;
          data?: { items: Conversation[] };
        };
        if (body.success && body.data) {
          setConversations(body.data.items);
          if (selectedConv) {
            const updated = body.data.items.find(
              (c: Conversation) => c.id === selectedConv.id,
            );
            if (updated) setSelectedConv(updated);
          }
        }
      }
    } catch (err) {
      console.error("Error loading conversations", err);
    }
  }, [activeLabel, searchQuery, selectedConv]);

  // Poll intervals
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations();
    }, 0);
    const interval = setInterval(fetchConversations, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchConversations]);

  const markAsRead = async (messageId: string) => {
    await fetch("/api/messages/read", {
      method: "POST",
      body: JSON.stringify({ messageId }),
      headers: { "Content-Type": "application/json" },
    });
    fetchConversations();
  };

  const toggleStar = async (messageId: string, currentStarred: boolean) => {
    await fetch("/api/messages/star", {
      method: "POST",
      body: JSON.stringify({ messageId, starred: !currentStarred }),
      headers: { "Content-Type": "application/json" },
    });
    fetchConversations();
  };

  const archiveThread = async (conversationId: string) => {
    await fetch("/api/messages/archive", {
      method: "POST",
      body: JSON.stringify({ conversationId }),
      headers: { "Content-Type": "application/json" },
    });
    setSelectedConv(null);
    fetchConversations();
  };

  const deleteThread = async (conversationId: string) => {
    await fetch("/api/messages/trash", {
      method: "POST",
      body: JSON.stringify({ conversationId }),
      headers: { "Content-Type": "application/json" },
    });
    setSelectedConv(null);
    fetchConversations();
  };

  const handleSendReply = async () => {
    if (!selectedConv || !replyBody.trim()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/mail/reply", {
        method: "POST",
        body: JSON.stringify({
          conversationId: selectedConv.id,
          body: replyBody,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setReplyBody("");
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag resizer mechanics
  const startDrag = (
    e: React.MouseEvent,
    type: "sidebar" | "list" | "inspector",
  ) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth =
      type === "sidebar"
        ? sidebarWidth
        : type === "list"
          ? listWidth
          : inspectorWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (type === "sidebar") {
        setSidebarWidth(Math.max(160, Math.min(300, startWidth + deltaX)));
      } else if (type === "list") {
        setListWidth(Math.max(280, Math.min(500, startWidth + deltaX)));
      } else {
        setInspectorWidth(Math.max(200, Math.min(450, startWidth - deltaX)));
      }
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/20 backdrop-blur-md">
      {/* 1. Sidebar Column */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="flex min-w-[160px] flex-col border-r border-zinc-800/80 bg-zinc-900/10 p-4 select-none"
      >
        <div className="space-y-1">
          <p className="px-2 font-mono text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
            Mailboxes
          </p>
          {[
            { id: "INBOX", name: "Inbox", icon: Inbox },
            { id: "SENT", name: "Sent", icon: Send },
            { id: "SPAM", name: "Spam", icon: AlertCircle },
            { id: "TRASH", name: "Trash", icon: Trash2 },
            { id: "ARCHIVED", name: "Archive", icon: Archive },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveLabel(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  activeLabel === item.id
                    ? "bg-zinc-800/60 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resize Handle 1 */}
      <div
        className="w-1 cursor-col-resize bg-zinc-800/20 transition-all hover:bg-zinc-700"
        onMouseDown={(e) => startDrag(e, "sidebar")}
      />

      {/* 2. Conversations List Column */}
      <div
        style={{ width: `${listWidth}px` }}
        className="flex min-w-[280px] flex-col border-r border-zinc-800/80 bg-zinc-950/40"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800/60 p-3">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/20 py-1.5 pr-3 pl-8 text-xs text-zinc-300 placeholder-zinc-500 focus:ring-1 focus:ring-zinc-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 divide-y divide-zinc-900/60 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No conversations found
            </div>
          ) : (
            conversations.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              const hasUnread = conv.messages.some((m) => !m.isRead);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConv(conv);
                    // Mark last messages as read
                    conv.messages.forEach((m) => {
                      if (!m.isRead) markAsRead(m.id);
                    });
                  }}
                  className={`flex cursor-pointer flex-col gap-1.5 p-3.5 transition-all ${
                    selectedConv?.id === conv.id
                      ? "bg-zinc-800/30"
                      : "hover:bg-zinc-900/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="max-w-[150px] truncate text-xs font-semibold text-zinc-300">
                      {lastMsg?.sender || "Unknown Sender"}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasUnread && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <span
                      className={`truncate text-xs ${
                        hasUnread
                          ? "font-semibold text-zinc-200"
                          : "text-zinc-400"
                      }`}
                    >
                      {conv.subject}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[10px] text-zinc-500">
                    {lastMsg?.snippet || "No preview available"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Resize Handle 2 */}
      <div
        className="w-1 cursor-col-resize bg-zinc-800/20 transition-all hover:bg-zinc-700"
        onMouseDown={(e) => startDrag(e, "list")}
      />

      {/* 3. Detail TIMELINE Column */}
      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950/20">
        {selectedConv ? (
          <>
            {/* Thread Header Toolbar */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/10 p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => archiveThread(selectedConv.id)}
                  className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                  title="Archive Thread"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteThread(selectedConv.id)}
                  className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                  title="Trash Thread"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setShowInspector(!showInspector)}
                className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
              >
                {showInspector ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Conversation Messages Timeline */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <h2 className="mb-6 text-sm font-semibold tracking-tight text-zinc-200">
                {selectedConv.subject}
              </h2>

              <div className="space-y-4">
                {selectedConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`border-zinc-850 rounded-xl border bg-zinc-900/10 p-4 transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 font-mono text-[10px] text-zinc-400">
                          {msg.sender[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-300">
                            {msg.sender}
                          </p>
                          <p className="mt-0.5 text-[9px] text-zinc-500">
                            To: {msg.recipients.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] text-zinc-500">
                          {new Date(msg.internalDate).toLocaleString()}
                        </span>
                        <button
                          onClick={() => toggleStar(msg.id, msg.isStarred)}
                          className={`rounded-md p-1 hover:bg-zinc-800 ${
                            msg.isStarred
                              ? "text-amber-500"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" />
                        </button>
                      </div>
                    </div>

                    {/* Email Html Body Render */}
                    <div
                      className="prose prose-invert mt-4 max-w-none text-xs leading-relaxed text-zinc-300"
                      dangerouslySetInnerHTML={{ __html: msg.htmlBody }}
                    />

                    {/* Expandable Attachments card */}
                    {msg.attachments.length > 0 && (
                      <div className="mt-4 border-t border-zinc-800/40 pt-3">
                        <p className="font-mono text-[9px] text-zinc-500">
                          Attachments ({msg.attachments.length})
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-2 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Paperclip className="h-3 w-3 shrink-0 text-zinc-500" />
                                <span className="truncate font-mono text-[10px] text-zinc-300">
                                  {att.filename}
                                </span>
                              </div>
                              <span className="ml-2 shrink-0 font-mono text-[9px] text-zinc-500">
                                {(att.size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Inline Quick Reply Composer */}
            <div className="border-t border-zinc-800/80 bg-zinc-900/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CornerUpLeft className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">
                  Reply to thread...
                </span>
              </div>
              <div className="border-zinc-850 overflow-hidden rounded-xl border bg-zinc-900/10">
                <RichEditor content={replyBody} onChange={setReplyBody} />
                <div className="border-zinc-850 flex items-center justify-end border-t bg-zinc-950/30 p-2">
                  <button
                    disabled={isLoading || !replyBody.trim()}
                    onClick={handleSendReply}
                    className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {isLoading ? "Sending..." : "Send Reply"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-xs text-zinc-500">
            <Mail className="mb-2 h-8 w-8 text-zinc-600" />
            Select a conversation thread to read
          </div>
        )}
      </div>

      {/* Resize Handle 3 */}
      {selectedConv && showInspector && (
        <>
          <div
            className="w-1 cursor-col-resize bg-zinc-800/20 transition-all hover:bg-zinc-700"
            onMouseDown={(e) => startDrag(e, "inspector")}
          />

          {/* 4. Inspector Panel Column */}
          <div
            style={{ width: `${inspectorWidth}px` }}
            className="flex min-w-[200px] flex-col bg-zinc-900/10 p-4"
          >
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800/60 pb-2">
              <p className="font-mono text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                Thread Metadata
              </p>
              <button
                onClick={() => setShowInspector(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-[10px] text-zinc-500">Subject</p>
                <p className="mt-0.5 font-medium text-zinc-300">
                  {selectedConv.subject}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500">Provider Connection</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Gmail synchronization
                </p>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500">Internal Note Tags</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[9px] text-zinc-400">
                    Annex Consultancy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
