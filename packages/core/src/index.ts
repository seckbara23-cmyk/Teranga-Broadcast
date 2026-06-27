/**
 * @teranga/core — shared domain contract.
 *
 * PLACEHOLDER. This package is the single source of truth for the messages that
 * cross process boundaries between the operator console (apps/web) and the edge
 * service (apps/agent). Every command/event is defined once here and validated
 * with zod at each boundary.
 *
 * See docs/03-system-architecture.md and docs/04-folder-structure.md.
 */

export * from "./commands.js";
export * from "./events.js";

export const TERANGA_CORE_PLACEHOLDER = true as const;
