import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getArtistBySlug,
  getArtistRoles,
  getArtistTopRagas,
  getArtistCollaborators,
} from "@/lib/data/artists";
import { EntityLink } from "@/app/components/entity-link";
import { ArtistTabs } from "./artist-tabs";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ role?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: "Artist not found — Alaap" };
  return { title: `${artist.name} — Alaap` };
}

export default async function ArtistPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { role: activeRole, page: pageParam } = await searchParams;

  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  const [roles, topRagas, collaborators] = await Promise.all([
    getArtistRoles(slug),
    getArtistTopRagas(slug),
    getArtistCollaborators(slug),
  ]);

  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold tracking-tight">{artist.name}</h1>
      {artist.nameDevanagari && (
        <p className="mt-1 text-lg text-stone-500">
          {artist.nameDevanagari}
        </p>
      )}
      {(artist.birthYear || artist.deathYear) && (
        <p className="mt-1 text-sm text-stone-500">
          {artist.birthYear}
          {artist.deathYear ? ` – ${artist.deathYear}` : ""}
        </p>
      )}

      {artist.bio && (
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          {artist.bio}
        </p>
      )}

      {/* Signature ragas */}
      {topRagas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Signature ragas
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {topRagas.map((r) => (
              <span key={r.slug} className="inline-flex items-center gap-1">
                <EntityLink type="raga" slug={r.slug} name={r.name} />
                <span className="text-xs text-stone-400">
                  ({r.songCount})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Top collaborators
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {collaborators.map((c) => (
              <span key={c.slug} className="inline-flex items-center gap-1">
                <EntityLink type="artist" slug={c.slug} name={c.name} />
                <span className="text-xs text-stone-400">
                  ({c.sharedSongs})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Song tabs by role */}
      {roles.length > 0 && (
        <div className="mt-8">
          <ArtistTabs
            artistSlug={slug}
            roles={roles}
            activeRole={activeRole}
            page={page}
          />
        </div>
      )}
    </div>
  );
}
