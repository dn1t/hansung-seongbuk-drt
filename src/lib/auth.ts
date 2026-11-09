import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";

import { joinFlow } from "./auth-join";
import { db } from "./db";
import { isValidPassword } from "./password";
import * as schema from "./schema";
import { VERIFICATION_CODE_TTL } from "./schools";
import env from "./server-env";

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  baseURL: env.BASE_URL,
  trustedOrigins: (env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  database: drizzleAdapter(db, { provider: "sqlite", schema, usePlural: true }),
  rateLimit: { enabled: true, storage: "database" },
  advanced: { database: { joins: true }, ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      const { sendResetPasswordEmail } = await import("../server/mail");
      await sendResetPasswordEmail(user.email, url);
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/reset-password") return;
      if (!isValidPassword(String(ctx.body?.newPassword ?? ""))) {
        throw new APIError("BAD_REQUEST", { code: "WEAK_PASSWORD", message: "비밀번호 조건을 확인해 주세요." });
      }
    }),
  },
  user: {
    additionalFields: {
      homeAddress: { type: "string", required: false, input: false, returned: false },
      homeAddressDetail: { type: "string", required: false, input: false, returned: false },
      homeLat: { type: "number", required: false, input: false, returned: false },
      homeLng: { type: "number", required: false, input: false, returned: false },
    },
  },
  plugins: [
    joinFlow(),
    emailOTP({
      expiresIn: VERIFICATION_CODE_TTL,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in" && type !== "email-verification") {
          throw new Error(`email-otp: "${type}" 메일은 아직 지원하지 않아요.`);
        }
        const { sendVerificationCodeEmail } = await import("../server/mail");
        await sendVerificationCodeEmail(email, otp);
      },
    }),
  ],
});
