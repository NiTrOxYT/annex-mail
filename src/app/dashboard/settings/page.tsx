export const metadata = {
  title: "Settings - Annex Mail",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure email provider configurations, profile details, and
          signature fields.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
        Platform preferences and profile options belong to Phase 2.
      </div>
    </div>
  );
}
