import type { RawAmendment, DetailedAmendment, EnrichedValidator, CommunityVoteStats } from '../types';

const API_BASE = 'https://api.xrpscan.com/api/v1';

/**
 * Resolves the official XRPL documentation anchor on xrpl.org dynamically.
 * Zero hardcoding: uses the predictable anchor on xrpl.org/resources/known-amendments.
 */
export function getXlsUrl(amendment: RawAmendment): string {
  if (amendment.xls_url) return amendment.xls_url;
  const anchor = encodeURIComponent(amendment.name.toLowerCase());
  return `https://xrpl.org/resources/known-amendments#${anchor}`;
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Filter amendments:
 * 1. Retain amendments currently in voting
 * 2. Retain amendments activated within the last 48 hours (with celebratory flag)
 * 3. Exclude permanently deprecated, unsupported, and older superseded revisions
 */
export function filterActiveVotingAmendments(all: RawAmendment[]): RawAmendment[] {
  const activeCandidates = all.filter((a) => {
    if (a.deprecated === true) return false;
    if (a.supported === false) return false;

    // Check if activated within the last 48 hours
    if (a.enabled) {
      if (a.enabled_on) {
        const activatedTime = new Date(a.enabled_on).getTime();
        const elapsed = Date.now() - activatedTime;
        if (elapsed >= 0 && elapsed <= FORTY_EIGHT_HOURS_MS) {
          a.isJustActivated = true;
          return true; // Keep for 48 hours!
        }
      }
      return false; // Older than 48h
    }

    return true; // Still in voting
  });

  const candidateNames = new Set(activeCandidates.map((a) => a.name));

  // Filter out unversioned versions when a V1_1 exists
  return activeCandidates.filter((a) => {
    const hasNewer = candidateNames.has(`${a.name}V1_1`);
    return !hasNewer;
  });
}

/**
 * Fetch all amendments from XRPSCAN API
 */
export async function fetchAllAmendments(): Promise<RawAmendment[]> {
  const resp = await fetch(`${API_BASE}/amendments`, {
    headers: { Accept: 'application/json' }
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch live amendments from XRPScan API (HTTP ${resp.status})`);
  }
  const data: RawAmendment[] = await resp.json();
  const filtered = filterActiveVotingAmendments(data);
  if (!filtered || filtered.length === 0) {
    throw new Error('No active voting amendments returned from live XRPScan API');
  }
  return filtered;
}

let cachedDescriptions: Record<string, string> | null = null;

function cleanShortDescription(rawText: string): string {
  let text = rawText
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[\]/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // If text starts with "This amendment is a collection of fixes...", condense cleanly
  if (text.startsWith('This amendment is a collection of fixes')) {
    const colonIdx = text.indexOf(':');
    if (colonIdx !== -1) {
      return text.slice(0, colonIdx) + '.';
    }
  }

  // Extract up to the first 1-2 concise sentences (under ~180 characters)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let short = sentences[0] || text;
  if (short.length < 90 && sentences.length > 1) {
    short += ' ' + sentences[1];
  }
  return short.trim();
}

/**
 * Dynamically fetches and parses official amendment descriptions from XRPLF known-amendments.md.
 */
export async function fetchAmendmentDescriptions(): Promise<Record<string, string>> {
  if (cachedDescriptions) return cachedDescriptions;
  try {
    const resp = await fetch('https://raw.githubusercontent.com/XRPLF/xrpl-dev-portal/master/resources/known-amendments.md');
    if (!resp.ok) return {};
    const md = await resp.text();
    const descriptions: Record<string, string> = {};
    const sections = md.split(/^###\s+/m);

    for (const sec of sections.slice(1)) {
      const firstLine = sec.split('\n')[0].trim();
      const name = firstLine.split(/\s+/)[0];
      const parts = sec.split(/\|\s*\n\s*\n/);
      if (parts.length > 1) {
        let text = parts[1].trim();
        text = text.split(/\n###|\n##/)[0].trim();
        const short = cleanShortDescription(text);
        if (short) {
          descriptions[name] = short;
        }
      }
    }
    cachedDescriptions = descriptions;
    return descriptions;
  } catch (err) {
    console.warn('Could not load dynamic amendment descriptions from xrpl-dev-portal', err);
    return {};
  }
}

/**
 * Fetch detailed amendment vote status
 */
export interface ValidatorRegistryEntry {
  master_key: string;
  chain?: string;
  domain?: string;
  domain_legacy?: string;
  server_version?: {
    version?: string;
    version_full?: string;
  };
  unl?: string[];
  votes?: {
    amendments?: string[];
    base_fee?: number;
    reserve_base?: number;
    reserve_inc?: number;
  };
  meta?: {
    verified?: boolean;
    verification_message?: string;
  };
}

export interface NodeEntry {
  public_key?: string;
  server_version?: string;
  version?: string;
  country?: string;
  ip?: string;
  port?: number;
  uptime?: number;
  last_seen?: string;
}

export interface VersionStats {
  requiredVersion: string;
  totalValidators: number;
  updatedValidators: number;
  totalUnl: number;
  updatedUnl: number;
  outdatedUnl: number;
  totalNodes: number;
  updatedNodes: number;
}

let cachedRegistry: ValidatorRegistryEntry[] | null = null;
let cachedNodes: NodeEntry[] | null = null;

export async function fetchValidatorRegistry(): Promise<ValidatorRegistryEntry[]> {
  if (cachedRegistry) return cachedRegistry;
  const resp = await fetch(`${API_BASE}/validatorregistry`, {
    headers: { Accept: 'application/json' }
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch live validator registry from XRPScan API (HTTP ${resp.status})`);
  }
  const data: ValidatorRegistryEntry[] = await resp.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Live validator registry returned empty dataset');
  }
  cachedRegistry = data;
  return data;
}

