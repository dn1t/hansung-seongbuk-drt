import "server-only";
import Mailgun from "mailgun.js";
import { env } from "virtual:solid-env/server";

import resetPasswordTemplate from "./emails/reset-password.html?raw";
import verificationCodeTemplate from "./emails/verification-code.html?raw";

const mailgun = new Mailgun(FormData).client({ username: "api", key: env.MAILGUN_API_KEY });
const from = `${env.VITE_APP_NAME} <no-reply@${env.MAILGUN_DOMAIN}>`;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(vars[key] ?? ""));
}

export async function sendVerificationCodeEmail(to: string, code: string) {
  await mailgun.messages.create(env.MAILGUN_DOMAIN, {
    from,
    to,
    subject: `${env.VITE_APP_NAME} 인증 코드: ${code}`,
    html: render(verificationCodeTemplate, { code }),
    text: [
      `${env.VITE_APP_NAME} 인증 코드는 ${code} 입니다.`,
      "코드는 10분 동안 유효해요. 요청하지 않았다면 이 메일은 무시해도 돼요.",
    ].join("\n"),
  });
}

export async function sendResetPasswordEmail(to: string, url: string) {
  await mailgun.messages.create(env.MAILGUN_DOMAIN, {
    from,
    to,
    subject: `${env.VITE_APP_NAME} 비밀번호 재설정`,
    html: render(resetPasswordTemplate, { url }),
    text: [
      "아래 주소를 열어 새 비밀번호를 정해 주세요.",
      url,
      "",
      "링크는 1시간 동안 유효해요. 요청하지 않았다면 이 메일은 무시해도 돼요. 비밀번호는 바뀌지 않아요.",
    ].join("\n"),
  });
}
