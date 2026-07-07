import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center font-sans">
      <div className="mb-5 rounded-full border border-red-500/20 bg-red-950/30 p-4">
        <ShieldAlert className="h-10 w-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
        403 - Forbidden Access
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        You do not have the required permissions or membership parameters to
        access this secure operations module. Please contact your system Owner
        if this is an error.
      </p>
      <div className="mt-6">
        <Link href="/dashboard" passHref>
          <Button className="h-9 cursor-pointer rounded-lg bg-zinc-100 px-5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
