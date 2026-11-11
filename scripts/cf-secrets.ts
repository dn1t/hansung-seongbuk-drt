import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const SERVER_KEYS = [
  "AUTH_SECRET",
  "TURSO_CONNECTION_URL",
  "TURSO_AUTH_TOKEN",
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "KAKAO_REST_API_KEY",
  "STAFF_CODE",
  "ROUTE_TIMES",
  "WALK_TIMES",
  "TMAP_APP_KEY",
];

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const url = option("url")?.replace(/\/+$/, "");
if (url !== undefined && !/^https:\/\/[^/]+$/.test(url)) {
  console.error("배포 주소는 https://로 시작하게 넣어 주세요. 예: --url https://hansung-drt.example.workers.dev");
  process.exit(1);
}
const file = option("env") ?? ".env";
if (!existsSync(file)) {
  console.error(`${file} 파일이 없어요.`);
  process.exit(1);
}
const source = parseEnv(readFileSync(file, "utf8"));

const secrets: Record<string, string> = { DEMO_TIME: "", ...(url ? { BASE_URL: url, TRUSTED_ORIGINS: url } : {}) };
for (const key of SERVER_KEYS) if (source[key]) secrets[key] = source[key];

const missing = [
  "AUTH_SECRET",
  "TURSO_CONNECTION_URL",
  "TURSO_AUTH_TOKEN",
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "KAKAO_REST_API_KEY",
].filter((key) => !secrets[key]);
if (missing.length > 0) {
  console.error(`${file}에 ${missing.join(", ")}이 없어요.`);
  process.exit(1);
}
if ((secrets.STAFF_CODE ?? "").length < 8) {
  console.warn("STAFF_CODE가 비었거나 8자보다 짧아요. 운영자 화면은 인터넷에 열리니 길고 추측하기 어려운 값을 권해요.");
}
if (source.DEMO_TIME) console.log(`${file}의 DEMO_TIME(${source.DEMO_TIME})은 배포에 넣지 않아요.`);

console.log(`${file}에서 ${Object.keys(secrets).join(", ")}을 Cloudflare에 올려요.`);
const result = spawnSync("npx", ["wrangler", "secret", "bulk"], {
  input: JSON.stringify(secrets),
  stdio: ["pipe", "inherit", "inherit"],
});
if (result.status === 0 && !url) {
  console.log("배포 주소 없이 올렸어요. pnpm cf:deploy로 주소가 나오면 --url을 붙여 한 번 더 실행해 주세요.");
}
process.exit(result.status ?? 1);
