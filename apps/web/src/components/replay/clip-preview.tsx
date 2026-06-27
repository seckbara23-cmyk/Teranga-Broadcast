"use client";

import { useRef, useState } from "react";
import {
  PLAYBACK_SPEEDS,
  cameraLabel,
  type PlaybackSpeed,
  type ReplayClip,
} from "@/features/replay/clip-types";

const ASSUMED_FPS = 50; // frame step granularity until media metadata is available

const STATUS_DOT: Record<ReplayClip["status"], string> = {
  pending: "status__dot--info",
  extracting: "status__dot--info",
  ready: "status__dot--ok",
  error: "status__dot--offline",
};

/**
 * Browser clip preview with broadcast playback controls + slow-motion (no
 * interpolation — native playbackRate) and frame advance/reverse. When the Agent
 * has produced the native media file, `clipPath` is a playable URL; until then a
 * status placeholder is shown.
 */
export function ClipPreview({ clip }: { clip: ReplayClip | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [loop, setLoop] = useState(false);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);

  function setRate(s: PlaybackSpeed) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }
  function step(dir: 1 | -1) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, v.currentTime + dir * (1 / ASSUMED_FPS));
  }

  if (!clip) {
    return <div className="empty">Sélectionnez un clip pour le prévisualiser.</div>;
  }

  const src = clip.status === "ready" ? clip.clipPath : null;

  return (
    <div className="clip-preview">
      <div className="clip-preview__stage">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={clip.thumbnailPath ?? undefined}
            loop={loop}
            playsInline
          />
        ) : (
          <div className="clip-preview__placeholder">
            <span className="status">
              <span className={`status__dot ${STATUS_DOT[clip.status]}`} />
              {clip.status}
            </span>
            <p className="dim" style={{ marginTop: "0.6rem" }}>
              En attente de l&apos;agent replay (média natif).
            </p>
          </div>
        )}
      </div>

      <div className="clip-preview__bar">
        <div className="row" style={{ gap: "0.35rem" }}>
          <button className="iconbtn" title="Reculer une image" onClick={() => step(-1)} disabled={!src}>⏮</button>
          <button className="iconbtn" title="Lecture" onClick={() => videoRef.current?.play()} disabled={!src}>▶</button>
          <button className="iconbtn" title="Pause" onClick={() => videoRef.current?.pause()} disabled={!src}>⏸</button>
          <button className="iconbtn" title="Avancer une image" onClick={() => step(1)} disabled={!src}>⏭</button>
          <button
            className={`iconbtn ${loop ? "iconbtn--on" : ""}`}
            title="Boucle"
            onClick={() => setLoop((l) => !l)}
          >
            ↺
          </button>
        </div>

        <div className="row" style={{ gap: "0.25rem" }}>
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              className={`speed ${speed === s ? "speed--on" : ""}`}
              onClick={() => setRate(s)}
              disabled={!src}
            >
              {s * 100}%
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: "0.35rem" }}>
          <button className="iconbtn" title="Mark In" onClick={() => setMarkIn(videoRef.current?.currentTime ?? null)} disabled={!src}>[</button>
          <button className="iconbtn" title="Mark Out" onClick={() => setMarkOut(videoRef.current?.currentTime ?? null)} disabled={!src}>]</button>
          <span className="dim mono" style={{ fontSize: "0.72rem" }}>
            {markIn != null ? markIn.toFixed(2) : "—"} / {markOut != null ? markOut.toFixed(2) : "—"}
          </span>
        </div>

        <span className="dim mono" style={{ fontSize: "0.72rem" }}>
          {cameraLabel(clip.cameraId)} · {clip.durationS}s · {clip.clockLabel ?? "—"}
        </span>
      </div>
    </div>
  );
}
