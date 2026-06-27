import { resolveTenant } from "@/features/auth/tenant";
import { syncMediaAssets } from "@/features/media/sync";
import {
  listAssets,
  listCollections,
  listAssetTags,
  listAssetMatches,
} from "@/features/media/queries";
import { MediaLibrary } from "@/components/media/media-library";

export const dynamic = "force-dynamic";

/**
 * Media Library — the shared archive/search layer. On load it idempotently
 * registers Replay clips and Tactical exports as media assets (Media consumes
 * their data, writes only media_*).
 */
export default async function MediaPage() {
  const tenant = await resolveTenant();
  const orgId = tenant.currentOrg?.id;

  if (!orgId) {
    return (
      <div className="page">
        <div className="empty">Aucune organisation active.</div>
      </div>
    );
  }

  await syncMediaAssets(orgId);

  const [assets, collections, tags, matches] = await Promise.all([
    listAssets(orgId),
    listCollections(orgId),
    listAssetTags(orgId),
    listAssetMatches(orgId),
  ]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="h1">Média</h1>
          <p className="dim" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
            Archive & recherche de tous les assets
          </p>
        </div>
      </div>
      <MediaLibrary
        orgId={orgId}
        initialAssets={assets}
        initialTags={tags}
        initialCollections={collections}
        matches={matches}
      />
    </div>
  );
}
