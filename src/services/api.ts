import type { RawAmendment, DetailedAmendment } from '../types';

export const XLS_SPEC_MAP: Record<string, string> = {
  'XLS-56': 'https://xls.xrpl.org/xls/XLS-0056-batch.html',
  'XLS-75': 'https://xls.xrpl.org/xls/XLS-0075-permission-delegation.html',
  'XLS-65': 'https://xls.xrpl.org/xls/XLS-0065-single-asset-vault.html',
  'XLS-66': 'https://xls.xrpl.org/xls/XLS-0066-lending-protocol.html',
  'XLS-68': 'https://xls.xrpl.org/xls/XLS-0068-sponsored-fees-and-reserves.html',
  'XLS-94': 'https://xls.xrpl.org/xls/XLS-0094-dynamic-MPT.html',
  'XLS-96': 'https://xls.xrpl.org/xls/XLS-0096-confidential-mpt.html',
  'XLS-38': 'https://xls.xrpl.org/xls/XLS-0038-cross-chain-bridge.html',
  'XLS-30': 'https://xls.xrpl.org/xls/XLS-0030-automated-market-maker.html',
  'XLS-20': 'https://xls.xrpl.org/xls/XLS-0020-non-fungible-tokens.html',
  'XLS-40': 'https://xls.xrpl.org/xls/XLS-0040-decentralized-identity.html',
  'XLS-33': 'https://xls.xrpl.org/xls/XLS-0033-multi-purpose-tokens.html',
  'XLS-47': 'https://xls.xrpl.org/xls/XLS-0047-PriceOracles.html',
  'XLS-85': 'https://xls.xrpl.org/xls/XLS-0085-token-escrow.html',
  'XLS-70': 'https://xls.xrpl.org/xls/XLS-0070-credentials.html',
  'XLS-77': 'https://xls.xrpl.org/xls/XLS-0077-deep-freeze.html',
  'XLS-80': 'https://xls.xrpl.org/xls/XLS-0080-permissioned-domains.html',
  'XLS-81': 'https://xls.xrpl.org/xls/XLS-0081-permissioned-dex.html',
  // Patch / cleanup fallback URLs
  'fixCleanup3_4_0': 'https://github.com/XRPLF/rippled/releases/tag/3.4.0',
  'fixXChainRewardRounding': 'https://github.com/XRPLF/rippled/releases'
};

const API_BASE = 'https://api.xrpscan.com/api/v1';

/**
 * Resolves the official XRPL documentation or XLS specification URL.
 * Uses the official predictable anchor on xrpl.org/resources/known-amendments
 */
export function getXlsUrl(amendment: RawAmendment): string {
  if (amendment.xls_url) return amendment.xls_url;
  if (amendment.xls && XLS_SPEC_MAP[amendment.xls]) return XLS_SPEC_MAP[amendment.xls];
  const anchor = encodeURIComponent(amendment.name.toLowerCase());
  return `https://xrpl.org/resources/known-amendments#${anchor}`;
}

export const FEATURE_INFO: Record<string, { summary: string; impact: string }> = {
  BatchV1_1: {
    summary: 'Atomic transaction batching (XLS-56). Bundles up to 8 transactions executed in an all-or-nothing sequence.',
    impact: 'Enables complex multi-step DeFi, atomic arbitrage, and batch payments without intermediate failure risk.'
  },
  PermissionDelegationV1_1: {
    summary: 'Granular account permission delegation (XLS-75). Authorizes secondary accounts or keys with restricted permissions.',
    impact: 'Allows trading bots, automated recurring actions, or authorized operators without risking master seed keys.'
  },
  SingleAssetVault: {
    summary: 'Native single-asset liquidity and yield vaults (XLS-65). Deposit XRP or IOUs to earn on-ledger yield.',
    impact: 'Lays the on-chain DeFi foundation for lending protocols, pooled liquidity, and automated interest.'
  },
  ConfidentialTransfer: {
    summary: 'Zero-knowledge privacy-preserving transfers (XLS-96). Hides transaction balances and transfer amounts on-ledger.',
    impact: 'Provides institutional confidentiality and private transfers while preserving regulatory compliance and auditability.'
  },
  DynamicMPT: {
    summary: 'Dynamic Multi-Purpose Tokens (XLS-94). Extends MPT with mutable metadata and lifecycle properties.',
    impact: 'Enables real-world assets (RWA), identity-bound tokens, and dynamic financial assets on XRPL.'
  },
  LendingProtocolV1_1: {
    summary: 'Native decentralized fixed-term and pooled lending protocol (XLS-66) built on Single Asset Vaults.',
    impact: 'Enables uncollateralized/undercollateralized loans and interest rate markets natively without smart contracts.'
  },
  fixCleanup3_4_0: {
    summary: 'Protocol optimizations and stability fixes introduced in xrpld v3.4.0.',
    impact: 'Resolves edge cases in consensus and transaction execution across all UNL nodes.'
  },
  fixXChainRewardRounding: {
    summary: 'Fix for reward rounding calculations in cross-chain bridge witness claims.',
    impact: 'Ensures exact reward distributions for cross-chain bridge witness servers.'
  },
  Sponsor: {
    summary: 'Account reserve sponsorship (XLS-68). Allows third parties to lock reserve fees for user accounts.',
    impact: 'Enables zero-friction user onboarding where applications fund account creation and trustlines.'
  },
  XChainBridge: {
    summary: 'Cross-chain bridging protocol (XLS-38). Trustless value transfer between XRPL and sidechains (e.g. EVM sidechain).',
    impact: 'Connects XRPL Mainnet liquidity directly to external smart contract chains and sidechains.'
  }
};

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

/**
 * Fetch detailed amendment vote status
 */
export interface ValidatorRegistryEntry {
  master_key: string;
  domain?: string;
  server_version?: {
    version?: string;
    version_full?: string;
  };
  unl?: string[];
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
