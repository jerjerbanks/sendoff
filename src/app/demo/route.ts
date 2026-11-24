import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, DEMO_TRIP_ID, LAKE_TRIP_ID } from "@/lib/constants";
import { ensureDemoSeed } from "@/lib/store";

/** /demo opens the pre-wedding fixture as Chris; /demo?trip=trip_lake opens the family fixture as Maya. */
export async function GET(request: Request) {
  await ensureDemoSeed();
  const lake = new URL(request.url).searchParams.get("trip") === LAKE_TRIP_ID;
  const jar = await cookies();
  jar.set(COOKIE, lake ? "user_maya" : "user_chris", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  redirect(`/trip/${lake ? LAKE_TRIP_ID : DEMO_TRIP_ID}`);
}
