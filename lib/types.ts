// Graph entity types matching the Neo4j property graph model
// See docs/architecture.md for the full entity model

export interface Song {
  title: string;
  titleDevanagari?: string;
  slug: string;
  year?: number;
  lyrics?: string;
  lyricsTranslation?: string;
  youtubeId?: string;
  spotifyId?: string;
  mood?: string[];
  notes?: string;
  sources?: string[];
}

export interface Raga {
  name: string;
  nameDevanagari?: string;
  slug: string;
  aroha?: string;
  avaroha?: string;
  vadi?: string;
  samvadi?: string;
  timeOfDay?: string;
  rasa?: string;
  pakad?: string;
  description?: string;
  sources?: string[];
}

export interface Thaat {
  name: string;
  nameDevanagari?: string;
  swaras?: string;
}

export interface Artist {
  name: string;
  nameDevanagari?: string;
  slug: string;
  bio?: string;
  birthYear?: number;
  deathYear?: number;
  imageUrl?: string;
  sources?: string[];
}

export interface Film {
  title: string;
  titleDevanagari?: string;
  slug: string;
  year?: number;
  language?: string;
  sources?: string[];
}

export interface Taal {
  name: string;
  nameDevanagari?: string;
  beats?: number;
  vibhaag?: string;
  description?: string;
}

export interface Alankar {
  name: string;
  nameDevanagari?: string;
  description?: string;
  audioExample?: string;
}

export interface Journey {
  title: string;
  slug: string;
  description?: string;
  difficulty?: string;
  author?: string;
}

// Relationship properties

export interface BasedOnRaga {
  primary: boolean;
  section?: string;
}

export interface FeaturesAlankar {
  timestamp?: string;
  description?: string;
}

export interface SimilarTo {
  reason?: string;
}

export interface JourneyIncludes {
  order: number;
  annotation?: string;
}
