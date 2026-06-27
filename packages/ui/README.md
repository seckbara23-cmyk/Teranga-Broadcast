# @teranga/ui

Shared UI kit for Teranga Broadcast: **shadcn/ui** components, the **Tailwind**
preset, and the operator-console **theme** (dark, high-contrast, keyboard-first).

Consumed by `apps/web` (operator console + OBS overlay routes). Centralizing the
component library here keeps the console and the overlays visually consistent and
makes broadcast-specific components (scoreboard editor, replay deck shell, OBS
status chips) reusable.

## Contents (planned)

- Re-exported shadcn/ui primitives (button, dialog, tabs, ...).
- Broadcast components (scoreboard, lower-third preview, replay deck, health chips).
- `styles.css` — Tailwind layers + Teranga theme tokens.

## Peer dependencies

- `react` ^19, `react-dom` ^19.

> Status: **placeholder**. Components are added with the shadcn CLI during
> Phase 0/1. See [docs/04-folder-structure.md](../../docs/04-folder-structure.md).
