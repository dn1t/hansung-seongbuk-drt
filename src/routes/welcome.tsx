import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, isHydrating, Loading, onSettled, Show, untrack } from "solid-js";

import { AddressPrivacyNote, AddressSearch } from "../components/common/address-search";
import { Input } from "../components/common/input";
import { OTPInput } from "../components/common/otp-input";
import { Select } from "../components/common/select";
import { Footer, Header, PasswordRules, RouteDots, SectionRule } from "../components/layout/screen";
import { NAME_MAX_LENGTH, setupAccount } from "../lib/account";
import { type AddressResult, saveHomeAddress } from "../lib/address";
import { authClient } from "../lib/auth-client";
import { afterSignInPath } from "../lib/geo";
import { getJoinState, getWelcomeState, type JoinState, type JoinStep } from "../lib/join";
import { isValidPassword, PASSWORD_MAX_LENGTH } from "../lib/password";
import { SCHOOL_DOMAINS, schoolOf } from "../lib/schools";
import { revalidateSession } from "../lib/session";

export type WelcomePage = "welcome" | "login" | "reset-password" | JoinStep;
type Page = WelcomePage;

export interface WelcomeLocationState {
  page?: WelcomePage;
  notice?: string;
}

function pageFor(state: JoinState | undefined): Page | undefined {
  if (!state) return undefined;
  return state.step === "join-1" ? "welcome" : state.step;
}

