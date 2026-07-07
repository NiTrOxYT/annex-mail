"use client";

import React, { createContext, useContext, useState } from "react";
import { Conversation } from "./workspace-shell";

interface WorkspaceContextType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  selectedConv: Conversation | null;
  setSelectedConv: React.Dispatch<React.SetStateAction<Conversation | null>>;
  activeLabel: string;
  setActiveLabel: (label: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  conversationCache: Record<string, Conversation>;
  setConversationCache: React.Dispatch<
    React.SetStateAction<Record<string, Conversation>>
  >;
  replyBody: string;
  setReplyBody: (body: string) => void;
  mailboxScrollPositions: Record<string, number>;
  setMailboxScrollPositions: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  mailboxDrawerOpen: boolean;
  setMailboxDrawerOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>("INBOX");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [conversationCache, setConversationCache] = useState<
    Record<string, Conversation>
  >({});
  const [replyBody, setReplyBody] = useState<string>("");
  const [mailboxScrollPositions, setMailboxScrollPositions] = useState<
    Record<string, number>
  >({});
  const [mailboxDrawerOpen, setMailboxDrawerOpen] = useState(false);

  return (
    <WorkspaceContext.Provider
      value={{
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
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
