import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Errored, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Button } from "../../components/common/button";
import { keepScreenOn } from "../../components/common/wake-lock";
import { type BoardingResult, defaultBus, getTonightBuses, recordBoarding } from "../../lib/boarding";
import { formatClock } from "../../lib/time";

const SCAN_EVERY_MS = 250;
const SAME_CODE_PAUSE_MS = 5000;
const CAMERA_TIMEOUT_MS = 8000;

type Camera = "off" | "starting" | "on" | "error";

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => Detector;
  }
}

export default function OperatorReader() {
  const [params, setParams] = useSearchParams<{ bus?: string }>();
  const data = createMemo(() => getTonightBuses());
  keepScreenOn();
  const busId = () => (data().buses.some((b) => b.id === params.bus) ? params.bus : defaultBus(data()));
  const bus = () => data().buses.find((b) => b.id === busId());

  const [camera, setCamera] = createSignal<Camera>("off");
  const [cameraError, setCameraError] = createSignal("");
  const [cameras, setCameras] = createSignal<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = createSignal("");
  const [result, setResult] = createSignal<BoardingResult>();
  const [checking, setChecking] = createSignal(false);
  const [manual, setManual] = createSignal("");

  let video: HTMLVideoElement | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let preview: HTMLCanvasElement | undefined;
  let frame = 0;
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let detector: Detector | undefined;
  let last = { code: "", at: 0 };

  async function check(code: string, typed = false) {
    const target = busId();
    if (!target) {
      setResult({ ok: false, message: "오늘 운행하는 버스가 없어요." });
      return;
    }
    setChecking(true);
    try {
      const next = await recordBoarding(target, code, typed);
      setResult(next);
      navigator.vibrate?.(next.ok ? 80 : [60, 60, 60]);
    } catch {
      setResult({ ok: false, message: "확인하지 못했어요. 다시 찍어 주세요." });
    } finally {
      setChecking(false);
    }
  }

  async function decode() {
    if (!video || video.readyState < 2) return undefined;
    if (detector) {
      try {
        return (await detector.detect(video))[0]?.rawValue;
      } catch {
        detector = undefined;
      }
    }
    const { default: jsQR } = await import("jsqr");
    canvas ??= document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data;
  }

  function scan() {
    timer = setTimeout(async () => {
      if (!stream) return;
      const code = await decode().catch(() => undefined);
      const now = Date.now();
      if (code && !checking() && (code !== last.code || now - last.at > SAME_CODE_PAUSE_MS)) {
        last = { code, at: now };
        await check(code);
      }
      scan();
    }, SCAN_EVERY_MS);
  }

  function drawPreview() {
    const source = video;
    const target = preview;
    if (!source || !target || !stream) return;
    if (source.videoWidth > 0) {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.round(target.clientWidth * ratio);
      const height = Math.round(target.clientHeight * ratio);
      if (target.width !== width || target.height !== height) {
        target.width = width;
        target.height = height;
      }
      const scale = Math.max(width / source.videoWidth, height / source.videoHeight);
      const drawWidth = source.videoWidth * scale;
      const drawHeight = source.videoHeight * scale;
      target
        .getContext("2d")
        ?.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    }
    frame = requestAnimationFrame(drawPreview);
  }

  function stopCamera() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
  }

  function failCamera(message: string) {
    stopCamera();
    setCameraError(message);
    setCamera("error");
  }

  async function openStream(deviceId?: string) {
    if (deviceId)
      return navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
    try {
      return await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name !== "OverconstrainedError" && name !== "NotFoundError") throw err;
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  async function listCameras(current: MediaStream) {
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const found = devices
      .filter((device) => device.kind === "videoinput" && device.deviceId)
      .map((device, i) => ({ id: device.deviceId, label: device.label || `카메라 ${i + 1}` }));
    setCameras(found);
    setCameraId(current.getVideoTracks()[0]?.getSettings().deviceId ?? found[0]?.id ?? "");
  }

  async function startCamera(deviceId?: string) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      failCamera("이 브라우저에서는 카메라를 쓸 수 없어요. https 주소를 Safari나 Chrome에서 열어 주세요.");
      return;
    }
    const el = video;
    if (!el) {
      failCamera("카메라 화면을 준비하지 못했어요. 새로고침하고 다시 눌러 주세요.");
      return;
    }
    stopCamera();
    setCamera("starting");
    try {
      stream = await openStream(deviceId);
      void listCameras(stream);
      el.muted = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.setAttribute("autoplay", "");
      el.srcObject = stream;
      const showing = new Promise<void>((resolve) => {
        if (el.readyState >= 2) return resolve();
        el.addEventListener("loadeddata", () => resolve(), { once: true });
      });
      void el.play().catch(() => undefined);
      const shown = await Promise.race([
        showing.then(() => true),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), CAMERA_TIMEOUT_MS)),
      ]);
      if (!shown) {
        failCamera(
          cameras().length > 1
            ? "이 카메라에서 화면이 나오지 않아요. 아래에서 다른 카메라를 골라 주세요."
            : "카메라는 열렸지만 화면이 나오지 않아요. 새로고침하고 다시 눌러 주세요.",
        );
        return;
      }
      try {
        detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : undefined;
      } catch {
        detector = undefined;
      }
      if (el.paused) await el.play().catch(() => undefined);
      setCamera("on");
      frame = requestAnimationFrame(drawPreview);
      scan();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      failCamera(
        name === "NotAllowedError" || name === "SecurityError"
          ? "카메라 권한이 막혀 있어요. 브라우저 설정에서 이 사이트의 카메라를 허용하고 다시 눌러 주세요."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "이 기기에서 카메라를 찾지 못했어요."
            : name === "NotReadableError" || name === "AbortError"
              ? "다른 앱이 카메라를 쓰고 있어요. 그 앱을 닫고 다시 눌러 주세요."
              : `카메라를 열지 못했어요${name ? ` (${name})` : ""}. 다시 눌러 주세요.`,
      );
    }
  }

  onSettled(() => stopCamera);

  return (
    <>
      <Title>{`탑승 확인 - 운영 - ${env.VITE_APP_NAME}`}</Title>
      <div class="mx-auto max-w-md">
        <header class="px-1">
          <h1 class="text-3xl font-bold">탑승 확인</h1>
          <p class="mt-2 font-medium text-balance break-keep text-sand-11">
            버스를 고르고 학생의 내 QR을 비춰 주세요. 학생인지 확인하고, 내릴 정류장을 기사님 화면에 보내요.
          </p>
        </header>
        <Errored
          fallback={(_, reset) => (
            <div class="mt-6 px-1">
              <p class="font-semibold">오늘 버스를 불러오지 못했어요.</p>
              <button type="button" class="mt-2 cursor-pointer font-semibold text-amber-11" onClick={reset}>
                다시 불러오기
              </button>
            </div>
          )}
        >
          <Loading fallback={<div class="h-96" />}>
            <Show
              when={data().buses.length > 0}
              fallback={<p class="mt-6 px-1 font-medium break-keep text-sand-11">오늘 밤 운행하는 버스가 없어요.</p>}
            >
              <label class="mt-6 flex flex-col gap-y-1.5">
                <span class="ml-1 text-sm font-semibold text-sand-11">이 단말기가 달린 버스</span>
                <select
                  class="h-13 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
                  onChange={(e) => {
                    setResult(undefined);
                    setParams({ bus: e.currentTarget.value });
                  }}
                >
                  <For each={data().buses} keyed={(item) => item.id}>
                    {(item) => (
                      <option value={item().id} selected={item().id === busId()}>
                        {formatClock(item().departs)} {item().name} · {item().firstStop} 출발
                      </option>
                    )}
                  </For>
                </select>
              </label>
              <Show when={bus()}>
                {(current) => (
                  <p class="mt-2 px-1 text-sm font-medium text-sand-11 tabular-nums">
                    탄 학생 <b class="font-bold text-sand-12">{current().boarded}명</b>
                    <span class="px-1.5 text-sand-10">·</span>
                    탈 예정 {current().load}/{current().capacity}명
                  </p>
                )}
              </Show>
            </Show>
          </Loading>
        </Errored>

        <div class="relative mt-5 aspect-square overflow-hidden rounded-2xl border border-sand-4 bg-sand-3">
          <video
            ref={(el) => (video = el)}
            muted
            playsinline
            aria-label="QR을 비추는 카메라 화면"
            class="absolute inset-0 size-full object-cover"
          />
          <canvas
            ref={(el) => (preview = el)}
            aria-hidden="true"
            class="absolute inset-0 size-full"
            onClick={() => void video?.play().catch(() => undefined)}
          />
          <Show when={camera() === "on"}>
            <span aria-hidden="true" class="absolute inset-[18%] rounded-2xl border-2 border-amber-9" />
          </Show>
          <Show when={camera() !== "on"}>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-y-3 bg-sand-3 px-6 text-center">
              <PhCameraBold aria-hidden="true" class="text-3xl text-sand-11" />
              <p class="font-medium text-balance break-keep text-sand-11">
                {camera() === "error" ? cameraError() : "카메라를 켜면 QR을 자동으로 읽어요."}
              </p>
              <Button
                type="button"
                class="w-40"
                variant={camera() === "starting" ? "loading" : "primary"}
                onClick={() => void startCamera()}
              >
                카메라 켜기
              </Button>
            </div>
          </Show>
        </div>
        <Show when={cameras().length > 1}>
          <label class="mt-3 flex items-center gap-x-3 px-1">
            <span class="shrink-0 text-sm font-semibold text-sand-11">카메라</span>
            <select
              class="h-10 min-w-0 flex-1 cursor-pointer truncate rounded-xl border border-sand-5 bg-sand-2 px-3 font-medium focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
              onChange={(e) => void startCamera(e.currentTarget.value)}
            >
              <For each={cameras()} keyed={(item) => item.id}>
                {(item) => (
                  <option value={item().id} selected={item().id === cameraId()}>
                    {item().label}
                  </option>
                )}
              </For>
            </select>
          </label>
        </Show>

        <div role="status" aria-live="assertive" class="mt-4 min-h-28">
          <Switch>
            <Match when={checking()}>
              <p class="px-1 pt-3 font-semibold text-sand-11">확인하는 중…</p>
            </Match>
            <Match when={result()}>{(current) => <ResultCard result={current()} />}</Match>
          </Switch>
        </div>

        <form
          class="mt-6 flex items-end gap-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = manual().trim();
            if (code) void check(code, true).then(() => setManual(""));
          }}
        >
          <label class="flex min-w-0 flex-1 flex-col gap-y-1.5">
            <span class="ml-1 text-sm font-semibold text-sand-11">QR이 안 읽히면 코드를 직접 넣어요</span>
            <input
              value={manual()}
              autocomplete="off"
              spellcheck="false"
              class="h-13 min-w-0 rounded-xl border border-sand-5 bg-sand-2 px-4 font-mono caret-amber-9 focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
              onInput={(e) => setManual(e.currentTarget.value)}
            />
          </label>
          <Button type="submit" class="w-24 shrink-0" variant={manual().trim() ? "secondary" : "disabled"}>
            확인
          </Button>
        </form>
      </div>
    </>
  );
}

