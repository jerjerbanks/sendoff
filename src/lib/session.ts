import { cookies } from "next/headers";
import { cache } from "react";
import { COOKIE } from "./constants";

export const getViewerId = cache(async () => {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
});

export async function setViewerCookie(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}
