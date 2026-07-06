export const metadata = {
  title: "Templates - Annex Mail",
};

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Templates
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Save and inject reusable text patterns.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
        Template editor and injection controls belong to Phase 2.
      </div>
    </div>
  );
}
