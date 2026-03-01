import { EntityLink } from "./entity-link";
import type { RelatedRaga } from "@/lib/data/ragas";

interface RelatedRagasProps {
  ragas: RelatedRaga[];
}

export function RelatedRagas({ ragas }: RelatedRagasProps) {
  if (ragas.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold">Related Ragas</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ragas.map((raga) => (
          <div
            key={raga.slug}
            className="rounded-lg border border-stone-100 bg-stone-50 p-3"
          >
            <EntityLink type="raga" slug={raga.slug} name={raga.name} />
            <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500">
              <span>{raga.reason}</span>
              <span>
                {raga.songCount} {raga.songCount === 1 ? "song" : "songs"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
