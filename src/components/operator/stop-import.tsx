import { createSignal, For, Show } from "solid-js";

import { IMPORT_BATCH_MAX, importStops } from "../../lib/operator";
import { readStopFile } from "../../lib/stop-file";
import { Button } from "../common/button";
import { SectionRule } from "../layout/screen";

const RADII = [5, 8, 12];

type Status = { kind: "saved" | "error" | "progress"; text: string };

export function StopImport() {
  const [file, setFile] = createSignal<File>();
  const [radius, setRadius] = createSignal(8);
  const [busy, setBusy] = createSignal(false);
  const [status, setStatus] = createSignal<Status>();
  let picker: HTMLInputElement | undefined;

  async function run() {
    const picked = file();
    if (!picked) return;
    setBusy(true);
    setStatus({ kind: "progress", text: "파일을 읽는 중…" });
    try {
      const parsed = await readStopFile(await picked.arrayBuffer());
      if (!parsed.ok) throw new Error(parsed.message);
      let added = 0;
      let skipped = parsed.ignored;
      for (let i = 0; i < parsed.stops.length; i += IMPORT_BATCH_MAX) {
        setStatus({
          kind: "progress",
          text: `${parsed.stops.length.toLocaleString()}곳 중 ${i.toLocaleString()}곳 확인했어요…`,
        });
        const result = await importStops({ rows: parsed.stops.slice(i, i + IMPORT_BATCH_MAX), radiusKm: radius() });
        if (!result.ok) throw new Error(result.message);
        added += result.added;
        skipped += result.skipped;
      }
      setStatus({
        kind: "saved",
        text: `${added.toLocaleString()}곳을 넣었어요. ${skipped.toLocaleString()}곳은 범위 밖이거나, 이미 있거나, 버스가 설 수 없는 곳이라 건너뛰었어요.`,
      });
      setFile(undefined);
      if (picker) picker.value = "";
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "넣지 못했어요. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section class="mt-12">
      <SectionRule title="파일로 한꺼번에 넣기" />
      <p class="mt-3 px-1 text-sm font-medium text-balance break-keep text-sand-11">
        서울 열린데이터광장의 ‘서울시 버스정류소 위치정보’ 엑셀(xlsx)이나 CSV 파일을 올리면, 학교들에서 고른 거리 안의
        정류장만 넣어요. 이미 넣은 정류장은 지우지 않고 그대로 둬요. 이름이 같고 150m 안에 있는 정류장, 도로 가운데
        중앙차로 정류장, 한강버스 선착장은 건너뛰어요.
      </p>
      <form
        class="mt-4 flex flex-col gap-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label class="flex flex-col gap-y-1.5">
          <span class="ml-1 text-sm font-semibold text-sand-11">엑셀이나 CSV 파일</span>
          <input
            ref={(el) => (picker = el)}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 py-3 text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sand-4 file:px-3 file:py-1.5 file:font-semibold file:text-sand-12"
            onChange={(e) => {
              setStatus(undefined);
              setFile(e.currentTarget.files?.[0]);
            }}
          />
        </label>
        <label class="flex flex-col gap-y-1.5">
          <span class="ml-1 text-sm font-semibold text-sand-11">학교들에서 이 거리 안</span>
          <select
            class="h-13 cursor-pointer rounded-xl border border-sand-5 bg-sand-2 px-4 text-lg tabular-nums focus:border-amber-8 focus:ring-2 focus:ring-amber-5 focus:outline-none"
            onChange={(e) => setRadius(Number(e.currentTarget.value))}
          >
            <For each={RADII}>
              {(km) => (
                <option value={km} selected={km === radius()}>
                  {km}km
                </option>
              )}
            </For>
          </select>
        </label>
        <Show when={status()}>
          {(current) => (
            <p
              role="status"
              class={[
                "px-1 font-semibold break-keep",
                current().kind === "saved" && "text-green-11",
                current().kind === "error" && "text-red-11",
                current().kind === "progress" && "text-sand-11",
              ]}
            >
              {current().text}
            </p>
          )}
        </Show>
        <Button type="submit" class="mt-1" variant={busy() ? "loading" : file() ? "secondary" : "disabled"}>
          파일에서 넣기
        </Button>
      </form>
    </section>
  );
}
