import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_STEP_COOKIE, tourStep } from "@/lib/demo-tour";
import { startSession } from "@/lib/session";
import { ensureDemoSeed, prepareTourStep } from "@/lib/store";

/** Each tour step sets up the demo trip, signs you in as that step's person, and opens its screen. */
export async function GET(_request: Request, context: { params: Promise<{ step: string }> }) {
  const { step: raw } = await context.params;
  const step = tourStep(Number(raw));
  if (!step) redirect("/demo/1");
  await ensureDemoSeed();
  await prepareTourStep(step.stage);
  // A demo person only. The demo trips are the only place anyone can be someone else.
  await startSession(step.userId, { demo: true });
  const jar = await cookies();
  jar.set(DEMO_STEP_COOKIE, String(step.n), { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  redirect(step.path);
}
