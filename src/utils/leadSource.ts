const CANONICAL_LEAD_SOURCES: Record<string, string> = {
  'self created': 'Self Created',
  'self-created': 'Self Created',
  'selfcreated': 'Self Created',
  'google ads': 'Google Ads',
  'facebook ads': 'Facebook Ads',
  'youtube ads': 'Youtube Ads',
  'whatsapp marketing': 'Whatsapp Marketing',
  'chatgpt ads': 'ChatGPT Ads',
  'form submission': 'Form Submission',
  'erickson global': 'Erickson Global',
  'webinar leads': 'Webinar Leads',
  'referrals': 'Referrals',
  'referral': 'Referrals',
  'direct': 'Direct',
  'linkedin': 'LinkedIn',
  'website': 'Website',
};

/**
 * Normalizes a raw leadSource string (e.g. "Self created", "self-created", "Google ads")
 * into a canonical, case-consistent label (e.g. "Self Created", "Google Ads").
 */
export function normalizeLeadSource(raw?: string | null, fallback = ''): string {
  if (!raw || !raw.trim()) return fallback;
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  const key = collapsed.toLowerCase();

  if (CANONICAL_LEAD_SOURCES[key]) {
    return CANONICAL_LEAD_SOURCES[key];
  }

  return collapsed.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Case-insensitive & normalization-aware comparison for leadSource values.
 */
export function matchesLeadSource(sourceA?: string | null, sourceB?: string | null): boolean {
  if (!sourceA || !sourceB) return false;
  return normalizeLeadSource(sourceA).toLowerCase() === normalizeLeadSource(sourceB).toLowerCase();
}
