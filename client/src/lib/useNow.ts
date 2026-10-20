import { useEffect, useState } from "react";

declare const __BUILD_TIME__: string;

/**
 * The current time, safe for prerendering.
 *
 * The first render (on the server and during hydration) uses the build time so the
 * markup matches; after mount it switches to the real clock and ticks every
 * `intervalMs`.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date(__BUILD_TIME__));

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
