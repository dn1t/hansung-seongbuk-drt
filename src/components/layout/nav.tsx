import env from "virtual:solid-env/client";

export function Nav() {
  return (
    <nav>
      <div class="mx-auto max-w-2xl">
        <h1>{env.VITE_APP_NAME}</h1>
      </div>
    </nav>
  );
}
