import Link from "next/link";
import { APP_VERSION } from "@/config/version";

export const metadata = {
  title: "Annex Mail — Shared Business Mailbox",
  description:
    "A production-grade shared mailbox platform for modern business teams. Collaborate on email, sync Gmail, and manage conversations together.",
};

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-zinc-50">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]"
      />

      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800/30 blur-[120px]"
      />

      <div className="relative z-10 flex max-w-xl flex-col items-center gap-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs font-medium text-zinc-400 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Production-grade shared mailbox
        </div>

        {/* Wordmark */}
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-50">
            Annex Mail
          </h1>
          <p className="text-base leading-relaxed text-zinc-400">
            A collaborative shared mailbox for business teams.
            <br />
            Sync Gmail, manage conversations, and never miss a reply.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-white focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
        >
          Sign In to Dashboard
          <span aria-hidden>→</span>
        </Link>

        {/* Feature list */}
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-left text-xs text-zinc-500">
          {[
            "Gmail sync via Pub/Sub",
            "Shared inbox for teams",
            "Send & reply via Brevo",
            "Conversation threading",
            "Provider-agnostic engine",
            "Role-based access",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <footer className="absolute right-0 bottom-6 left-0 flex items-center justify-center gap-4 text-[11px] text-zinc-600">
        <span>Annex Mail</span>
        <span>·</span>
        <span>v{APP_VERSION}</span>
        <span>·</span>
        <Link href="/login" className="transition-colors hover:text-zinc-400">
          Sign In
        </Link>
      </footer>
    </main>
  );
}
