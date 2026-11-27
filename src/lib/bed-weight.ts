/**
 * The default price weight of a bed, matching the copy on Rooms and beds:
 * king or queen with a private bath 1.5, private room 1.25, full or a bed in a shared room 1.0,
 * twin or bunk 0.8, sofa bed 0.6, couch or air mattress 0.5.
 */
export function defaultBedWeight(bedType: string, options: { privateBath?: boolean; privateRoom?: boolean } = {}): number {
  switch (bedType) {
    case "twin":
    case "bunk":
      return 0.8;
    case "sofa_bed":
      return 0.6;
    case "couch":
    case "air_mattress":
      return 0.5;
    case "king":
    case "queen":
      if (options.privateBath) return 1.5;
      return options.privateRoom ? 1.25 : 1;
    default:
      return options.privateRoom ? 1.25 : 1;
  }
}
