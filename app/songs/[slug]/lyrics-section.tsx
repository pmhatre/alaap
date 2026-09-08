"use client";

import { useState } from "react";

/**
 * Only one source contributes the lyrics field (see pipeline/reconcile.py —
 * chandrakantha, wikipedia and carvaan all leave it null), so the credit is
 * resolved from the song's own sources array rather than hardcoded. Adding a
 * second lyrics source means adding it here, and songs already carrying it
 * get the right credit without touching the call site.
 */
const LYRICS_SOURCES: Record<string, { name: string; url: string }> = {
  bollywood_lyrics: {
    name: "the Bollywood Lyrics dataset",
    url: "https://github.com/hbdeshmukh/bollywood-lyrics",
  },
};

const SOURCES_DOC_URL = "https://github.com/pmhatre/alaap/blob/main/docs/SOURCES.md";

const LINK_CLASS = "text-maroon underline underline-offset-2 hover:text-maroon/80";

interface LyricsSectionProps {
  lyrics: string;
  sources?: string[];
}

export function LyricsSection({ lyrics, sources }: LyricsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const creditKey = sources?.find((source) => source in LYRICS_SOURCES);
  const credit = creditKey ? LYRICS_SOURCES[creditKey] : undefined;

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-semibold uppercase tracking-wide text-stone-400 hover:text-stone-600"
      >
        Lyrics {expanded ? "▾" : "▸"}
      </button>
      {expanded && (
        <>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-stone-50 p-4 font-sans text-sm leading-relaxed text-stone-700">
            {lyrics}
          </pre>
          <p className="mt-2 text-xs leading-relaxed text-stone-400">
            {credit && (
              <>
                Lyrics via{" "}
                <a href={credit.url} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                  {credit.name}
                </a>
                .{" "}
              </>
            )}
            The lyrics remain the property of their rights holders.{" "}
            <a href={SOURCES_DOC_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
              Full source attribution
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
