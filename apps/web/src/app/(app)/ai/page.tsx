import { resolveTenant } from "@/features/auth/tenant";
import { buildContext } from "@/features/ai/context";
import { getProvider } from "@/features/ai/provider";
import {
  getOrCreateConversation,
  listMessages,
  listRecommendations,
  listTasks,
} from "@/features/ai/queries";
import { refreshRecommendations } from "@/features/ai/actions";
import { AiWorkspace } from "@/components/ai/ai-workspace";

export const dynamic = "force-dynamic";

/**
 * AI Broadcast Copilot. Assists across the platform; consumes other engines via
 * their public APIs (Context Builder) and owns only ai_* tables. Never on-air.
 */
export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  const tenant = await resolveTenant();
  const orgId = tenant.currentOrg?.id;

  if (!orgId) {
    return <div className="page"><div className="empty">Aucune organisation active.</div></div>;
  }

  const matchId = match ?? null;
  await refreshRecommendations(matchId);

  const conversationId = await getOrCreateConversation(orgId, "global", matchId, tenant.user.id);
  const [context, messages, recommendations, tasks] = await Promise.all([
    buildContext(orgId, matchId),
    listMessages(conversationId),
    listRecommendations(orgId),
    listTasks(orgId),
  ]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="h1">Copilote IA</h1>
          <p className="dim" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
            Assistant de production — observe, recommande, prépare · jamais à l&apos;antenne
          </p>
        </div>
      </div>
      <AiWorkspace
        orgId={orgId}
        conversationId={conversationId}
        matchId={matchId}
        provider={getProvider().name}
        context={context}
        initialMessages={messages}
        initialRecommendations={recommendations}
        initialTasks={tasks}
      />
    </div>
  );
}
