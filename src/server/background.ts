export function inBackground(name: string, task: Promise<unknown>) {
  const settled = task.catch((err) => console.error(`${name}:`, err));
  import("cloudflare:workers").then(({ waitUntil }) => waitUntil(settled)).catch(() => {});
}