export default function Welcome() {
  const nav = useNavigate();
  const loc = useLocation<WelcomeLocationState>();
  const entry = untrack(() => loc.state);
  const hydrating = isHydrating();

  const [joinState, setJoinState] = createSignal<JoinState | undefined>(() => getWelcomeState());
  const [manualPage, setManualPage] = createSignal<Page | undefined>(hydrating ? undefined : entry?.page);
  const page = createMemo(() => (joinState() ? (manualPage() ?? pageFor(joinState())) : undefined));

  function go(next: Page) {
    setError("");
    setNotice("");
    setManualPage(next);
  }

  function followJoinState(next: JoinState) {
    revalidateSession();
    setNow(Date.now());
    setCodeLocked(false);
    setJoinState(next);
    setManualPage(undefined);
  }

  async function syncJoinState() {
    followJoinState(await getJoinState());
  }

  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal(hydrating ? "" : (entry?.notice ?? ""));

  const email = () => joinState()?.email ?? "";
  const [emailLocal, setEmailLocal] = createSignal("");
  const [code, setCode] = createSignal("");
  const [codeLocked, setCodeLocked] = createSignal(false);
  const [name, setName] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loginEmail, setLoginEmail] = createSignal("");
  const [loginPassword, setLoginPassword] = createSignal("");
  const [resetEmail, setResetEmail] = createSignal("");

  const submitVariant = (ready: boolean) => (loading() ? "loading" : ready ? "primary" : "disabled");

  const [selectedAddress, setSelectedAddress] = createSignal<AddressResult>();

  const [now, setNow] = createSignal(Date.now());
  onSettled(() => {
    if (hydrating && entry?.page) {
      setManualPage(entry.page);
      setNotice(entry.notice ?? "");
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  });
  const remaining = createMemo(() => Math.max(0, Math.ceil(((joinState()?.codeExpiresAt ?? 0) - now()) / 1000)));
  const remainingLabel = () => `${Math.floor(remaining() / 60)}:${String(remaining() % 60).padStart(2, "0")}`;
  const canResend = () => remaining() === 0 || codeLocked();

  async function sendVerificationCode(address: string) {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: address, type: "sign-in" });
    if (!error) return;
    if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
    throw new Error(error.message ?? "인증 코드를 보내지 못했어요. 다시 시도해 주세요.");
  }

  function showError(err: unknown) {
    setError(err instanceof Error ? err.message : String(err));
  }

  async function verifyCode(address: string, otp: string) {
    if (otp.length !== 6) throw new Error("6자리 코드를 모두 입력해 주세요.");
    const { error } = await authClient.signIn.emailOtp({ email: address, otp });
    if (!error) return;
    if (error.code === "INVALID_OTP") throw new Error("코드가 맞지 않아요. 다시 확인해 주세요.");
    if (error.code === "OTP_EXPIRED") throw new Error("코드가 만료됐어요. 다시 보내기를 눌러 주세요.");
    if (error.code === "TOO_MANY_ATTEMPTS") {
      setCodeLocked(true);
      throw new Error("시도 횟수를 넘었어요. 다시 보내기를 눌러 주세요.");
    }
    if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
    throw new Error(error.message ?? "코드를 확인하지 못했어요. 다시 시도해 주세요.");
  }

  async function login(address: string, nextPassword: string) {
    const { error } = await authClient.signIn.email({ email: address.trim().toLowerCase(), password: nextPassword });
    if (error) {
      if (error.code === "INVALID_EMAIL_OR_PASSWORD") throw new Error("이메일이나 비밀번호가 맞지 않아요.");
      if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
      throw new Error(error.message ?? "로그인하지 못했어요. 다시 시도해 주세요.");
    }
    const next = await getJoinState();
    if (next.step === "complete") {
      revalidateSession();
      nav(await afterSignInPath(), { replace: true });
      return;
    }
    followJoinState(next);
  }

  async function requestPasswordReset(address: string) {
    const { error } = await authClient.requestPasswordReset({
      email: address.trim().toLowerCase(),
      redirectTo: "/reset-password",
    });
    if (error) {
      if (error.status === 429) throw new Error("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
      throw new Error(error.message ?? "메일을 보내지 못했어요. 다시 시도해 주세요.");
    }
    setNotice("가입한 이메일이면 링크를 보냈어요. 메일함을 확인해 주세요.");
  }

  async function saveAccount(nextName: string, nextPassword: string) {
    const result = await setupAccount(nextName, nextPassword);
    if (!result.ok) throw new Error(result.message);
  }

  async function completeJoin(selected: AddressResult | undefined, detail: string) {
    if (!selected) throw new Error("주소를 검색해서 골라 주세요.");
    const result = await saveHomeAddress(selected.address, detail);
    if (!result.ok) throw new Error(result.message);
  }

  return (
    <Loading fallback={<div class="flex-1" />}>
      <div class={["flex flex-col px-5", page() === "join-4" ? "h-dvh" : "flex-1"]}>
        <Show when={page() === "welcome"}>
          <Header title="" isInitialPage />
          <div class="flex flex-1 flex-col justify-end px-1 pt-16 pb-6">
            <RouteDots current={1} total={4} spacing="wide" />
            <h1 class="mt-7 max-w-72 text-[40px] leading-12 font-bold tracking-[-0.03em] text-balance break-keep">
              막차 때문에 먼저 일어나지 않아도 돼요
            </h1>
            <p class="mt-4 max-w-80 text-lg leading-7 text-balance break-keep text-sand-11">
              시험기간과 축제기간에 운행하는 성북구 대학생 전용 심야 귀가 버스예요.
            </p>
          </div>
          <Footer type="button" onClick={() => go("join-1")} buttonLabel="학교 이메일로 가입하기">
            <p class="mt-4 text-center text-sand-11">
              이미 계정이 있나요?{" "}
              <button
                type="button"
                onClick={() => go("login")}
                class="ml-0.5 cursor-pointer font-semibold text-amber-11"
              >
                로그인
              </button>
            </p>
          </Footer>
        </Show>
        <Show when={page() === "login"}>
          <Header title="로그인" onBackClick={() => go("welcome")} />
          <form
            class="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              login(loginEmail(), loginPassword())
                .catch(showError)
                .finally(() => setLoading(false));
            }}
          >
            <div class="mt-4 flex flex-col gap-y-3.5">
              <Input
                type="email"
                name="email"
                label="학교 이메일"
                placeholder="hamin@hansung.ac.kr"
                autocomplete="email"
                required
                onInput={(e) => setLoginEmail(e.currentTarget.value)}
              />
              <Input
                type="password"
                name="password"
                label="비밀번호"
                placeholder="••••••••"
                labelClass="mt-1.5"
                autocomplete="current-password"
                required
                onInput={(e) => setLoginPassword(e.currentTarget.value)}
              />
              <button
                type="button"
                class="w-max cursor-pointer px-1 text-start font-semibold text-amber-11"
                onClick={() => go("reset-password")}
              >
                비밀번호를 잊었어요
              </button>
            </div>
            <Show when={notice()}>
              <p class="mt-3.5 px-1 font-medium break-keep text-green-11">{notice()}</p>
            </Show>
            <Show when={error()}>
              <p class="mt-3.5 px-1 font-medium text-red-11">{error()}</p>
            </Show>
            <Footer
              type="submit"
              buttonLabel="로그인"
              variant={submitVariant(loginEmail().trim() !== "" && loginPassword() !== "")}
            />
          </form>
        </Show>
        <Show when={page() === "reset-password"}>
          <Header
            title="비밀번호 재설정"
            description="가입한 학교 이메일로 새 비밀번호를 정하는 링크를 보내드려요."
            onBackClick={() => go("login")}
          />
          <form
            class="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setNotice("");
              setLoading(true);
              requestPasswordReset(resetEmail())
                .catch(showError)
                .finally(() => setLoading(false));
            }}
          >
            <Input
              type="email"
              name="email"
              label="학교 이메일"
              placeholder="hamin@hansung.ac.kr"
              labelClass="mt-4"
              autocomplete="email"
              required
              onInput={(e) => setResetEmail(e.currentTarget.value)}
            />
            <Show when={notice()}>
              <p class="mt-3.5 px-1 font-medium break-keep text-green-11">{notice()}</p>
            </Show>
            <Show when={error()}>
              <p class="mt-3.5 px-1 font-medium text-red-11">{error()}</p>
            </Show>
            <Footer type="submit" buttonLabel="링크 보내기" variant={submitVariant(resetEmail().trim() !== "")} />
          </form>
        </Show>
        <Show when={page() === "join-1"}>
          <Header title="학교 이메일을 알려 주세요" step={{ current: 1, total: 4 }} onBackClick={() => go("welcome")} />
          <form
            class="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const local = String(form.get("email") ?? "")
                .split("@")[0]
                .trim();
              const address = `${local}@${form.get("domain")}`.toLowerCase();
              setCode("");
              setError("");
              setLoading(true);
              sendVerificationCode(address)
                .then(syncJoinState)
                .catch(showError)
                .finally(() => setLoading(false));
            }}
          >
            <div class="mt-4 flex flex-col gap-y-3.5">
              <div class="flex">
                <Input
                  type="text"
                  inputmode="email"
                  autocomplete="off"
                  required
                  name="email"
                  label="학교 이메일"
                  placeholder="hamin"
                  onInput={(e) => setEmailLocal(e.currentTarget.value)}
                  class="rounded-r-none"
                  labelClass="relative z-20 flex-1 shrink-0 focus:z-30"
                />
                <label class="group z-10 mt-auto flex w-56 max-w-1/2 shrink-0 rounded-r-xl focus-within:z-20 focus-within:ring-2 focus-within:ring-amber-5">
                  <span class="flex h-13 items-center border-y border-l border-y-sand-5 border-l-transparent bg-sand-3 pl-4 text-lg text-sand-11 group-focus-within:border-y-amber-8 group-focus-within:border-l-amber-8">
                    @
                  </span>
                  <Select
                    name="domain"
                    class="w-full rounded-l-none border-l-0 bg-sand-3 pl-0.5 focus:ring-0"
                    options={[...SCHOOL_DOMAINS]}
                  />
                </label>
              </div>
              <Show when={error()}>
                <p class="px-1 font-medium text-red-11">{error()}</p>
              </Show>
            </div>
            <Footer
              type="submit"
              buttonLabel="인증 코드 받기"
              variant={submitVariant(emailLocal().split("@")[0].trim() !== "")}
            />
          </form>
        </Show>
        <Show when={page() === "join-2"}>
          <Header
            title="메일로 받은 코드를 입력해 주세요"
            step={{ current: 2, total: 4 }}
            onBackClick={() => {
              go("join-1");
              void authClient.$fetch("/join/reset", { method: "POST" });
            }}
          />
          <form
            class="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              verifyCode(email(), code())
                .then(syncJoinState)
                .catch(showError)
                .finally(() => setLoading(false));
            }}
          >
            <div class="mt-4 flex flex-col gap-y-3.5">
              <span class="mb-2 px-1 text-lg font-semibold text-sand-11">{email()}</span>
              <OTPInput name="code" autofocus onInput={setCode} />
              <span class="mt-1 px-1 text-sm font-medium text-sand-11">
                <Show when={remaining() > 0} fallback="코드가 만료됐어요">
                  <span class="tabular-nums">{remainingLabel()}</span> 남음
                </Show>{" "}
                <span class="px-0.75 text-sand-10">·</span>{" "}
                <button
                  type="button"
                  disabled={!canResend()}
                  class={canResend() ? "cursor-pointer text-amber-11" : "cursor-not-allowed text-sand-10"}
                  onClick={() => {
                    setError("");
                    sendVerificationCode(email()).then(syncJoinState).catch(showError);
                  }}
                >
                  다시 보내기
                </button>
              </span>
              <Show when={error()}>
                <p class="px-1 font-medium text-red-11">{error()}</p>
              </Show>
            </div>
            <Footer type="submit" buttonLabel="확인" variant={submitVariant(code().length === 6)} />
          </form>
        </Show>
        <Show when={page() === "join-3"}>
          <Header title="이름과 비밀번호를 정해 주세요" step={{ current: 3, total: 4 }} isInitialPage />
          <form
            class="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              saveAccount(name(), password())
                .then(syncJoinState)
                .catch(showError)
                .finally(() => setLoading(false));
            }}
          >
            <div class="mt-4 flex flex-col gap-y-3.5">
              <div class="mb-4 flex items-center gap-x-1.5 px-1 text-green-11">
                <PhCheckCircle />
                <span class="leading-none font-semibold text-green-11">{schoolOf(email())} 학생으로 확인됐어요</span>
              </div>
              <Input
                type="text"
                name="name"
                label="이름"
                placeholder="이하민"
                autocomplete="name"
                required
                maxlength={NAME_MAX_LENGTH}
                onInput={(e) => setName(e.currentTarget.value)}
              />
              <Input
                name="password"
                label="비밀번호"
                placeholder="••••••••"
                labelClass="mt-1.5"
                autocomplete="new-password"
                required
                maxlength={PASSWORD_MAX_LENGTH}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
              <PasswordRules password={password()} />
              <Show when={error()}>
                <p class="px-1 font-medium text-red-11">{error()}</p>
              </Show>
            </div>
            <Footer
              type="submit"
              buttonLabel="다음"
              variant={submitVariant(name().trim() !== "" && isValidPassword(password()))}
            />
          </form>
        </Show>
        <Show when={page() === "join-4"}>
          <Header
            title="집 주소를 알려 주세요"
            description="집에서 가장 가까운 정류장을 찾는 데 써요."
            step={{ current: 4, total: 4 }}
            onBackClick={() => go("join-3")}
          />
          <form
            class="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setError("");
              setLoading(true);
              completeJoin(selectedAddress(), String(form.get("address2") ?? ""))
                .then(syncJoinState)
                .catch(showError)
                .finally(() => setLoading(false));
            }}
          >
            <div class="mt-4 flex min-h-0 flex-1 flex-col gap-y-3.5">
              <AddressSearch selected={selectedAddress()} onSelect={setSelectedAddress} />
              <Show when={error()}>
                <p class="px-1 font-medium text-red-11">{error()}</p>
              </Show>
              <AddressPrivacyNote class="pb-8" />
            </div>
            <Footer type="submit" buttonLabel="가입 완료" variant={submitVariant(selectedAddress() !== undefined)} />
          </form>
        </Show>
        <Show when={page() === "complete"}>
          <Header title="" isInitialPage />
          <div class="mt-16 px-1">
            <RouteDots current={4} total={4} spacing="wide" />
            <h1 class="mt-7 text-3xl font-bold text-balance break-keep">
              {joinState()?.name} 님,
              <br />
              가입을 마쳤어요
            </h1>
          </div>
          <section class="mt-14 flex flex-col">
            <SectionRule title="이렇게 타요" />
            <ol class="mt-5 flex flex-col gap-y-5">
              <For
                each={[
                  ["탈 날을 미리 신청해요", "신청한 학생들의 집 방향으로 그날 노선이 생겨요."],
                  ["당일에 탈 버스를 골라요", "출발 시간과 내릴 정류장을 정해요."],
                  ["버스에서 내 QR을 찍어요", "기사님 화면에 내릴 정류장이 표시돼요."],
                ]}
              >
                {([title, description], index) => (
                  <li class="relative flex gap-x-3.5">
                    <Show when={index() < 2}>
                      <span
                        aria-hidden="true"
                        class="absolute top-8 -bottom-4 left-3.25 w-0.5 rounded-full bg-sand-6"
                      />
                    </Show>
                    <div class="flex aspect-square h-max w-7 shrink-0 items-center justify-center rounded-full bg-sand-3 text-sm font-semibold tabular-nums">
                      {index() + 1}
                    </div>
                    <div class="flex flex-col">
                      <span class="font-semibold">{title}</span>
                      <span class="text-sm break-keep text-sand-11">{description}</span>
                    </div>
                  </li>
                )}
              </For>
            </ol>
          </section>
          <Footer
            type="button"
            buttonLabel="시작하기"
            onClick={() => void afterSignInPath().then((path) => nav(path, { replace: true }))}
          />
        </Show>
      </div>
    </Loading>
  );
}
