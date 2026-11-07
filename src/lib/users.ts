import { formAction, query } from "@solidjs/router";

import { findUser, listUsers, updateUser } from "../server/db";
import { clearSession, getSession, setSession } from "../server/session";

export const getUsers = query(async () => {
  "use server";
  return listUsers();
}, "users");

export const getUser = query(async (id: string) => {
  "use server";
  return findUser(id) ?? { name: "Unknown", title: "No such user" };
}, "user");

export const getCurrentUser = query(async () => {
  "use server";
  const userId = (await getSession())?.userId;
  const user = userId ? findUser(userId) : undefined;
  return user ? { id: userId!, ...user } : null;
}, "current-user");

export const login = formAction(async (formData: FormData) => {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!findUser(id)) throw new Error(`No user "${id}"`);
  await setSession({ userId: id });
});

export const logout = formAction(async () => {
  "use server";
  await clearSession();
});

export const renameUser = formAction(async (id: string, formData: FormData) => {
  "use server";
  if (!(await getSession())?.userId) throw new Error("Sign in to rename users");
  updateUser(id, { name: String(formData.get("name") ?? "") });
});
