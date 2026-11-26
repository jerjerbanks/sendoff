/**
 * What someone pastes into "Join with an invite code": the bare code the organizer
 * reads out ("Invite code aB3x9Qk_z1Lm"), or the whole invite link from the group chat,
 * with or without the ?who=1 the share sheet adds. Returns the invite token, or null
 * when the text can't be one (then no database lookup happens).
 */
export function inviteTokenFrom(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  const marker = value.indexOf("/join/");
  if (marker >= 0) value = value.slice(marker + "/join/".length);
  value = value.split(/[?#/\s]/)[0] ?? "";
  return /^[A-Za-z0-9_-]{6,64}$/.test(value) ? value : null;
}
