import Link from "next/link";
import { getSongsByArtist } from "@/lib/data/songs";
import { SongCard } from "@/app/components/song-card";
import { Pagination } from "@/app/components/pagination";
import { EmptyState } from "@/app/components/empty-state";
import type { ArtistRole } from "@/lib/data/artists";

const roleLabels = {
  singer: "Songs Sung",
  composer: "Songs Composed",
  lyricist: "Songs Written",
} as const;

interface ArtistTabsProps {
  artistSlug: string;
  roles: ArtistRole[];
  activeRole?: string;
  page: number;
}

export async function ArtistTabs({
  artistSlug,
  roles,
  activeRole,
  page,
}: ArtistTabsProps) {
  // Default to first role if not specified or invalid
  const currentRole =
    roles.find((r) => r.role === activeRole)?.role ?? roles[0].role;

  const { songs, total } = await getSongsByArtist(
    artistSlug,
    currentRole,
    page,
  );

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 border-b border-neutral-200">
        {roles.map((r) => (
          <Link
            key={r.role}
            href={`/artists/${artistSlug}?role=${r.role}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              r.role === currentRole
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {roleLabels[r.role]} ({r.count})
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {songs.length > 0 ? (
          <>
            {songs.map((song) => (
              <SongCard key={song.slug} song={song} />
            ))}
            <Pagination
              currentPage={page}
              total={total}
              baseHref={`/artists/${artistSlug}`}
              searchParams={{ role: currentRole }}
            />
          </>
        ) : (
          <EmptyState message="No songs found." />
        )}
      </div>
    </div>
  );
}
