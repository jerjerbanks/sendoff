import { redirect } from "next/navigation";
import { LAKE_TRIP_ID } from "@/lib/constants";

/** /demo starts the guided tour. The old family-demo link lands on the family step. */
export async function GET(request: Request) {
  const lake = new URL(request.url).searchParams.get("trip") === LAKE_TRIP_ID;
  redirect(lake ? "/demo/7" : "/demo/1");
}
