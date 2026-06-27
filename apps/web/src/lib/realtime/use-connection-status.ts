"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ConnectionState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "offline";

/**
 * Tracks the live Supabase Realtime connection (and browser online state) so the
 * shell can show a persistent, honest connection indicator — critical during a
 * live match. Returns the current connection state.
 */
export function useConnectionStatus(): ConnectionState {
  const [state, setState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
    }

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;

    try {
      const supabase = createClient();
      channel = supabase.channel("system:connection");
      channel.subscribe((status) => {
        switch (status) {
          case "SUBSCRIBED":
            setState("connected");
            break;
          case "CHANNEL_ERROR":
          case "TIMED_OUT":
            setState("disconnected");
            break;
          case "CLOSED":
            setState("connecting");
            break;
          default:
            setState("connecting");
        }
      });
    } catch {
      // Missing env / client error — surface as disconnected rather than crash.
      setState("disconnected");
    }

    const onOnline = () => setState("connecting");
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (channel) channel.unsubscribe();
    };
  }, []);

  return state;
}
