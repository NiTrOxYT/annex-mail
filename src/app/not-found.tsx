import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-7xl font-semibold text-zinc-800">404</p>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-zinc-100">
            Page not found
          </h1>
          <p className="text-sm text-zinc-500">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
