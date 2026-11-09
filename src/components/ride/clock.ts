import { createSignal, onSettled } from "solid-js";

export function createTickingNow(base: () => number, intervalMs = 15_000) {
  const [elapsed, setElapsed] = createSignal(0);
  onSettled(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), intervalMs);
    return () => clearInterval(timer);
  });
  return () => base() + elapsed();
}
