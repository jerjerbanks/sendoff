"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieValue, adminKey, sameSecret } from "@/lib/admin";
import { withinLimit } from "@/lib/limit-check";

/** Check the admin key (5 tries a minute per IP) and keep only its hash in a cookie. */
export async function adminSignInAction(formData: FormData) {
  const key = adminKey();
  if (!key) redirect("/");
  if (!(await withinLimit("admin"))) redirect("/admin?error=wait");
  const given = String(formData.get("key") ?? "").trim().slice(0, 200);
  if (!sameSecret(given, key)) redirect("/admin?error=key");
  (await cookies()).set(ADMIN_COOKIE, adminCookieValue(key), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  redirect("/admin");
}

export async function adminSignOutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}
