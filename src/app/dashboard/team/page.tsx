export const metadata = {
  title: "Team Collaboration - Annex Mail",
};

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Team
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage organization members, seat allocations, and permission
          parameters.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
        Team invite and seat administration belongs to Phase 2.
      </div>
    </div>
  );
}
