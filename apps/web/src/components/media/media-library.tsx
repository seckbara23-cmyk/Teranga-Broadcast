"use client";

import { useMemo, useState, useTransition } from "react";
import { useMedia } from "./use-media";
import {
  addTag,
  removeTag,
  addToCollection,
  createCollection,
  refreshLibrary,
} from "@/features/media/actions";
import {
  ASSET_TYPE_LABEL,
  COLLECTION_KINDS,
  SOURCE_LABEL,
  type MediaAsset,
  type MediaAssetType,
  type MediaCollection,
} from "@/features/media/types";

const TYPE_ICON: Partial<Record<MediaAssetType, string>> = {
  replay_clip: "🎬",
  thumbnail: "🖼",
  tactical_svg: "✎",
  tactical_png: "✎",
  tactical_pdf: "📄",
  graphics_preset: "▦",
  graphics_overlay: "▦",
  match_package: "📦",
  highlight_package: "📦",
  document: "📄",
  image: "🖼",
  video: "🎞",
  audio: "🔊",
  other: "•",
};

export function MediaLibrary({
  orgId,
  initialAssets,
  initialTags,
  initialCollections,
  matches,
}: {
  orgId: string;
  initialAssets: MediaAsset[];
  initialTags: Record<string, string[]>;
  initialCollections: MediaCollection[];
  matches: { id: string; title: string }[];
}) {
  const { assets, tags, collections } = useMedia(orgId, initialAssets, initialTags, initialCollections);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [match, setMatch] = useState<string>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (type && a.assetType !== type) return false;
      if (source && a.sourceEngine !== source) return false;
      if (match && a.matchId !== match) return false;
      if (q) {
        const hay = `${a.title} ${a.description ?? ""} ${(tags[a.id] ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, tags, query, type, source, match]);

  const selected = assets.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="media">
      <div className="media__main">
        <div className="media__toolbar">
          <input className="input" placeholder="Rechercher (titre, description, tag)…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: "20rem" }} />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: "12rem" }}>
            <option value="">Tous les types</option>
            {Object.entries(ASSET_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select" value={source} onChange={(e) => setSource(e.target.value)} style={{ maxWidth: "10rem" }}>
            <option value="">Toute source</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select" value={match} onChange={(e) => setMatch(e.target.value)} style={{ maxWidth: "12rem" }}>
            <option value="">Tous les matchs</option>
            {matches.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <div className="row" style={{ gap: "0.3rem", marginLeft: "auto" }}>
            <button className={`chip ${view === "grid" ? "chip--on" : ""}`} onClick={() => setView("grid")}>Grille</button>
            <button className={`chip ${view === "list" ? "chip--on" : ""}`} onClick={() => setView("list")}>Liste</button>
            <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(() => refreshLibrary())} title="Importer depuis Replay / Tactique">↻ Importer</button>
          </div>
        </div>

        <p className="dim" style={{ fontSize: "0.78rem", margin: "0.2rem 0 0.6rem" }}>
          {filtered.length} asset{filtered.length === 1 ? "" : "s"}
        </p>

        {filtered.length === 0 ? (
          <div className="empty">Aucun asset. Créez des clips replay ou des exports tactiques, puis « Importer ».</div>
        ) : view === "grid" ? (
          <div className="media-grid">
            {filtered.map((a) => (
              <button key={a.id} className={`media-card ${selectedId === a.id ? "media-card--sel" : ""}`} onClick={() => setSelectedId(a.id)}>
                <span className="media-card__thumb">
                  {a.thumbnailPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbnailPath} alt="" />
                  ) : (
                    <span style={{ fontSize: "1.6rem" }}>{TYPE_ICON[a.assetType] ?? "•"}</span>
                  )}
                </span>
                <span className="media-card__title">{a.title}</span>
                <span className="dim" style={{ fontSize: "0.68rem" }}>{ASSET_TYPE_LABEL[a.assetType]} · {SOURCE_LABEL[a.sourceEngine]}</span>
              </button>
            ))}
          </div>
        ) : (
          <ul className="clip-list">
            {filtered.map((a) => (
              <li key={a.id} className={`clip-row ${selectedId === a.id ? "clip-row--sel" : ""}`} onClick={() => setSelectedId(a.id)}>
                <span style={{ width: "1.4rem" }}>{TYPE_ICON[a.assetType] ?? "•"}</span>
                <span className="mono dim" style={{ width: "6rem" }}>{ASSET_TYPE_LABEL[a.assetType]}</span>
                <span className="clip-row__name">{a.title}</span>
                <span className="dim" style={{ fontSize: "0.72rem" }}>{SOURCE_LABEL[a.sourceEngine]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="media__side">
        <AssetDetail asset={selected} assetTags={selected ? tags[selected.id] ?? [] : []} collections={collections} pending={pending} startTransition={startTransition} />
        <CollectionsPanel collections={collections} pending={pending} startTransition={startTransition} />
      </aside>
    </div>
  );
}

function AssetDetail({
  asset,
  assetTags,
  collections,
  pending,
  startTransition,
}: {
  asset: MediaAsset | null;
  assetTags: string[];
  collections: MediaCollection[];
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const [tag, setTag] = useState("");
  if (!asset) {
    return (
      <section className="panel">
        <div className="panel__header"><span className="panel__title">Détails</span></div>
        <div className="panel__body"><div className="empty">Sélectionnez un asset.</div></div>
      </section>
    );
  }
  return (
    <section className="panel">
      <div className="panel__header"><span className="panel__title">Détails</span></div>
      <div className="panel__body" style={{ display: "grid", gap: "0.6rem" }}>
        <dl className="media-meta">
          <Row k="Titre" v={asset.title} />
          <Row k="Type" v={ASSET_TYPE_LABEL[asset.assetType]} />
          <Row k="Source" v={SOURCE_LABEL[asset.sourceEngine]} />
          <Row k="Opérateur" v={asset.operatorLabel ?? "—"} />
          <Row k="Durée" v={asset.durationS != null ? `${asset.durationS}s` : "—"} />
          <Row k="Fichier" v={asset.filePath ?? "—"} />
          <Row k="Créé" v={new Date(asset.createdAt).toLocaleString("fr-FR")} />
        </dl>

        <div>
          <span className="tile__label">Tags</span>
          <div className="row" style={{ flexWrap: "wrap", gap: "0.3rem", marginTop: "0.3rem" }}>
            {assetTags.map((t) => (
              <span key={t} className="chip">
                {t}
                <button className="tag-x" onClick={() => startTransition(() => removeTag(asset.id, t))}>×</button>
              </span>
            ))}
          </div>
          <form className="row" style={{ gap: "0.4rem", marginTop: "0.4rem" }}
            onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { startTransition(() => addTag(asset.id, tag)); setTag(""); } }}>
            <input className="input" placeholder="Ajouter un tag" value={tag} onChange={(e) => setTag(e.target.value)} />
            <button className="btn" disabled={pending}>+</button>
          </form>
        </div>

        {collections.length > 0 ? (
          <div>
            <span className="tile__label">Ajouter à une collection</span>
            <select className="select" style={{ marginTop: "0.3rem" }} value="" disabled={pending}
              onChange={(e) => { if (e.target.value) startTransition(() => addToCollection(e.target.value, asset.id)); }}>
              <option value="">Choisir…</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CollectionsPanel({
  collections,
  pending,
  startTransition,
}: {
  collections: MediaCollection[];
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("match_package");
  return (
    <section className="panel">
      <div className="panel__header"><span className="panel__title">Collections</span></div>
      <div className="panel__body" style={{ display: "grid", gap: "0.6rem" }}>
        <form className="row" style={{ gap: "0.4rem" }}
          onSubmit={(e) => { e.preventDefault(); startTransition(() => createCollection(name, kind)); setName(""); }}>
          <input className="input" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value)} style={{ maxWidth: "8rem" }}>
            {COLLECTION_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <button className="btn" disabled={pending}>+</button>
        </form>
        {collections.length === 0 ? (
          <div className="empty">Aucune collection.</div>
        ) : (
          <ul className="clip-list">
            {collections.map((c) => (
              <li key={c.id} className="clip-row" style={{ cursor: "default" }}>
                <span className="status__dot status__dot--idle" />
                <span className="clip-row__name">{c.name}</span>
                <span className="dim mono" style={{ fontSize: "0.72rem" }}>{c.itemCount}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
