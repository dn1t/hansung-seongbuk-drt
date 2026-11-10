import { Title } from "@solidjs/meta";
import { revalidate, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { AddressPrivacyNote, AddressSearch } from "../../../components/common/address-search";
import { Footer, Header } from "../../../components/layout/screen";
import { type AddressResult, saveHomeAddress } from "../../../lib/address";
import { getBookingOverview } from "../../../lib/booking";
import { getProfile } from "../../../lib/profile";

export default function EditAddress() {
  const nav = useNavigate();
  const profile = createMemo(() => getProfile());
  const [selected, setSelected] = createSignal<AddressResult>();
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  async function save(detail: string) {
    const picked = selected();
    if (!picked) return;
    setError("");
    setSaving(true);
    try {
      const result = await saveHomeAddress(picked.address, detail);
      if (!result.ok) throw new Error(result.message);
      revalidate([getProfile.key, getBookingOverview.key]);
      nav("/me?saved=address", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "주소를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex h-dvh flex-col px-5">
      <Title>{`집 주소 바꾸기 - ${env.VITE_APP_NAME}`}</Title>
      <Header
        title="집 주소를 바꿔요"
        description="집에서 가장 가까운 정류장을 찾는 데 써요."
        onBackClick={() => nav("/me")}
      />
      <form
        class="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void save(String(new FormData(e.currentTarget).get("address2") ?? ""));
        }}
      >
        <Loading fallback={null}>
          <Show when={profile().homeAddress}>
            {(current) => (
              <p class="mt-4 px-1 text-sm font-medium break-keep text-sand-11">
                지금 주소: <span class="font-semibold text-sand-12">{current()}</span>
              </p>
            )}
          </Show>
        </Loading>
        <div class="mt-4 flex min-h-0 flex-1 flex-col gap-y-3.5">
          <AddressSearch selected={selected()} onSelect={setSelected} />
          <Show when={error()}>
            <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
          </Show>
          <div class="flex flex-col gap-y-1.5 pb-4">
            <AddressPrivacyNote />
            <p class="px-1 text-sm text-balance break-keep text-sand-11">
              이미 신청한 날은 신청할 때 고른 주소 그대로예요.
            </p>
          </div>
        </div>
        <Footer type="submit" buttonLabel="저장" variant={saving() ? "loading" : selected() ? "primary" : "disabled"} />
      </form>
    </div>
  );
}
