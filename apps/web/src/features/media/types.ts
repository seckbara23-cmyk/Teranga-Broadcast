import type { MediaAssetType, SourceEngine } from "./service";

export type { MediaAssetType, SourceEngine };

export type MediaAsset = {
  id: string;
  matchId: string | null;
  title: string;
  description: string | null;
  assetType: MediaAssetType;
  sourceEngine: SourceEngine;
  sourceId: string | null;
  filePath: string | null;
  thumbnailPath: string | null;
  durationS: number | null;
  sizeBytes: number | null;
  operatorLabel: string | null;
  metadata: Record<string, any>;
  createdAt: string;
};

export type MediaCollection = {
  id: string;
  name: string;
  kind: string;
  itemCount: number;
  createdAt: string;
};

export const ASSET_TYPE_LABEL: Record<MediaAssetType, string> = {
  replay_clip: "Clip replay",
  thumbnail: "Vignette",
  tactical_svg: "Tactique SVG",
  tactical_png: "Tactique PNG",
  tactical_pdf: "Tactique PDF",
  graphics_preset: "Préréglage graphique",
  graphics_overlay: "Overlay",
  match_package: "Package match",
  highlight_package: "Package résumé",
  document: "Document",
  image: "Image",
  video: "Vidéo",
  audio: "Audio",
  other: "Autre",
};

export const SOURCE_LABEL: Record<SourceEngine, string> = {
  replay: "Replay",
  tactics: "Tactique",
  graphics: "Graphismes",
  production: "Production",
  media: "Média",
  manual: "Manuel",
};

export const COLLECTION_KINDS: { id: string; label: string }[] = [
  { id: "match_package", label: "Package match" },
  { id: "halftime_highlights", label: "Résumé mi-temps" },
  { id: "fulltime_highlights", label: "Résumé fin de match" },
  { id: "tactical_package", label: "Package tactique" },
  { id: "social_clips", label: "Clips sociaux" },
  { id: "coach_report", label: "Rapport coach" },
  { id: "archive_folder", label: "Dossier archive" },
  { id: "custom", label: "Personnalisé" },
];
