import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

const REQUIRED_KEYS = [
  "AUTH_SECRET",
  "TURSO_CONNECTION_URL",
  "TURSO_AUTH_TOKEN",
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "KAKAO_REST_API_KEY",
];
const OPTIONAL_KEYS = ["STAFF_CODE", "ROUTE_TIMES", "WALK_TIMES", "TMAP_APP_KEY", "VITE_APP_NAME", "VITE_KAKAO_JS_KEY"];

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const url = option("url")?.replace(/\/+$/, "");
if (!url || !/^https:\/\/[^/]+$/.test(url)) {
  console.error("배포 주소를 --url로 넣어 주세요. 예: --url https://hansung-drt.example.deno.net");
  process.exit(1);
}
const file = option("env") ?? ".env";
if (!existsSync(file)) {
  console.error(`${file} 파일이 없어요.`);
  process.exit(1);
}
const source = parseEnv(readFileSync(file, "utf8"));

const values: Record<string, string> = { BASE_URL: url, TRUSTED_ORIGINS: url };
for (const key of [...REQUIRED_KEYS, ...OPTIONAL_KEYS]) if (source[key]) values[key] = source[key];

const missing = REQUIRED_KEYS.filter((key) => !values[key]);
if (missing.length > 0) {
  console.error(`${file}에 ${missing.join(", ")}이 없어요.`);
  process.exit(1);
}
if ((values.STAFF_CODE ?? "").length < 8) {
  console.warn("STAFF_CODE가 비었거나 8자보다 짧아요. 운영자 화면은 인터넷에 열리니 길고 추측하기 어려운 값을 권해요.");
}
if (source.DEMO_TIME) console.log(`${file}의 DEMO_TIME(${source.DEMO_TIME})은 배포에 넣지 않아요.`);

const dir = mkdtempSync(join(tmpdir(), "deno-env-"));
const envFile = join(dir, ".env");
writeFileSync(
  envFile,
  Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n"),
  { mode: 0o600 },
);

const target = ["org", "app"].flatMap((name) => {
  const value = option(name);
  return value ? [`--${name}`, value] : [];
});
console.log(`${file}에서 ${Object.keys(values).join(", ")}을 Deno Deploy에 올려요.`);
const result = spawnSync("deno", ["deploy", "env", "load", "--replace", ...target, envFile], { stdio: "inherit" });
rmSync(dir, { recursive: true, force: true });
if (result.status === 0) {
  console.log("값은 다음 배포부터 적용돼요. VITE_ 값은 빌드할 때 들어가니 pnpm deno:deploy로 다시 배포해 주세요.");
}
process.exit(result.status ?? 1);
