/**
 * Short names for people in one trip. Everyone goes by their first word ("Chris"),
 * unless two different people share it ("Audit Alex", "Audit Blake"); then both keep
 * their full name so chips, tabs and dropdowns never show the same label twice.
 */
export function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

const key = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export function shortNamer(names: Iterable<string>): (name: string) => string {
  const fullsByFirst = new Map<string, Set<string>>();
  for (const name of names) {
    if (!name || !name.trim()) continue;
    const first = key(firstWord(name));
    const set = fullsByFirst.get(first) ?? new Set<string>();
    set.add(key(name));
    fullsByFirst.set(first, set);
  }
  return (name: string) => {
    const first = firstWord(name);
    return (fullsByFirst.get(key(first))?.size ?? 0) > 1 ? name.trim().replace(/\s+/g, " ") : first;
  };
}

/**
 * Party labels that never repeat. A party keeps its name unless another party has the same one;
 * then each of those shows its payer's full name instead (falling back to "Name · Payer").
 */
export function distinctPartyNames<T extends { name: string; payerName: string }>(parties: T[]): string[] {
  const count = new Map<string, number>();
  for (const party of parties) count.set(key(party.name), (count.get(key(party.name)) ?? 0) + 1);
  const first = parties.map((party) => ((count.get(key(party.name)) ?? 0) > 1 ? party.payerName.trim() || party.name : party.name));
  const again = new Map<string, number>();
  for (const name of first) again.set(key(name), (again.get(key(name)) ?? 0) + 1);
  return first.map((name, index) => ((again.get(key(name)) ?? 0) > 1 ? `${parties[index]!.name} · ${parties[index]!.payerName}` : name));
}
