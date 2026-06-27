import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (Client Components).
 *
 * Created lazily inside event handlers so a missing env var surfaces as a clear
 * runtime error rather than breaking the build/prerender.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy apps/web/.env.example to apps/web/.env.local and fill them in.",
    );
  }
  return createBrowserClient(url, key);
}
