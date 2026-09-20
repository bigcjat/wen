// Recursive favicon resolver for validator domains and subdomains

const MULTI_PART_TLDS = new Set([
  'edu.au', 'ac.cy', 'co.uk', 'org.uk', 'ac.uk', 'com.au', 'net.au', 'gov.uk', 'ac.nz'
]);

/**
 * Break down a hostname from subdomain down to apex domain.
 * e.g. "shadow.haas.berkeley.edu" -> ["shadow.haas.berkeley.edu", "haas.berkeley.edu", "berkeley.edu"]
 */
export function getDomainHierarchy(hostname: string): string[] {
  if (!hostname || hostname.length < 3) return [];
  const cleanHost = hostname.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0];
  const parts = cleanHost.split('.');
  const hierarchy: string[] = [];

  while (parts.length >= 2) {
    const candidate = parts.join('.');
    const suffixCheck = parts.slice(-2).join('.');
    // Don't strip past a multi-part TLD like .edu.au or .ac.cy
    if (parts.length === 2 && MULTI_PART_TLDS.has(suffixCheck)) {
      break;
    }
    hierarchy.push(candidate);
    parts.shift();
  }

  return hierarchy;
}

/**
 * Get primary favicon candidate URL.
 * Google's Favicon API handles nested subdomains well, but falling back through
 * the hierarchy on the img element ensures 100% resolution.
 */
export function getFaviconCandidates(hostname: string): string[] {
  const hierarchy = getDomainHierarchy(hostname);
  const candidates: string[] = [];

  // 1. Google Favicon API for the exact host (high resolution 128px)
  if (hierarchy[0]) {
    candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hierarchy[0])}&sz=128`);
  }

  // 2. Google Favicon API for apex/parent domains
  for (let i = 1; i < hierarchy.length; i++) {
    candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hierarchy[i])}&sz=128`);
  }

  // 3. DuckDuckGo icon resolver for apex domain
  if (hierarchy.length > 0) {
    const apex = hierarchy[hierarchy.length - 1];
    candidates.push(`https://icons.duckduckgo.com/ip3/${apex}.ico`);
  }

  return candidates;
}

/**
 * Inline SVG monogram fallback in case of completely unreachable or unhosted domain
 */
export function getFallbackMonogram(text: string): string {
  const clean = text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'XR';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <rect width="64" height="64" rx="16" fill="#1e293b"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#00f0ff">${clean}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
