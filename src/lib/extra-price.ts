import { money } from "./format";
import { ageBandLabel } from "./labels";

type Band = "adult" | "teen" | "child" | "infant";

const whole = (cents: number) => money(cents).replace(/\.00$/, "");

/**
 * The price line for an optional extra, so voters and payers see what it costs a person.
 * Age prices win ("Adult $60 · Child $30"). Otherwise the total splits among who's in:
 * "$45 a person" when it divides evenly, "about $X a person" when it doesn't.
 */
export function extraPriceLine(cost: {
  amountCents: number;
  agePrices: Partial<Record<Band, number | null>> | null;
  goingCount: number;
}): string {
  const prices = cost.agePrices;
  if (prices) {
    return (["adult", "teen", "child", "infant"] as const)
      .filter((band) => prices[band] != null)
      .map((band) => `${ageBandLabel(band)} ${whole(prices[band] ?? 0)}`)
      .join(" · ");
  }
  if (cost.amountCents === 0) return "Free";
  if (cost.goingCount <= 0) return `${whole(cost.amountCents)} split among who's in`;
  const each = cost.amountCents / cost.goingCount;
  if (Number.isInteger(each) && each % 100 === 0) return `${whole(each)} a person`;
  return `about ${whole(Math.ceil(each / 100) * 100)} a person`;
}
