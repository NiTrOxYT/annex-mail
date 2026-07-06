export const metadata = {
  title: "Audit Logs - Annex Mail",
};

export default function LogsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Historical log of all modifications, accesses, and authentication
          routines.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
        Advanced audit logs history browser belongs to Phase 2.
      </div>
    </div>
  );
}
