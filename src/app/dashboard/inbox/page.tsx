export const metadata = {
  title: "Inbox - Annex Mail",
};

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Inbox
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Synchronized client communications from business@annex-consultancy.com
          (Gmail API).
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
        Inbox synchronization belongs to Phase 2.
      </div>
    </div>
  );
}
