import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Local media storage layout. FOLDER MANAGEMENT ONLY — no FFmpeg, no encoding,
 * no media written this phase. The Replay Agent fills these later.
 */
export const MEDIA_DIRS = ["buffer", "clips", "exports", "logs"] as const;
export type MediaDir = (typeof MEDIA_DIRS)[number];

export interface MediaPaths {
  root: string;
  buffer: string;
  clips: string;
  exports: string;
  logs: string;
}

export function mediaPaths(root: string): MediaPaths {
  return {
    root,
    buffer: join(root, "buffer"),
    clips: join(root, "clips"),
    exports: join(root, "exports"),
    logs: join(root, "logs"),
  };
}

/** Create the media directory structure if it doesn't exist. */
export function ensureMediaDirs(root: string): MediaPaths {
  const paths = mediaPaths(root);
  mkdirSync(paths.root, { recursive: true });
  for (const dir of MEDIA_DIRS) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  return paths;
}
