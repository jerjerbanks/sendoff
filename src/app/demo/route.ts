import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, DEMO_TRIP_ID } from "@/lib/constants";
import { ensureDemoSeed } from "@/lib/store";

export async function GET() {
  await ensureDemoSeed();
  const jar = await cookies();
  jar.set(COOKIE, "user_chris", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  redirect(`/trip/${DEMO_TRIP_ID}`);
}
