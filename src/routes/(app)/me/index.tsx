import { Title } from "@solidjs/meta";
import { revalidate, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, Loading, Show } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../../components/common/button";
import { Input } from "../../../components/common/input";
import { ActionRow, LinkRow, SavedNotice } from "../../../components/common/list-row";
import { Sheet } from "../../../components/common/sheet";
import { authClient } from "../../../lib/auth-client";
import { getProfile } from "../../../lib/profile";

const SAVED_NOTICES: Record<string, string> = {
  name: "이름을 바꿨어요.",
  address: "집 주소를 바꿨어요.",
  password: "비밀번호를 바꿨어요.",
};

export default function Me() {
  const nav = useNavigate();
  const [params] = useSearchParams<{ saved?: string }>();
  const profile = createMemo(() => getProfile());
  const [deleting, setDeleting] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");

  async function signOut() {
    await authClient.signOut();
    revalidate();
    nav("/welcome", { replace: true });
  }

  async function deleteAccount() {
    setError("");
    setBusy(true);
    try {
      const { error } = await authClient.deleteUser({ password: password() });
      if (error) {
        if (error.code === "INVALID_PASSWORD") throw new Error("비밀번호가 맞지 않아요.");
        if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
        throw new Error("탈퇴하지 못했어요. 비밀번호를 확인하고 다시 시도해 주세요.");
      }
      revalidate();
      nav("/welcome", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "탈퇴하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="flex flex-1 flex-col px-5 pb-[calc(4rem+env(safe-area-inset-bottom)+1.75rem)]">
      <Title>{`내 정보 - ${env.VITE_APP_NAME}`}</Title>
      <div class="mt-8 flex h-7 items-center px-1">
        <h1 class="text-xl font-bold">내 정보</h1>
      </div>
      <Errored
        fallback={(_, reset) => (
          <div class="mt-6 px-1">
            <p class="font-semibold">내 정보를 불러오지 못했어요.</p>
            <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
              다시 불러오기
            </button>
          </div>
        )}
      >
        <Loading fallback={<div class="flex-1" />}>
          <div class="mt-5 px-1">
            <p class="text-xl font-bold break-keep">{profile().name}</p>
            <p class="mt-0.5 text-sm font-medium break-all text-sand-11">
              {profile().school} · {profile().email}
            </p>
          </div>
          <SavedNotice message={SAVED_NOTICES[params.saved ?? ""]} class="mt-4" />
          <ul class="mt-5 overflow-hidden rounded-2xl bg-sand-2">
            <LinkRow href="/me/name" icon={<PhUserBold />} title="이름" value={profile().name} />
            <LinkRow
              href="/me/address"
              icon={<PhHouseBold />}
              title="집 주소"
              value={profile().homeAddress ?? "정하지 않음"}
              divided
            />
            <LinkRow href="/me/password" icon={<PhLockSimpleBold />} title="비밀번호 바꾸기" divided />
          </ul>
          <ul class="mt-3 overflow-hidden rounded-2xl bg-sand-2">
            <ActionRow icon={<PhSignOutBold />} title="로그아웃" onClick={() => void signOut()} />
            <ActionRow
              icon={<PhUserMinusBold />}
              title="회원 탈퇴"
              danger
              divided
              onClick={() => {
                setPassword("");
                setError("");
                setDeleting(true);
              }}
            />
          </ul>
        </Loading>
      </Errored>
      <Sheet
        open={deleting()}
        title="정말 탈퇴할까요?"
        description="계정과 사전 신청 내역이 모두 지워지고 되돌릴 수 없어요. 확인을 위해 비밀번호를 입력해 주세요."
        onClose={() => setDeleting(false)}
      >
        <form
          class="flex flex-col gap-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void deleteAccount();
          }}
        >
          <Input
            type="password"
            name="password"
            label="비밀번호"
            placeholder="••••••••"
            autocomplete="current-password"
            required
            onInput={(e) => setPassword(e.currentTarget.value)}
          />
          <Show when={error()}>
            <p class="px-1 font-medium break-keep text-red-11">{error()}</p>
          </Show>
          <Button type="submit" class="mt-4" variant={busy() ? "loading" : password() ? "danger" : "disabled"}>
            탈퇴하기
          </Button>
          <Button type="button" variant="secondary" onClick={() => setDeleting(false)}>
            취소
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
