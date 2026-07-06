export const metadata = {
  title: "Drafts - Annex Mail",
};

export default function DraftsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Drafts
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Work in progress responses and outbound drafts.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
        Drafting compose flows belongs to Phase 2.
      </div>
    </div>
  );
}
