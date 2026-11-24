import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE } from "@/lib/constants";
import { DEMO_STEP_COOKIE, tourStep } from "@/lib/demo-tour";
import { ensureDemoSeed, prepareTourStep } from "@/lib/store";

/** Each tour step sets up the demo trip, signs you in as that step's person, and opens its screen. */
export async function GET(_request: Request, context: { params: Promise<{ step: string }> }) {
  const { step: raw } = await context.params;
  const step = tourStep(Number(raw));
  if (!step) redirect("/demo/1");
  await ensureDemoSeed();
  await prepareTourStep(step.n);
  const jar = await cookies();
  const year = 60 * 60 * 24 * 400;
  jar.set(COOKIE, step.userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: year });
  jar.set(DEMO_STEP_COOKIE, String(step.n), { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  redirect(step.path);
}
