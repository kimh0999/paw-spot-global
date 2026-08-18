import { parseVerifiedAt } from "./filtering";

// Info is considered "stale" once the last check is at least this many weeks old.
// Keep this high enough that the warning stays rare — if every place is amber, nothing stands out.
export const STALE_VERIFICATION_WEEKS = 8;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function weeksSinceVerified(
  verifiedAt: string | null,
  referenceDate: Date,
): number | null {
  if (!verifiedAt) return null;
  const diffMs = referenceDate.getTime() - parseVerifiedAt(verifiedAt).getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / MS_PER_WEEK);
}

// verificationMethod arrives already mapped to a stable English label (queries.ts).
// Map it to an i18n subkey so the UI shows a human-readable phrase, not a raw code.
const VERIFICATION_METHOD_KEYS: Record<string, string> = {
  Phone: "phone",
  DM: "dm",
  Website: "website",
  "On-site": "onSite",
  "User report": "userReport",
};

export function verificationMethodKey(method: string | null): string | null {
  if (!method) return null;
  return VERIFICATION_METHOD_KEYS[method] ?? null;
}
