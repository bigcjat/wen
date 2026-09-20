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
 * Resolves the official XLS documentation or specification URL
 */
export function getXlsUrl(amendment: RawAmendment): string | null {
  if (amendment.xls_url) return amendment.xls_url;
  if (amendment.xls && XLS_SPEC_MAP[amendment.xls]) return XLS_SPEC_MAP[amendment.xls];
  if (XLS_SPEC_MAP[amendment.name]) return XLS_SPEC_MAP[amendment.name];
  return null;
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
  try {
    const resp = await fetch(`${API_BASE}/amendments`, {
      headers: { Accept: 'application/json' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: RawAmendment[] = await resp.json();
    return filterActiveVotingAmendments(data);
  } catch (err) {
    console.warn('Live API fetch failed, using cached fallback data:', err);
    return getFallbackAmendments();
  }
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
  try {
    const resp = await fetch(`${API_BASE}/validatorregistry`, {
      headers: { Accept: 'application/json' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: ValidatorRegistryEntry[] = await resp.json();
    cachedRegistry = data;
    return data;
  } catch (err) {
    console.warn('Validator registry fetch failed, using defaults:', err);
    return [];
  }
}

export async function fetchNodes(): Promise<NodeEntry[]> {
  if (cachedNodes) return cachedNodes;
  try {
    const resp = await fetch(`${API_BASE}/nodes`, {
      headers: { Accept: 'application/json' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: NodeEntry[] = await resp.json();
    cachedNodes = data;
    return data;
  } catch (err) {
    console.warn('Nodes endpoint fetch failed, using defaults:', err);
    return [];
  }
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

  const is340 = requiredVersion.startsWith('3.4');

  // Node calculation
  let totalNodes = nodes.length;
  let updatedNodes = 0;
  if (totalNodes > 0) {
    nodes.forEach((n) => {
      const ver = n.server_version || n.version || '';
      if (isVersionAtLeast(ver, requiredVersion)) {
        updatedNodes++;
      }
    });
  } else {
    totalNodes = 813;
    updatedNodes = is340 ? 188 : 772;
  }

  // Validator calculation
  if (!registry || registry.length === 0) {
    return {
      requiredVersion,
      totalValidators: 213,
      updatedValidators: is340 ? 72 : 209,
      totalUnl: 35,
      updatedUnl: is340 ? 12 : 35,
      outdatedUnl: is340 ? 23 : 0,
      totalNodes,
      updatedNodes
    };
  }

  const totalValidators = registry.length;
  let updatedValidators = 0;

  const unlValidators = registry.filter((v) => v.unl && v.unl.length > 0);
  const totalUnl = unlValidators.length || 35;
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
  try {
    const resp = await fetch(`${API_BASE}/amendment/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: DetailedAmendment = await resp.json();
    return data;
  } catch (err) {
    console.warn(`Live details fetch failed for ${name}, using fallback:`, err);
    return getFallbackDetails(name);
  }
}

function getFallbackAmendments(): RawAmendment[] {
  return [
    {
      amendment_id: '9F287AED3CDB50A7BD1ACEC24296A30C9B5230CCD136219317AC790E3B884377',
      name: 'BatchV1_1',
      xls: 'XLS-56',
      enabled: false,
      majority: 842796401,
      count: 30,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: '0F48FF561C709540328F31F1C97FD512ACC8B4E42138A161CB0E21ECA292540B',
      name: 'PermissionDelegationV1_1',
      xls: 'XLS-75',
      enabled: false,
      majority: null,
      count: 26,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: '81BD2619B6B3C8625AC5D0BC01DE17F06C3F0AB95C7C87C93715B87A4FD240D8',
      name: 'SingleAssetVault',
      xls: 'XLS-65',
      enabled: false,
      majority: null,
      count: 16,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: '2110E4A19966E2EF517C0A8C56A5F35099D7665B0BB89D7B126B30D50B86AAD5',
      name: 'ConfidentialTransfer',
      xls: 'XLS-96',
      enabled: false,
      majority: null,
      count: 13,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: '58E92F338758479C06084E1B6BA366BAD8F75E5329A7F0EEAFFFDA51E5106B7F',
      name: 'DynamicMPT',
      xls: 'XLS-94',
      enabled: false,
      majority: null,
      count: 13,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: '2BF037D90E1B676B17592A8AF55E88DB465398B4B597AE46EECEE1399AB05699',
      name: 'fixXChainRewardRounding',
      enabled: false,
      majority: null,
      count: 12,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: '98433DD001A5737F773D74F8CA2A25A065089C73B2E611C760BAF369E4FECA76',
      name: 'fixCleanup3_4_0',
      enabled: false,
      majority: null,
      count: 9,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: 'BE1F90581635DBCEBFC4678C4B54FEDDC1A17B50FD02CFE765A4132A342126AC',
      name: 'Sponsor',
      xls: 'XLS-68',
      enabled: false,
      majority: null,
      count: 6,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: 'C98D98EE9616ACD36E81FDEB8D41D349BF5F1B41DD64A0ABC1FE9AA5EA267E9C',
      name: 'XChainBridge',
      xls: 'XLS-38',
      enabled: false,
      majority: null,
      count: 5,
      threshold: 28,
      validations: 35
    },
    {
      amendment_id: 'A360E2BFD775A5B0DCE1C36C16DF31B72735A57584FD163655D2F9564F8E7AC8',
      name: 'LendingProtocolV1_1',
      xls: 'XLS-66',
      enabled: false,
      majority: null,
      count: 0,
      threshold: 28,
      validations: 35
    }
  ];
}

function getFallbackDetails(name: string): DetailedAmendment {
  const base = getFallbackAmendments().find((a) => a.name === name) || getFallbackAmendments()[0];
  return {
    ...base,
    voters: [
      { domain: 'ripple.com' },
      { domain: 'bitso.com' },
      { domain: 'validator.gatehub.net' },
      { domain: 'bithomp.com' },
      { domain: 'xrpscan.com' },
      { domain: 'xrp.vet' },
      { domain: 'shadow.haas.berkeley.edu' },
      { domain: 'ripple.ittc.ku.edu' },
      { domain: 'ripple.kenan-flagler.unc.edu' },
      { domain: 'ripplevalidator.uwaterloo.ca' },
      { domain: 'arrington-xrp-capital.blockdaemon.com' },
      { domain: 'peersyst.cloud' },
      { domain: 'squidrouter.com' },
      { domain: 'anodos.finance' },
      { domain: 'aureusox.com' },
      { domain: 'www.bitrue.com' }
    ],
    vetoers: [
      { domain: 'validator.xrpl-labs.com' },
      { domain: 'v2.xrpl-commons.org' },
      { domain: 'tequ.dev' },
      { domain: 'cabbit.tech' },
      { domain: 'gen3labs.xyz' }
    ]
  };
}
