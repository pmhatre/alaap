interface SpotifyEmbedProps {
  trackId: string;
  title?: string;
}

export function SpotifyEmbed({ trackId, title }: SpotifyEmbedProps) {
  return (
    <div className="overflow-hidden rounded-lg">
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?theme=0`}
        title={title ?? "Spotify player"}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        width="100%"
        height="152"
        className="border-0"
      />
    </div>
  );
}
