export interface NodeRecord {
  slug: string;
  title: string;
  year?: number;
  sources?: string[];
  // Song-specific
  youtube_id?: string;
  lyrics?: string;
  notes?: string;
  // Film slug for songs
  filmSlug?: string;
}

export interface MergeGroup {
  key: string;
  winner: NodeRecord;
  losers: NodeRecord[];
}

export interface DedupReport {
  entityType: "Film" | "Song";
  totalNodes: number;
  groups: MergeGroup[];
  totalDuplicates: number;
}
