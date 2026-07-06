"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 font-sans text-zinc-50">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-7xl font-semibold text-zinc-800">500</p>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-zinc-100">
              Critical System Error
            </h2>
            <p className="text-sm text-zinc-500">
              A critical server-side exception was encountered.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
