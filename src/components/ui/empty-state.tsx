"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="animate-in fade-in flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center duration-200 select-none">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/40 text-zinc-400 shadow-inner">
        <Icon className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-zinc-200">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5 cursor-pointer rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.98]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
