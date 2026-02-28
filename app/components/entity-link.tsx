import Link from "next/link";

const typeConfig = {
  raga: { href: "/ragas", className: "bg-amber-50 text-amber-800 hover:bg-amber-100" },
  artist: { href: "/artists", className: "bg-blue-50 text-blue-800 hover:bg-blue-100" },
  film: { href: "/films", className: "bg-green-50 text-green-800 hover:bg-green-100" },
} as const;

interface EntityLinkProps {
  type: keyof typeof typeConfig;
  slug: string;
  name: string;
}

export function EntityLink({ type, slug, name }: EntityLinkProps) {
  const config = typeConfig[type];
  return (
    <Link
      href={`${config.href}/${slug}`}
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${config.className}`}
    >
      {name}
    </Link>
  );
}
