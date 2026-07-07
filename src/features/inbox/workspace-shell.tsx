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
  ArrowLeft,
  Menu,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  RefreshCw,
  Download,
} from "lucide-react";
import { RichEditor } from "@/components/mail/rich-editor";
import { useWorkspace } from "./workspace-context";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

export type Message = {
  id: string;
  sender: string;
  recipients: string[];
  cc: string[];
  subject: string;
  snippet: string;
  htmlBody: string;
  textBody?: string;
  isRead: boolean;
  isStarred: boolean;
  internalDate: string;
  direction: "INBOUND" | "OUTBOUND";
  attachments: Attachment[];
  labels: { label: Label }[];
};

export type Conversation = {
  id: string;
  subject: string;
  lastMessageAt: string;
  messages: Message[];
  status: "OPEN" | "PENDING" | "ARCHIVED";
};

// Swipable touch card for mobile
const ConversationCard = React.memo(
  ({
    conv,
    active,
    onSelect,
    onToggleRead,
    onArchive,
  }: {
    conv: Conversation;
    active: boolean;
    onSelect: (c: Conversation) => void;
    onToggleRead: (c: Conversation, read: boolean) => void;
    onArchive: (c: Conversation) => void;
  }) => {
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
      setStartX(e.touches[0].clientX);
      setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isSwiping) return;
      const diff = e.touches[0].clientX - startX;
      // Allow dragging up to 140px in either direction
      if (Math.abs(diff) < 140) {
        setCurrentX(diff);
      }
    };

    const handleTouchEnd = () => {
      setIsSwiping(false);
      if (currentX > 80) {
        const hasUnread = conv.messages.some((m) => !m.isRead);
        onToggleRead(conv, !hasUnread);
      } else if (currentX < -80) {
        onArchive(conv);
      }
      setCurrentX(0);
    };

    const lastMsg = conv.messages[conv.messages.length - 1];
    const hasUnread = conv.messages.some((m) => !m.isRead);

    return (
      <div className="relative min-h-[48px] overflow-hidden border-b border-zinc-900/60 bg-zinc-950 select-none">
        {/* Background Indicators */}
        <div className="absolute inset-0 flex items-center justify-between bg-zinc-900/30 px-6">
          <div
            className={`flex items-center gap-2 text-xs font-semibold text-emerald-400 ${currentX > 30 ? "opacity-100" : "opacity-0 transition-opacity duration-150"}`}
          >
            <Mail className="h-4 w-4" />
            Mark {hasUnread ? "Read" : "Unread"}
          </div>
          <div
            className={`flex items-center gap-2 text-xs font-semibold text-red-400 ${currentX < -30 ? "opacity-100" : "opacity-0 transition-opacity duration-150"}`}
          >
            <Archive className="h-4 w-4" />
            Archive
          </div>
        </div>

        {/* Foreground Container */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${currentX}px)`,
            transition: isSwiping ? "none" : "transform 200ms ease-out",
          }}
          onClick={() => {
            if (Math.abs(currentX) < 10) {
              onSelect(conv);
            }
          }}
          className={`relative z-10 flex cursor-pointer flex-col gap-1.5 bg-zinc-950 p-3.5 transition-all ${
            active ? "bg-zinc-800/30" : "hover:bg-zinc-900/30"
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
                hasUnread ? "font-semibold text-zinc-200" : "text-zinc-400"
              }`}
            >
              {conv.subject}
            </span>
          </div>
          <p className="line-clamp-2 text-[10px] text-zinc-500">
            {lastMsg?.snippet || "No preview available"}
          </p>
        </div>
      </div>
    );
  },
);
ConversationCard.displayName = "ConversationCard";

export function WorkspaceShell() {
  const {
    conversations,
    setConversations,
    selectedConv,
    setSelectedConv,
    activeLabel,
    setActiveLabel,
    searchQuery,
    setSearchQuery,
    conversationCache,
    setConversationCache,
    replyBody,
    setReplyBody,
    mailboxScrollPositions,
    setMailboxScrollPositions,
    mailboxDrawerOpen,
    setMailboxDrawerOpen,
  } = useWorkspace();

  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);

  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});

  const toggleMessageExpand = (msgId: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Column width sizes
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [listWidth, setListWidth] = useState(340);
  const [inspectorWidth, setInspectorWidth] = useState(260);

  // Touch and gestures
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listTouchStartY = React.useRef(0);

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
          const items = body.data.items;
          setConversations(items);
          setSelectedConv((prev) => {
            if (!prev) return null;
            const updated = items.find((c: Conversation) => c.id === prev.id);
            if (!updated) return prev;
            const lastMsg = updated.messages[updated.messages.length - 1];
            if (lastMsg) {
              setExpandedMessages((curr) => {
                if (Object.keys(curr).length === 0) {
                  return { [lastMsg.id]: true };
                }
                return curr;
              });
            }
            return {
              ...updated,
              messages: updated.messages.map((newMsg) => {
                const existingMsg = prev.messages.find(
                  (m) => m.id === newMsg.id,
                );
                return {
                  ...newMsg,
                  htmlBody: existingMsg?.htmlBody ?? newMsg.htmlBody,
                  textBody: existingMsg?.textBody ?? newMsg.textBody,
                  attachments: existingMsg?.attachments ?? newMsg.attachments,
                };
              }),
            };
          });
        }
      }
    } catch (err) {
      console.error("Error loading conversations", err);
    } finally {
      setIsListLoading(false);
    }
  }, [activeLabel, searchQuery, setConversations, setSelectedConv]);

  const selectConversation = async (conv: Conversation) => {
    const cached = conversationCache[conv.id];
    const targetConv = cached || conv;
    setSelectedConv(targetConv);
    setReplyBody("");

    const lastMsg = targetConv.messages[targetConv.messages.length - 1];
    if (lastMsg) {
      setExpandedMessages({ [lastMsg.id]: true });
    }

    conv.messages.forEach((m) => {
      if (!m.isRead) markAsRead(m.id);
    });

    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const fullConv = body.data;
          setConversationCache((prev) => ({
            ...prev,
            [conv.id]: fullConv,
          }));
          setSelectedConv((current) => {
            if (current?.id === conv.id) {
              return fullConv;
            }
            return current;
          });
        }
      }
    } catch (err) {
      console.error("Failed to load conversation details", err);
    }
  };

  // Prefetch next likely thread when idle
  useEffect(() => {
    if (conversations.length === 0) return;

    let nextConv: Conversation | null = null;
    if (selectedConv) {
      const idx = conversations.findIndex((c) => c.id === selectedConv.id);
      if (idx !== -1 && idx < conversations.length - 1) {
        nextConv = conversations[idx + 1];
      }
    } else {
      nextConv = conversations[0];
    }

    if (!nextConv || conversationCache[nextConv.id]) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations/${nextConv!.id}`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const fullConv = body.data;
            setConversationCache((prev) => ({
              ...prev,
              [nextConv!.id]: fullConv,
            }));
          }
        }
      } catch (err) {
        console.error("Prefetch failed", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [selectedConv, conversations, conversationCache, setConversationCache]);

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

  // Scroll positions preservation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = mailboxScrollPositions[activeLabel] || 0;
    }
  }, [activeLabel, mailboxScrollPositions]);

  const handleScroll = () => {
    if (scrollRef.current) {
      setMailboxScrollPositions((prev) => ({
        ...prev,
        [activeLabel]: scrollRef.current!.scrollTop,
      }));
    }
  };

  // Touch handlers for root (mailbox drawer edge-swipe)
  const handleTouchStartRoot = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    if (x < 40) {
      touchStartX.current = x;
    }
  };

  const handleTouchMoveRoot = (e: React.TouchEvent) => {
    if (touchStartX.current > 0) {
      const diff = e.touches[0].clientX - touchStartX.current;
      if (diff > 85) {
        setMailboxDrawerOpen(true);
        touchStartX.current = 0;
      }
    }
  };

  const handleTouchEndRoot = () => {
    touchStartX.current = 0;
  };

  // Touch handlers for Pull to Refresh
  const handleListTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      listTouchStartY.current = e.touches[0].clientY;
    }
  };

  const handleListTouchMove = (e: React.TouchEvent) => {
    if (listTouchStartY.current > 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - listTouchStartY.current;
      if (diff > 0) {
        setPullDistance(Math.min(80, diff));
      }
    }
  };

  const handleListTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(40);
      await fetchConversations();
      setPullDistance(0);
      setIsRefreshing(false);
    } else {
      setPullDistance(0);
    }
    listTouchStartY.current = 0;
  };

  const markAsRead = React.useCallback(
    async (messageId: string) => {
      setConversations((prevList) =>
        prevList.map((conv) => ({
          ...conv,
          messages: conv.messages.map((m) =>
            m.id === messageId ? { ...m, isRead: true } : m,
          ),
        })),
      );
      setSelectedConv((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === messageId ? { ...m, isRead: true } : m,
          ),
        };
      });

      await fetch("/api/messages/read", {
        method: "POST",
        body: JSON.stringify({ messageId }),
        headers: { "Content-Type": "application/json" },
      });
      fetchConversations();
    },
    [fetchConversations, setConversations, setSelectedConv],
  );

  const handleToggleRead = React.useCallback(
    async (conv: Conversation, read: boolean) => {
      setConversations((prevList) =>
        prevList.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                messages: c.messages.map((m) => ({ ...m, isRead: read })),
              }
            : c,
        ),
      );
      setSelectedConv((prev) => {
        if (!prev || prev.id !== conv.id) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => ({ ...m, isRead: read })),
        };
      });

      const promises = conv.messages
        .filter((m) => m.isRead !== read)
        .map((m) =>
          fetch(`/api/messages/${read ? "read" : "unread"}`, {
            method: "POST",
            body: JSON.stringify({ messageId: m.id }),
            headers: { "Content-Type": "application/json" },
          }),
        );
      await Promise.all(promises);
      fetchConversations();
    },
    [fetchConversations, setConversations, setSelectedConv],
  );

  const toggleStar = React.useCallback(
    async (messageId: string, currentStarred: boolean) => {
      const nextStarred = !currentStarred;
      setConversations((prevList) =>
        prevList.map((conv) => ({
          ...conv,
          messages: conv.messages.map((m) =>
            m.id === messageId ? { ...m, isStarred: nextStarred } : m,
          ),
        })),
      );
      setSelectedConv((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === messageId ? { ...m, isStarred: nextStarred } : m,
          ),
        };
      });

      await fetch("/api/messages/star", {
        method: "POST",
        body: JSON.stringify({ messageId, starred: nextStarred }),
        headers: { "Content-Type": "application/json" },
      });
      fetchConversations();
    },
    [fetchConversations, setConversations, setSelectedConv],
  );

  const archiveThread = React.useCallback(
    async (conversationId: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setSelectedConv(null);

      await fetch("/api/messages/archive", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
        headers: { "Content-Type": "application/json" },
      });
      fetchConversations();
    },
    [fetchConversations, setConversations, setSelectedConv],
  );

  const deleteThread = React.useCallback(
    async (conversationId: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setSelectedConv(null);

      await fetch("/api/messages/trash", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
        headers: { "Content-Type": "application/json" },
      });
      fetchConversations();
    },
    [fetchConversations, setConversations, setSelectedConv],
  );

  const handleSendReply = React.useCallback(async () => {
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
        setConversationCache((prev) => {
          const next = { ...prev };
          delete next[selectedConv.id];
          return next;
        });

        const detailRes = await fetch(`/api/conversations/${selectedConv.id}`);
        if (detailRes.ok) {
          const detailBody = await detailRes.json();
          if (detailBody.success && detailBody.data) {
            setConversationCache((prev) => ({
              ...prev,
              [selectedConv.id]: detailBody.data,
            }));
            setSelectedConv(detailBody.data);
          }
        }
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedConv,
    replyBody,
    setReplyBody,
    setConversationCache,
    setSelectedConv,
    fetchConversations,
  ]);

  const startDrag = (
    e: React.MouseEvent,
    type: "sidebar" | "list" | "inspector",
  ) => {
    e.preventDefault();
    const startXVal = e.clientX;
    const startWidth =
      type === "sidebar"
        ? sidebarWidth
        : type === "list"
          ? listWidth
          : inspectorWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXVal;
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

  const renderMailboxesList = () => (
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
            onClick={() => {
              setActiveLabel(item.id);
              setMailboxDrawerOpen(false);
            }}
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
  );

  return (
    <div
      onTouchStart={handleTouchStartRoot}
      onTouchMove={handleTouchMoveRoot}
      onTouchEnd={handleTouchEndRoot}
      className="flex h-full w-full overflow-hidden rounded-none border-0 border-zinc-800 bg-zinc-950/20 backdrop-blur-md md:h-[calc(100vh-4rem)] md:rounded-xl md:border"
    >
      {/* 1. Sidebar Column (Desktop Only) */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="hidden min-w-[160px] flex-col border-r border-zinc-800/80 bg-zinc-900/10 p-4 select-none md:flex"
      >
        {renderMailboxesList()}
      </div>

      {/* Mobile Drawer (Slide over) */}
      <Dialog open={mailboxDrawerOpen} onOpenChange={setMailboxDrawerOpen}>
        <DialogContent
          showCloseButton={false}
          className="animate-in slide-in-from-left fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[85vw] max-w-[320px] translate-x-0 translate-y-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg duration-200"
        >
          <DialogTitle className="sr-only">Mailboxes Selection</DialogTitle>
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Mailboxes
            </span>
            <button
              onClick={() => setMailboxDrawerOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          {renderMailboxesList()}
        </DialogContent>
      </Dialog>

      {/* Resize Handle 1 */}
      <div
        className="hidden w-1 cursor-col-resize bg-zinc-800/20 transition-all hover:bg-zinc-700 md:block"
        onMouseDown={(e) => startDrag(e, "sidebar")}
      />

      {/* 2. Conversations List Column */}
      <div
        style={{
          width:
            typeof window !== "undefined" && window.innerWidth >= 768
              ? `${listWidth}px`
              : "100%",
        }}
        className={`${selectedConv ? "hidden md:flex" : "flex w-full"} relative flex-col border-r border-zinc-800/80 bg-zinc-950/40 pt-[env(safe-area-inset-top)] md:w-auto md:min-w-[280px]`}
      >
        {/* Pull to refresh spinner */}
        {pullDistance > 0 && (
          <div
            style={{ height: `${pullDistance}px` }}
            className="border-zinc-850/60 flex items-center justify-center overflow-hidden border-b bg-zinc-900/40 transition-all duration-75"
          >
            <RefreshCw
              className={`h-4 w-4 text-zinc-400 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-zinc-800/60 p-3">
          <button
            onClick={() => setMailboxDrawerOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 md:hidden"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
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

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={handleListTouchStart}
          onTouchMove={handleListTouchMove}
          onTouchEnd={handleListTouchEnd}
          className="flex-1 divide-y divide-zinc-900/60 overflow-y-auto"
        >
          {isListLoading ? (
            <div className="p-4">
              <ListSkeleton />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Mail}
                title="No Conversations Found"
                description="This mailbox folder is currently empty. Incoming organization emails will sync automatically."
              />
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationCard
                key={conv.id}
                conv={conv}
                active={selectedConv?.id === conv.id}
                onSelect={selectConversation}
                onToggleRead={handleToggleRead}
                onArchive={(c) => archiveThread(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Resize Handle 2 */}
      <div
        className="hidden w-1 cursor-col-resize bg-zinc-800/20 transition-all hover:bg-zinc-700 md:block"
        onMouseDown={(e) => startDrag(e, "list")}
      />

      {/* 3. Detail TIMELINE Column */}
      <div
        className={`${selectedConv ? "flex w-full" : "hidden"} flex-col overflow-hidden bg-zinc-950/20 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:flex md:flex-1`}
      >
        {selectedConv ? (
          <>
            {/* Desktop Toolbar */}
            <div className="hidden items-center justify-between border-b border-zinc-800/80 bg-zinc-900/10 p-3 md:flex">
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

            {/* Mobile Toolbar & Sticky Header */}
            <div className="sticky top-0 z-20 flex shrink-0 flex-col gap-2 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 md:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs text-zinc-300">
                    {selectedConv.messages[0]?.sender[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200">
                      {selectedConv.messages[0]?.sender || "Sender"}
                    </p>
                    <p className="truncate text-[10px] text-zinc-500">
                      {selectedConv.messages.length} messages
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center gap-1">
                  <button
                    onClick={() => archiveThread(selectedConv.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    title="Archive"
                  >
                    <Archive className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => deleteThread(selectedConv.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    title="Delete"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    title="More actions"
                  >
                    <MoreVertical className="h-4.5 w-4.5" />
                  </button>
                  {mobileMoreOpen && (
                    <div className="animate-in fade-in zoom-in-95 absolute top-11 right-0 z-50 min-w-[150px] rounded-lg border border-zinc-800 bg-zinc-950 p-1 shadow-xl duration-100">
                      <button
                        onClick={() => {
                          setMobileMoreOpen(false);
                          const el = document.querySelector(".ProseMirror");
                          if (el instanceof HTMLElement) el.focus();
                        }}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        Reply
                      </button>
                      <button
                        onClick={() => {
                          setMobileMoreOpen(false);
                          const el = document.querySelector(".ProseMirror");
                          if (el instanceof HTMLElement) el.focus();
                        }}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                      >
                        <ReplyAll className="h-3.5 w-3.5" />
                        Reply All
                      </button>
                      <button
                        onClick={() => {
                          setMobileMoreOpen(false);
                          alert(
                            "Forward feature is integrated in standard compose.",
                          );
                        }}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                      >
                        <Forward className="h-3.5 w-3.5" />
                        Forward
                      </button>
                      <button
                        onClick={() => {
                          setMobileMoreOpen(false);
                          const firstMsg = selectedConv.messages[0];
                          if (firstMsg)
                            toggleStar(firstMsg.id, firstMsg.isStarred);
                        }}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                      >
                        <Star className="h-3.5 w-3.5 text-zinc-500" />
                        Star Thread
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="truncate px-1 text-[11px] font-medium text-zinc-400">
                Sub: {selectedConv.subject}
              </div>
            </div>

            {/* Conversation Messages Timeline */}
            <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
              <h2 className="mb-6 hidden text-sm font-semibold tracking-tight text-zinc-200 md:block">
                {selectedConv.subject}
              </h2>

              <div className="space-y-3">
                {selectedConv.messages.map((msg) => {
                  const isExpanded = !!expandedMessages[msg.id];
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-xl border border-zinc-800/80 bg-zinc-950/20 p-4 transition-all duration-200 select-none ${
                        isExpanded
                          ? "bg-zinc-900/10 ring-1 ring-zinc-800"
                          : "cursor-pointer hover:bg-zinc-900/20"
                      }`}
                      onClick={() => {
                        if (!isExpanded) toggleMessageExpand(msg.id);
                      }}
                    >
                      {/* Header block */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div
                          className="flex min-w-0 flex-1 items-start gap-3"
                          onClick={(e) => {
                            if (isExpanded) {
                              e.stopPropagation();
                              toggleMessageExpand(msg.id);
                            }
                          }}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-mono text-[10px] text-zinc-400">
                            {msg.sender[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-zinc-300">
                              {msg.sender}
                            </p>
                            {isExpanded ? (
                              <p className="mt-0.5 truncate text-[9px] text-zinc-500">
                                To: {msg.recipients.join(", ")}
                              </p>
                            ) : (
                              <p className="text-zinc-450 mt-0.5 max-w-sm truncate text-[10px] leading-relaxed sm:max-w-md md:max-w-lg">
                                {msg.snippet || "No preview"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="font-mono text-[9px] text-zinc-500">
                            {new Date(msg.internalDate).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(msg.id, msg.isStarred);
                            }}
                            className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1 hover:bg-zinc-800 ${
                              msg.isStarred
                                ? "text-amber-500"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Star className="h-3.5 w-3.5 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Content block: only shown if expanded */}
                      {isExpanded && (
                        <div className="animate-in fade-in mt-4 duration-150">
                          {/* Email Html Body Render */}
                          {msg.htmlBody || msg.textBody ? (
                            <div
                              className="prose prose-invert max-w-none overflow-x-auto text-[13px] leading-relaxed break-words text-zinc-300"
                              dangerouslySetInnerHTML={{
                                __html:
                                  msg.htmlBody || `<p>${msg.textBody}</p>`,
                              }}
                            />
                          ) : (
                            <div className="animate-pulse space-y-2.5">
                              <div className="h-3 w-full rounded bg-zinc-800/60" />
                              <div className="h-3 w-11/12 rounded bg-zinc-800/60" />
                              <div className="h-3 w-4/5 rounded bg-zinc-800/60" />
                            </div>
                          )}

                          {/* Expandable Attachments card */}
                          {msg.attachments.length > 0 && (
                            <div className="mt-4 border-t border-zinc-800/40 pt-3">
                              <p className="font-mono text-[9px] text-zinc-500">
                                Attachments ({msg.attachments.length})
                              </p>
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {msg.attachments.map((att) => (
                                  <div
                                    key={att.id}
                                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 p-2 text-xs"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Paperclip className="h-3 w-3 shrink-0 text-zinc-500" />
                                      <span className="text-zinc-350 truncate font-mono text-[10px]">
                                        {att.filename}
                                      </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className="font-mono text-[9px] text-zinc-500">
                                        {(att.size / 1024).toFixed(0)} KB
                                      </span>
                                      <a
                                        href={`/api/attachments/download?path=${encodeURIComponent(att.storagePath)}&filename=${encodeURIComponent(att.filename)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                        title="Download attachment file"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Download className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inline Quick Reply Composer */}
            <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-900/10 p-3 md:p-4">
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
                    className="flex min-h-[36px] items-center gap-2 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {isLoading ? "Sending..." : "Send Reply"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <EmptyState
              icon={Mail}
              title="Select a Conversation"
              description="Choose a conversation thread from the list on the left to read or reply to messages."
            />
          </div>
        )}
      </div>

      {/* Resize Handle 3 */}
      {selectedConv && showInspector && (
        <>
          <div
            className="hidden w-1 cursor-col-resize bg-zinc-800/20 transition-all hover:bg-zinc-700 md:block"
            onMouseDown={(e) => startDrag(e, "inspector")}
          />

          {/* 4. Inspector Panel Column (Desktop Only) */}
          <div
            style={{ width: `${inspectorWidth}px` }}
            className="hidden min-w-[200px] flex-col bg-zinc-900/10 p-4 md:flex"
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
