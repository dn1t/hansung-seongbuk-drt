import { Title } from "@solidjs/meta";
import { type RouteSectionProps, useLocation } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Errored, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../components/common/button";
import { Input } from "../components/common/input";
import { Wordmark } from "../components/layout/screen";
import { getStaffState, staffSignIn, staffSignOut } from "../lib/staff";

const NAV = [
  { href: "/operator", label: "운행일", icon: PhCalendarBlankBold },
  { href: "/operator/stops", label: "정류장", icon: PhMapPinBold },
  { href: "/operator/places", label: "출발지", icon: PhFlagBold },
  { href: "/operator/routes", label: "노선", icon: PhPathBold },
  { href: "/operator/survey", label: "가입 조사", icon: PhClipboardTextBold },
  { href: "/operator/simulate", label: "모의 노선", icon: PhChartBarBold },
  { href: "/operator/reader", label: "탑승 확인", icon: PhQrCodeBold },
  { href: "/operator/driver", label: "기사님 화면", icon: PhSteeringWheelBold },
  { href: "/operator/settings", label: "운행 설정", icon: PhSlidersHorizontalBold },
];

export default function OperatorLayout(props: RouteSectionProps) {
  const staff = createMemo(() => getStaffState());

  return (
    <div style={{ "color-scheme": "light" }} class="min-h-dvh bg-sand-1 text-sand-12">
      <Title>{`운영 - ${env.VITE_APP_NAME}`}</Title>
      <Errored
        fallback={(err, reset) => (
          <Gate title="운영자 화면을 열지 못했어요" description="다시 시도해도 같으면 새로고침해 주세요.">
            <ErrorNote error={err()} onRetry={reset} />
          </Gate>
        )}
      >
        <Loading fallback={<div class="min-h-dvh" />}>
          <Switch>
            <Match when={!staff().configured}>
              <Gate
                title="운영자 코드가 설정되지 않았어요"
                description=".env에 STAFF_CODE를 넣고 서버를 다시 시작하면 이 화면을 쓸 수 있어요."
              />
            </Match>
            <Match when={!staff().signedIn}>
              <SignIn />
            </Match>
            <Match when={true}>
              <Shell>{props.children}</Shell>
            </Match>
          </Switch>
        </Loading>
      </Errored>
    </div>
  );
}

function Gate(props: { title: string; description: string; children?: JSX.Element }) {
  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <div class="px-1">
        <Wordmark />
        <h1 class="mt-6 text-2xl font-bold text-balance break-keep">{props.title}</h1>
        <p class="mt-2 font-medium text-balance break-keep text-sand-11">{props.description}</p>
      </div>
      {props.children}
    </div>
  );
}

function ErrorNote(props: { error: unknown; onRetry: () => void }) {
  const detail = () => (props.error instanceof Error ? props.error.message : String(props.error ?? ""));
  return (
    <div class="mt-6 flex flex-col items-start gap-y-4">
      <Show when={detail()}>
        <p class="w-full rounded-xl bg-sand-3 px-4 py-3 font-mono text-sm break-all text-sand-11">{detail()}</p>
      </Show>
      <button type="button" class="cursor-pointer px-1 font-semibold text-amber-11" onClick={() => props.onRetry()}>
        다시 시도
      </button>
    </div>
  );
}

function SignIn() {
  const [code, setCode] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  let field: HTMLInputElement | undefined;

  onSettled(() => {
    if (field?.value) setCode(field.value);
  });

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const result = await staffSignIn(field?.value ?? code());
      if (!result.ok) throw new Error(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "들어가지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Gate
      title="운영자 화면"
      description="운행일과 정류장을 넣고, 노선과 탑승을 확인하는 곳이에요. 운영자 코드를 입력해 주세요."
    >
      <form
        class="mt-8 flex flex-col gap-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          type="password"
          name="code"
          label="운영자 코드"
          autocomplete="current-password"
          required
          autofocus
          ref={(el) => (field = el)}
          onInput={(e) => setCode(e.currentTarget.value)}
          onChange={(e) => setCode(e.currentTarget.value)}
        />
        <Show when={error()}>
          <p role="alert" class="px-1 font-medium break-keep text-red-11">
            {error()}
          </p>
        </Show>
        <Button type="submit" class="mt-2" variant={busy() ? "loading" : code().trim() ? "primary" : "disabled"}>
          들어가기
        </Button>
      </form>
    </Gate>
  );
}

function Shell(props: { children: JSX.Element }) {
  const loc = useLocation();
  const isActive = (href: string) => loc.pathname === href;

  return (
    <Switch>
      <Match when={loc.pathname === "/operator/present"}>{props.children}</Match>
      <Match when={true}>
        <div class="flex min-h-dvh flex-col md:flex-row">
          <aside class="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-sand-4 bg-sand-2 px-5 py-3 whitespace-nowrap md:sticky md:top-0 md:h-dvh md:w-56 md:flex-col md:flex-nowrap md:items-stretch md:border-r md:border-b-0 md:px-3 md:py-6">
            <div class="flex items-center gap-x-2 md:px-3">
              <Wordmark />
              <span class="text-sm font-bold text-sand-11">운영</span>
            </div>
            <nav
              aria-label="운영 메뉴"
              class="order-last -mx-3 flex w-[calc(100%+1.5rem)] [scrollbar-width:none] gap-x-1 overflow-x-auto md:order-none md:mx-0 md:mt-8 md:w-auto md:flex-col md:gap-y-1 md:overflow-visible"
            >
              <For each={NAV}>
                {(item) => (
                  <a
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    class={[
                      "flex h-10 items-center gap-x-2.5 rounded-xl px-3 font-semibold transition-colors",
                      isActive(item.href)
                        ? "bg-sand-4 text-sand-12"
                        : "text-sand-11 hover:bg-sand-3 hover:text-sand-12",
                    ]}
                  >
                    <item.icon aria-hidden="true" class="shrink-0 text-lg" />
                    {item.label}
                  </a>
                )}
              </For>
            </nav>
            <div class="ml-auto flex items-center gap-x-4 md:mt-auto md:ml-0 md:flex-col md:items-start md:gap-y-1 md:px-3">
              <a href="/" class="text-sm font-semibold text-sand-11 hover:text-sand-12">
                학생 앱 열기
              </a>
              <button
                type="button"
                class="cursor-pointer text-sm font-semibold text-sand-11 hover:text-sand-12"
                onClick={() => void staffSignOut()}
              >
                나가기
              </button>
            </div>
          </aside>
          <div class="min-w-0 flex-1 px-5 py-8 md:px-10">
            <div class="mx-auto max-w-6xl">
              <Errored
                fallback={(err, reset) => (
                  <div class="max-w-md px-1">
                    <h1 class="text-3xl font-bold">이 화면을 열지 못했어요</h1>
                    <p class="mt-2 font-medium text-balance break-keep text-sand-11">
                      다른 메뉴는 그대로 쓸 수 있어요. 다시 시도해도 같으면 새로고침해 주세요.
                    </p>
                    <ErrorNote error={err()} onRetry={reset} />
                  </div>
                )}
              >
                {props.children}
              </Errored>
            </div>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
