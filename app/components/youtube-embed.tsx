"use client";

import { useState } from "react";

interface YouTubeEmbedProps {
  youtubeId: string;
  title?: string;
}

export function YouTubeEmbed({ youtubeId, title }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          title={title ?? "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setLoaded(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-stone-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
        alt={title ?? "Video thumbnail"}
        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="ml-1 h-7 w-7"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
