const KNOWN_CLIENT_PARTNERS = ['Rejna', 'Saurav', 'Aakib', 'Gaurav', 'Preeti', 'Sheena', 'Vikram'] as const;

/**
 * Normalizes a raw clientPartner string (e.g. "Rejna Balan", "rejna balan", "Saurav Tiwari")
 * into its canonical partner name (e.g. "Rejna", "Saurav") using a case-insensitive
 * `contains` check. Returns the trimmed original string if no known partner matches,
 * or "Unassigned" if empty.
 */
export function normalizeClientPartner(raw?: string | null): string {
  if (!raw || !raw.trim()) return 'Unassigned';
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  for (const canonical of KNOWN_CLIENT_PARTNERS) {
    if (lower.includes(canonical.toLowerCase())) {
      return canonical;
    }
  }

  return trimmed;
}

/**
 * Checks whether a participant's clientPartner matches a target partner / currentUser
 * using a case-insensitive `contains` condition.
 */
export function matchesClientPartner(participantPartner?: string | null, targetPartner?: string | null): boolean {
  if (!participantPartner || !targetPartner) return false;
  const pLower = participantPartner.trim().toLowerCase();
  const tLower = targetPartner.trim().toLowerCase();
  if (!pLower || !tLower) return false;

  return pLower.includes(tLower) || tLower.includes(pLower);
}