function ResultCard(props: { result: BoardingResult }) {
  return (
    <Show
      when={props.result.ok ? props.result : undefined}
      fallback={
        <div class="rounded-2xl border border-red-7 bg-red-3 px-5 py-4 text-red-11">
          <p class="flex items-center gap-x-2 text-xl font-bold">
            <PhXCircleFill aria-hidden="true" class="shrink-0" />
            탈 수 없어요
          </p>
          <p class="mt-1 font-semibold break-keep">{(props.result as { message: string }).message}</p>
        </div>
      }
    >
      {(ok) => (
        <div class="rounded-2xl border border-green-7 bg-green-3 px-5 py-4">
          <p class="flex items-center gap-x-2 text-xl font-bold text-green-11">
            <PhCheckCircleFill aria-hidden="true" class="shrink-0" />
            {ok().again ? "이미 탄 학생이에요" : "탈 수 있어요"}
          </p>
          <p class="mt-2 text-lg font-bold text-sand-12">
            {ok().name} <span class="text-sm font-semibold text-sand-11">{ok().school}</span>
          </p>
          <p class="mt-0.5 font-medium break-keep text-sand-11 tabular-nums">
            {ok().dropOff ? `${ok().dropOff}에서 내려요` : "내릴 곳을 기사님께 말해 주세요"}
            <Show when={ok().dropOff && ok().walkHome}>{(minutes) => ` · 집까지 걸어서 ${minutes()}분`}</Show>
          </p>
          <Show when={ok().farFromHome}>
            <p class="mt-1 text-sm font-semibold break-keep text-red-11">
              이 버스는 집 가까이 가지 않아요. 집 쪽으로 가는 다른 버스를 안내해 주세요.
            </p>
          </Show>
          <Show when={ok().load > ok().capacity}>
            <p class="mt-1 text-sm font-semibold text-red-11 tabular-nums">
              정원보다 많아요 ({ok().load}/{ok().capacity}명)
            </p>
          </Show>
        </div>
      )}
    </Show>
  );
}
