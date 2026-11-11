import "server-only";
import { env } from "virtual:solid-env/server";

import bookingOpenTemplate from "./emails/booking-open.html?raw";
import resetPasswordTemplate from "./emails/reset-password.html?raw";
import verificationCodeTemplate from "./emails/verification-code.html?raw";

const from = `${env.VITE_APP_NAME} <no-reply@${env.MAILGUN_DOMAIN}>`;

interface Message {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  "recipient-variables"?: string;
}

async function send(message: Message) {
  const body = new FormData();
  for (const [key, value] of Object.entries(message)) {
    for (const item of Array.isArray(value) ? value : [value]) body.append(key, item);
  }
  const response = await fetch(`https://api.mailgun.net/v3/${encodeURIComponent(env.MAILGUN_DOMAIN)}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}` },
    body,
  });
  if (!response.ok) throw new Error(`mailgun ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(vars[key] ?? ""));
}

export async function sendVerificationCodeEmail(to: string, code: string) {
  await send({
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
  await send({
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

const BATCH_SIZE = 1000;

export async function sendBookingOpenEmail(recipients: string[], nights: string, url: string) {
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await send({
      from,
      to: batch,
      subject: `${env.VITE_APP_NAME} 사전 신청이 열렸어요`,
      html: render(bookingOpenTemplate, { nights, url }),
      text: [`${nights} 운행해요. 지금 사전 신청할 수 있어요.`, url].join("\n"),
      "recipient-variables": JSON.stringify(Object.fromEntries(batch.map((email) => [email, {}]))),
    });
  }
}