export async function fetchNodes(): Promise<NodeEntry[]> {
  if (cachedNodes) return cachedNodes;
  const resp = await fetch(`${API_BASE}/nodes`, {
    headers: { Accept: 'application/json' }
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch live network nodes from XRPScan API (HTTP ${resp.status})`);
  }
  const data: NodeEntry[] = await resp.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Live nodes crawler returned empty dataset');
  }
  cachedNodes = data;
  return data;
}

export function isVersionAtLeast(actual: string, required: string): boolean {
  if (!actual) return false;
  if (!required) return true;
  const parse = (v: string) =>
    v
      .replace(/^xrpld-|^rippled-/, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const a = parse(actual);
  const r = parse(required);

  for (let i = 0; i < 3; i++) {
    const numA = a[i] ?? 0;
    const numR = r[i] ?? 0;
    if (numA > numR) return true;
    if (numA < numR) return false;
  }
  return true;
}

export async function calculateVersionStats(requiredVersion = '3.3.0'): Promise<VersionStats> {
  const [registry, nodes] = await Promise.all([
    fetchValidatorRegistry(),
    fetchNodes()
  ]);

  if (!nodes || nodes.length === 0) {
    throw new Error('Node telemetry unavailable from network API');
  }
  if (!registry || registry.length === 0) {
    throw new Error('Validator registry unavailable from network API');
  }

  // Node calculation directly from live API
  const totalNodes = nodes.length;
  let updatedNodes = 0;
  nodes.forEach((n) => {
    const ver = n.server_version || n.version || '';
    if (isVersionAtLeast(ver, requiredVersion)) {
      updatedNodes++;
    }
  });

  // Validator calculation directly from live API
  const totalValidators = registry.length;
  let updatedValidators = 0;

  const unlValidators = registry.filter((v) => v.unl && v.unl.length > 0);
  const totalUnl = unlValidators.length;
  if (totalUnl === 0) {
    throw new Error('UNL consensus validators not found in live registry');
  }
  let updatedUnl = 0;

  registry.forEach((v) => {
    const ver = v.server_version?.version || '';
    if (isVersionAtLeast(ver, requiredVersion)) {
      updatedValidators++;
    }
  });

  unlValidators.forEach((v) => {
    const ver = v.server_version?.version || '';
    if (isVersionAtLeast(ver, requiredVersion)) {
      updatedUnl++;
    }
  });

  return {
    requiredVersion,
    totalValidators,
    updatedValidators,
    totalUnl,
    updatedUnl,
    outdatedUnl: Math.max(0, totalUnl - updatedUnl),
    totalNodes,
    updatedNodes
  };
}

export async function fetchAmendmentDetails(name: string): Promise<DetailedAmendment> {
  const resp = await fetch(`${API_BASE}/amendment/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/json' }
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch live voting details for ${name} (HTTP ${resp.status})`);
  }
  const data: DetailedAmendment = await resp.json();
  return data;
}

/**
 * Computes non-UNL community validator vote support for a given amendment ID.
 * Analyzes active independent validators casting validation votes outside the official UNL.
 */
export function computeCommunityVotes(
  amendmentId: string, 
  registry: ValidatorRegistryEntry[],
  domainOnly: boolean = true
): CommunityVoteStats {
  // Filter for Mainnet non-UNL community validators (matching XRPScan's 183 total - 35 UNL = 148 community)
  const mainnetCommunity = registry.filter(
    (v) => (v.chain == null || v.chain === 'main') && (!v.unl || v.unl.length === 0)
  );

  const domainOnlyValidators = mainnetCommunity.filter((v) => Boolean(v.domain || v.domain_legacy));
  const domainOnlyCount = domainOnlyValidators.length;
  const allNodesCount = mainnetCommunity.length;

  const targetList = domainOnly ? domainOnlyValidators : mainnetCommunity;

  const validators: EnrichedValidator[] = targetList.map((v) => {
    const isYea = v.votes?.amendments?.includes(amendmentId) ?? false;
    const rawDomain = v.domain || v.domain_legacy;
    const domain = rawDomain || v.master_key || 'Anonymous Validator';
    return {
      key: v.master_key || domain,
      domain,
      status: isYea ? 'YEA' : 'NAY',
      faviconUrl: rawDomain || '',
      isUnl: false,
      version: v.server_version?.version
    };
  });

  // Sort YEA first, then alphabetically by domain
  validators.sort((a, b) => {
    if (a.status === 'YEA' && b.status !== 'YEA') return -1;
    if (a.status !== 'YEA' && b.status === 'YEA') return 1;
    return a.domain.localeCompare(b.domain);
  });

  const yea = validators.filter((v) => v.status === 'YEA').length;
  const total = validators.length;
  const nay = total - yea;
  const pct = total > 0 ? Math.round((yea / total) * 1000) / 10 : 0;

  return { total, yea, nay, pct, validators, domainOnlyCount, allNodesCount };
}


