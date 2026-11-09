import { Title } from "@solidjs/meta";
import { env } from "virtual:solid-env/client";

export default function UsersIndex() {
  return (
    <div class="flex flex-1 flex-col px-5 pb-24">
      <Title>{`준비 중 - ${env.VITE_APP_NAME}`}</Title>
      <p class="mt-8 px-1 font-medium text-sand-11">준비 중인 화면이에요.</p>
    </div>
  );
}
