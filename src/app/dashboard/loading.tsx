import React from "react";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-8 font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 border-b border-zinc-800/40 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-zinc-800" />
          <div className="h-4 w-64 rounded bg-zinc-800/60" />
        </div>
        <div className="h-9 w-48 rounded bg-zinc-800" />
      </div>

      {/* Cards Skeleton Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/10 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-zinc-800" />
              <div className="h-4 w-4 rounded bg-zinc-800" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-12 rounded bg-zinc-800" />
              <div className="h-3.5 w-16 rounded bg-zinc-800/80" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Layout Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-2 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-6">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="h-4 w-12 rounded bg-zinc-800" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-zinc-900/40 py-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-16 rounded bg-zinc-800" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-48 rounded bg-zinc-800" />
                    <div className="h-3 w-24 rounded bg-zinc-800/60" />
                  </div>
                </div>
                <div className="h-3.5 w-12 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-6">
          <div className="h-4 w-32 rounded bg-zinc-800" />
          <div className="space-y-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-zinc-900/40 pb-2 last:border-0"
              >
                <div className="h-3.5 w-24 rounded bg-zinc-800" />
                <div className="h-3.5 w-16 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
