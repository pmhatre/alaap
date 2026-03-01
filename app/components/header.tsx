import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-t-2 border-t-maroon border-b border-b-stone-200 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-xl font-bold tracking-tight text-maroon">
          Alaap
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-stone-600">
          <Link href="/search" className="hover:text-maroon">
            Search
          </Link>
          <Link href="/ragas" className="hover:text-maroon">
            Ragas
          </Link>
          <Link href="/films" className="hover:text-maroon">
            Films
          </Link>
          <Link href="/artists" className="hover:text-maroon">
            Artists
          </Link>
          <Link href="/charts" className="hover:text-maroon">
            Charts
          </Link>
        </nav>
      </div>
    </header>
  );
}
