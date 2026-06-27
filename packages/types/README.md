# @teranga/types

Pure shared TypeScript types for Teranga Broadcast. **Zero runtime dependencies.**

This is the **portability seam** for the data layer: by routing the generated
Supabase database types and domain types through this package, the rest of the
codebase never couples directly to a specific Supabase host. Moving from Supabase
Cloud to self-hosted/on-prem is a config + regenerate step, not a code rewrite.

## Contents (planned)

- `src/index.ts` — domain types (`Match`, `Team`, `MatchEvent`, `ReplayMark`,
  `Asset`, scoreboard state, command/event payloads as types).
- `src/database.ts` — **generated** Supabase types (do not hand-edit).

## Generating DB types

```bash
supabase gen types typescript --local > packages/types/src/database.ts
```

> Status: **placeholder**. Real types are added during Phase 0/1 alongside the
> first migrations. See [docs/08-database-model.md](../../docs/08-database-model.md).
