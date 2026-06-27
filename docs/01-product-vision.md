# 01 — Product Vision

## The one-line vision

> Give every sports broadcaster — starting with RTS Senegal — a software control
> room that turns a live match into instant replays, on-air graphics, highlight
> reels, and shareable clips, without a million-dollar hardware truck.

## The problem

Professional sports production today depends on expensive, proprietary hardware
(EVS replay servers, Chyron/Vizrt graphics, dedicated SDI routers) operated by
large specialist crews. For a broadcaster like **RTS Senegal**, this means:

- **High capital cost** — replay servers alone run into hundreds of thousands of
  dollars.
- **Vendor lock-in** — closed ecosystems that are hard to extend or integrate.
- **Crew intensity** — a single replay operator, a graphics operator, a producer,
  and more, per production.
- **Slow turnaround** — highlights and social clips are produced *after* the
  match, often by a separate team, missing the social-media moment.

Meanwhile, software-defined production (OBS, NDI, vMix) has matured to the point
where commodity PCs and GPUs can do work that once needed dedicated hardware.

## The opportunity

Teranga Broadcast is a **software-defined production platform** that unifies the
fragmented toolchain — replay, graphics, scoreboards, highlights, archive, and
distribution — into one operator-friendly web application backed by a real-time
event model.

The name **Teranga** is the Senegalese (Wolof) concept of hospitality and
generosity — fitting for a platform meant to make world-class production
accessible.

## Target users

| Persona | Role | Primary need |
|---------|------|--------------|
| **Producer / Director** | Calls the show in the truck/control room | Fast, reliable replays and clean graphics on air |
| **Replay Operator** | Marks and plays back key moments | Frame-accurate in/out, instant playback |
| **Graphics Operator** | Drives lower-thirds, scoreboards | One-click overlays synced to match state |
| **Social/Digital Editor** | Produces clips for web & socials | Export highlight clips *during* the match |
| **Station Manager** | Owns the broadcast operation | Cost control, reliability, an asset archive |
| **Archivist** | Manages historical footage | Searchable, tagged match archive |

## North-star outcomes

- **Time-to-replay:** under **5 seconds** from event to on-air replay.
- **Time-to-social-clip:** a shareable, branded clip in **under 60 seconds**,
  *during* the match.
- **Crew reduction:** a small team (2–3) can run a broadcast that previously
  needed 6+.
- **Asset value:** every match becomes a searchable, reusable archive.

## What success looks like (12–18 months)

RTS Senegal runs a live football broadcast where the replay engine, scoreboard,
and lower-thirds are all driven from Teranga Broadcast; the digital team ships
goal clips to social within a minute of the goal; and the full match is archived
and searchable the next morning — all on commodity hardware.

## Long-term north star

A modular, extensible broadcast OS:

- **AI event detection** auto-marks goals, cards, and key plays.
- **Multi-camera replay** with NDI/SDI ingest.
- **Teranga Tactics** — a tactical analysis module (telestration on paused video
  plus a match analysis dashboard) for journalists and analysts. See
  [11-teranga-tactics](./11-teranga-tactics.md). *(Future module — not yet
  scheduled; Replay Engine and Auth/Tenant remain the current priority.)*
- **Cloud + on-prem hybrid** so productions scale from a single laptop to a full
  OB van.
- **Marketplace of overlays/templates** localized for African leagues and
  competitions.
- Expansion beyond football to basketball, wrestling (*làmb*), athletics, and
  studio shows.

## Non-goals (for now)

- We are **not** building a video encoder/transcoder from scratch — we orchestrate
  OBS/FFmpeg.
- We are **not** replacing the camera/switcher hardware on day one — we integrate
  with it.
- We are **not** a general-purpose video editor — Highlight Studio is purpose-built
  for sports moments.
