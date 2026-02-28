"use client";

import { useState } from "react";

interface LyricsSectionProps {
  lyrics: string;
}

export function LyricsSection({ lyrics }: LyricsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600"
      >
        Lyrics {expanded ? "▾" : "▸"}
      </button>
      {expanded && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 font-sans text-sm leading-relaxed text-neutral-700">
          {lyrics}
        </pre>
      )}
    </div>
  );
}
