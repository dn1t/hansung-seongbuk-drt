import { query } from "@solidjs/router";
import { getRequestEvent } from "@solidjs/web";
import { eq } from "drizzle-orm";

import { auth } from "./auth";
import { db } from "./db";
import { users } from "./schema";
import { schoolOf } from "./schools";

export interface Profile {
  id: string;
  name: string;
  email: string;
  school: string | undefined;
  homeAddress: string | null;
  homeAddressDetail: string | null;
}

export async function requireUserId() {
  "use server";
  const headers = getRequestEvent()?.request.headers;
  const session = headers ? await auth.api.getSession({ headers }) : null;
  if (!session) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  return session.user.id;
}

export const getProfile = query(async (): Promise<Profile> => {
  "use server";
  const id = await requireUserId();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) throw new Error("계정을 찾지 못했어요. 다시 로그인해 주세요.");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    school: schoolOf(user.email),
    homeAddress: user.homeAddress,
    homeAddressDetail: user.homeAddressDetail,
  };
}, "profile");
