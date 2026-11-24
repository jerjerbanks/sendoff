import { redirect } from "next/navigation";
import { demoResetAllowed } from "@/lib/demo-flag";
import { resetDemoTrip } from "@/lib/store";

async function reset() {
  if (!demoResetAllowed()) {
    return new Response("Demo reset is off.", { status: 403 });
  }
  await resetDemoTrip();
  redirect("/trip/trip_demo");
}

export function GET() {
  return reset();
}

export function POST() {
  return reset();
}
