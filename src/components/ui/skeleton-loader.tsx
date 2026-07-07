"use client";

import React from "react";

export function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 select-none">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-zinc-800/80" />
        <div className="bg-zinc-850 h-3.5 w-8 rounded" />
      </div>
      <div className="h-3.5 w-44 rounded bg-zinc-800/80" />
      <div className="mt-2 space-y-1.5">
        <div className="h-2.5 w-full rounded bg-zinc-800/40" />
        <div className="h-2.5 w-11/12 rounded bg-zinc-800/40" />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3 select-none">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/10 p-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="bg-zinc-850 h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-zinc-800" />
              <div className="h-2.5 w-5/6 rounded bg-zinc-800/60" />
            </div>
          </div>
          <div className="ml-4 h-3 w-12 shrink-0 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}
