import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6 font-sans text-zinc-300">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-zinc-800" />
          <div className="bg-zinc-850 h-4 w-72 rounded" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/10"
          >
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-zinc-800" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details logs skeleton */}
      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/10">
        <CardHeader>
          <div className="bg-zinc-850 h-5 w-36 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-16 rounded bg-zinc-800" />
              <div className="h-4 w-5/6 rounded bg-zinc-800/40" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
