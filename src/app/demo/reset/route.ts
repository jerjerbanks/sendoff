import { redirect } from "next/navigation";
import { DEMO_TRIP_ID } from "@/lib/constants";
import { demoResetAllowed } from "@/lib/demo-flag";
import { resetDemoTrip } from "@/lib/store";

async function reset() {
  if (!demoResetAllowed()) {
    return new Response("Demo reset is off.", { status: 403 });
  }
  await resetDemoTrip();
  redirect(`/trip/${DEMO_TRIP_ID}`);
}

export function GET() {
  return reset();
}

export function POST() {
  return reset();
}
