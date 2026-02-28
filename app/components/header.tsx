import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Alaap
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
          <Link href="/search" className="hover:text-neutral-900">
            Search
          </Link>
          <Link href="/ragas" className="hover:text-neutral-900">
            Ragas
          </Link>
          <Link href="/films" className="hover:text-neutral-900">
            Films
          </Link>
          <Link href="/artists" className="hover:text-neutral-900">
            Artists
          </Link>
        </nav>
      </div>
    </header>
  );
}
