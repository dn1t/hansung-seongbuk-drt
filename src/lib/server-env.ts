export default import.meta.env.SSR
  ? (await import("virtual:solid-env/server")).env
  : (process.env as unknown as typeof import("virtual:solid-env/server").env);
