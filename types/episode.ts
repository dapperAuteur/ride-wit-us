export type ApronLevel = "green" | "red" | "purple" | "black" | "engineering" | "community";

export type EpisodeStatus = "planned" | "scripted" | "recorded" | "published";

export interface Episode {
  id: number;
  season: 1 | 2 | 3 | 4;
  ep: number;
  slug: string;
  title: string;
  subtitle?: string;
  apronLevel: ApronLevel;
  durationSec?: number;
  publishedAt?: string;
  audioUrl?: string;
  transcriptUrl?: string;
  academyCourseId?: string;
  academyLessonId?: string;
  flashlearnSetId?: string;
  wanderlearnTourId?: string;
  body: string;
  cutPoints?: string[];
  status: EpisodeStatus;
  isHome?: boolean;
}

export interface SeasonMeta {
  number: 1 | 2 | 3 | 4;
  title: string;
  tagline: string;
  apronLevels: ApronLevel[];
  description: string;
}
