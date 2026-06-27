"use client";

import { useEffect, useState } from "react";

/** Live wall-clock (Africa/Dakar context) for the control room top bar. */
export function Clock() {
  const [now, setNow] = useState<string>("--:--:--");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="mono muted" style={{ fontSize: "0.85rem" }} aria-label="Heure">
      {now}
    </span>
  );
}
