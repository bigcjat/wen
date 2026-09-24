import './style.css';
import type { RawAmendment, DetailedAmendment, EnrichedValidator } from './types';
import { 
  fetchAllAmendments, 
  fetchAmendmentDetails, 
  fetchAmendmentDescriptions, 
  fetchValidatorRegistry,
  computeCommunityVotes,
  getXlsUrl, 
  calculateVersionStats, 
  type VersionStats,
  type ValidatorRegistryEntry 
} from './services/api';
import { getFaviconCandidates, getFallbackMonogram } from './services/favicon';
import { fireConfetti } from './services/confetti';

// App State
let activeAmendments: RawAmendment[] = [];
let amendmentDescriptions: Record<string, string> = {};
let selectedAmendment: RawAmendment | null = null;
let currentDetails: DetailedAmendment | null = null;
let currentValidators: EnrichedValidator[] = [];
let currentUnlValidators: EnrichedValidator[] = [];
let currentCommunityValidators: EnrichedValidator[] = [];
let cachedValidatorRegistry: ValidatorRegistryEntry[] = [];
let currentCohort: 'UNL' | 'COMMUNITY' = 'UNL';
let currentVersionStats: VersionStats | null = null;
let currentFilter: 'ALL' | 'YEA' | 'NAY' = 'ALL';
let communityDomainOnly: boolean = true;
let countdownInterval: number | null = null;

/**
 * Calculates the exact dynamic consensus threshold required for an amendment to trigger majority.
 * In XRPL consensus, an amendment must receive support strictly greater than 80% (>80%, 80.01%+)
 * of active UNL validators.
 * Handles any UNL size dynamically, including adjustments when validators enter or leave the Negative UNL (nUNL).
 */
export function calculateConsensusThreshold(totalValidators: number): number {
  if (totalValidators <= 0) return 0;
  return Math.floor(totalValidators * 0.8) + 1;
}

// DOM Elements
const appTitle = document.getElementById('appTitle') as HTMLHeadingElement;
const titleWenTarget = document.getElementById('titleWenTarget') as HTMLSpanElement;
const subtitleXls = document.getElementById('subtitleXls') as HTMLSpanElement;
const subtitleFeature = document.getElementById('subtitleFeature') as HTMLSpanElement;

const dropdownTrigger = document.getElementById('dropdownTrigger') as HTMLButtonElement;
const dropdownMenu = document.getElementById('dropdownMenu') as HTMLDivElement;
const selectedFeatureName = document.getElementById('selectedFeatureName') as HTMLSpanElement;
const selectedXlsTag = document.getElementById('selectedXlsTag') as HTMLSpanElement;
const activeCountBadge = document.getElementById('activeCountBadge') as HTMLSpanElement;
const amendmentsOverviewGrid = document.getElementById('amendmentsOverviewGrid') as HTMLDivElement;
const overviewBadge = document.getElementById('overviewBadge') as HTMLSpanElement;

const featureHeadline = document.getElementById('featureHeadline') as HTMLHeadingElement;
const btnShare = document.getElementById('btnShare') as HTMLButtonElement;
const shareBtnIcon = document.getElementById('shareBtnIcon') as HTMLSpanElement;
const shareBtnText = document.getElementById('shareBtnText') as HTMLSpanElement;
const featureSpecBtn = document.getElementById('featureSpecBtn') as HTMLAnchorElement;
const featureDescription = document.getElementById('featureDescription') as HTMLParagraphElement;

const voteCount = document.getElementById('voteCount') as HTMLSpanElement;
const percentageDisplay = document.getElementById('percentageDisplay') as HTMLDivElement;
const progressFill = document.getElementById('progressFill') as HTMLDivElement;

const retroBar1Title = document.getElementById('retroBar1Title') as HTMLSpanElement;
const retroBar1Metric = document.getElementById('retroBar1Metric') as HTMLSpanElement;
const retroBar1Fill = document.getElementById('retroBar1Fill') as HTMLDivElement;
const retroNodesTitle = document.getElementById('retroNodesTitle') as HTMLSpanElement;
const retroNodesMetric = document.getElementById('retroNodesMetric') as HTMLSpanElement;
const retroNodesFill = document.getElementById('retroNodesFill') as HTMLDivElement;
const retroBar2Title = document.getElementById('retroBar2Title') as HTMLSpanElement;
const retroBar2Metric = document.getElementById('retroBar2Metric') as HTMLSpanElement;
const retroAmendmentLabel = document.getElementById('retroAmendmentLabel') as HTMLSpanElement;
const segmentYes = document.getElementById('segmentYes') as HTMLDivElement;
const segmentNo = document.getElementById('segmentNo') as HTMLDivElement;
const segmentUnvoted = document.getElementById('segmentUnvoted') as HTMLDivElement;
const blockedVersionTag = document.getElementById('blockedVersionTag') as HTMLSpanElement;
const blockedVersionNotice = document.getElementById('blockedVersionNotice') as HTMLSpanElement;

const statusCallout = document.getElementById('statusCallout') as HTMLDivElement;
const calloutTitle = document.getElementById('calloutTitle') as HTMLHeadingElement;
const calloutSubtitle = document.getElementById('calloutSubtitle') as HTMLParagraphElement;
const countdownBox = document.getElementById('countdownBox') as HTMLDivElement;
const timeDays = document.getElementById('timeDays') as HTMLDivElement;
const timeHours = document.getElementById('timeHours') as HTMLDivElement;
const timeMins = document.getElementById('timeMins') as HTMLDivElement;
const timeSecs = document.getElementById('timeSecs') as HTMLDivElement;

const tabAll = document.getElementById('tabAll') as HTMLButtonElement;
const tabYea = document.getElementById('tabYea') as HTMLButtonElement;
const tabNay = document.getElementById('tabNay') as HTMLButtonElement;
const countAll = document.getElementById('countAll') as HTMLSpanElement;
const countYea = document.getElementById('countYea') as HTMLSpanElement;
const countNay = document.getElementById('countNay') as HTMLSpanElement;
const validatorGrid = document.getElementById('validatorGrid') as HTMLDivElement;
const validatorFeatureName = document.getElementById('validatorFeatureName') as HTMLSpanElement;
const validatorFeatureSub = document.getElementById('validatorFeatureSub') as HTMLSpanElement;

// Community & Cohort Elements
const communitySentimentMetric = document.getElementById('communitySentimentMetric') as HTMLSpanElement;
const communitySegmentYes = document.getElementById('communitySegmentYes') as HTMLDivElement;
const communitySegmentNo = document.getElementById('communitySegmentNo') as HTMLDivElement;

const validatorCohortSubtitle = document.getElementById('validatorCohortSubtitle') as HTMLSpanElement;
const btnCohortUnl = document.getElementById('btnCohortUnl') as HTMLButtonElement;
const btnCohortCommunity = document.getElementById('btnCohortCommunity') as HTMLButtonElement;
const unlCohortCount = document.getElementById('unlCohortCount') as HTMLSpanElement;
const communityCohortCount = document.getElementById('communityCohortCount') as HTMLSpanElement;

// Community Domain Filter Toggle Elements
const btnDomainOnly = document.getElementById('btnDomainOnly') as HTMLButtonElement | null;
const btnIncludeAnon = document.getElementById('btnIncludeAnon') as HTMLButtonElement | null;
const domainOnlyCount = document.getElementById('domainOnlyCount') as HTMLSpanElement | null;
const allNodesCount = document.getElementById('allNodesCount') as HTMLSpanElement | null;
const communitySubtext = document.getElementById('communitySubtext') as HTMLDivElement | null;

function findAmendmentFromUrl(amendments: RawAmendment[]): RawAmendment | null {
  const params = new URLSearchParams(window.location.search);
  // Support ?XLS or ?xls or ?amendment or ?feature or #hash
  const queryRaw = params.get('XLS') || params.get('xls') || params.get('amendment') || params.get('feature') || window.location.hash.replace(/^#/, '');
  if (!queryRaw) return null;

  const query = queryRaw.toLowerCase().trim();
  const cleanNum = query.replace(/^xls-?/, '');

  // 1. Try matching by XLS number (e.g. "56", "xls-56")
  const xlsMatch = amendments.find((a) => {
    if (!a.xls) return false;
    const aXls = a.xls.toLowerCase().replace(/^xls-?/, '').trim();
    return aXls === cleanNum || aXls === query;
  });
  if (xlsMatch) return xlsMatch;

  // 2. Try matching by Amendment Name (e.g. "fixCleanup3_4_0", "batchv1_1")
  const exactNameMatch = amendments.find((a) => a.name.toLowerCase() === query);
  if (exactNameMatch) return exactNameMatch;

  // 3. Try partial name match (e.g. "fixcleanup", "batch", "confidential")
  const partialNameMatch = amendments.find(
    (a) => a.name.toLowerCase().startsWith(query) || a.name.toLowerCase().includes(query)
  );
  if (partialNameMatch) return partialNameMatch;

  return null;
}

// Initialization
async function init() {
  setupEventListeners();

  try {
    const [amendments, descs, registry] = await Promise.all([
      fetchAllAmendments(),
      fetchAmendmentDescriptions().catch(() => ({} as Record<string, string>)),
      fetchValidatorRegistry().catch(() => [] as ValidatorRegistryEntry[])
    ]);
    activeAmendments = amendments;
    amendmentDescriptions = descs;
    cachedValidatorRegistry = registry;
  } catch (err) {
    console.error('Failed to load live amendments', err);
    displayFatalError(err);
    return;
  }

  if (activeAmendments.length === 0) {
    displayFatalError(new Error('Zero active voting amendments returned by XRPL live API'));
    return;
  }

  const countText = `${activeAmendments.length} Features in Voting`;
  if (activeCountBadge) activeCountBadge.textContent = countText;
  if (overviewBadge) overviewBadge.textContent = `${activeAmendments.length} Active`;

  renderDropdownMenu();
  renderOverviewGrid();

  // Select requested amendment from URL (?XLS=56, ?XLS=fixCleanup3_4_0), otherwise default to first active amendment
  const initial = findAmendmentFromUrl(activeAmendments) || activeAmendments[0];
  await selectAmendment(initial, false);
}

function setupEventListeners() {
  // Dropdown toggle
  dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu.classList.toggle('open');
    dropdownTrigger.classList.toggle('open', isOpen);
    dropdownTrigger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close dropdown on click outside
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('open');
    dropdownTrigger.classList.remove('open');
    dropdownTrigger.setAttribute('aria-expanded', 'false');
  });

  // Cohort switching (UNL vs Community)
  if (btnCohortUnl) btnCohortUnl.addEventListener('click', () => setValidatorCohort('UNL'));
  if (btnCohortCommunity) btnCohortCommunity.addEventListener('click', () => setValidatorCohort('COMMUNITY'));

  // Community domain filter toggle (Domains Only vs All Nodes)
  if (btnDomainOnly) {
    btnDomainOnly.addEventListener('click', () => {
      if (communityDomainOnly) return;
      communityDomainOnly = true;
      btnDomainOnly.classList.add('active');
      btnIncludeAnon?.classList.remove('active');
      updateProgressAndStatus();
      processValidators();
      renderOverviewGrid();
    });
  }
  if (btnIncludeAnon) {
    btnIncludeAnon.addEventListener('click', () => {
      if (!communityDomainOnly) return;
      communityDomainOnly = false;
      btnIncludeAnon.classList.add('active');
      btnDomainOnly?.classList.remove('active');
      updateProgressAndStatus();
      processValidators();
      renderOverviewGrid();
    });
  }

  // Tab filtering
  tabAll.addEventListener('click', () => setValidatorFilter('ALL'));
  tabYea.addEventListener('click', () => setValidatorFilter('YEA'));
  tabNay.addEventListener('click', () => setValidatorFilter('NAY'));

  // Browser Back / Forward navigation
  window.addEventListener('popstate', () => {
    const target = findAmendmentFromUrl(activeAmendments) || activeAmendments[0];
    if (target && target.name !== selectedAmendment?.name) {
      selectAmendment(target, false);
    }
  });

  // Share button: copies direct URL with parameter (?xls=56 or ?amendment=Name) to clipboard
  if (btnShare) {
    btnShare.addEventListener('click', async () => {
      if (!selectedAmendment) return;
      const url = new URL(window.location.origin + window.location.pathname);
      if (selectedAmendment.xls) {
        url.searchParams.set('XLS', selectedAmendment.xls.replace(/^XLS-?/i, ''));
        url.searchParams.delete('xls');
      } else {
        url.searchParams.set('XLS', selectedAmendment.name);
        url.searchParams.delete('xls');
      }
      const shareUrl = url.toString();

      try {
        await navigator.clipboard.writeText(shareUrl);
        btnShare.classList.add('copied');
        if (shareBtnIcon) shareBtnIcon.textContent = '⚡';
        if (shareBtnText) shareBtnText.textContent = 'COPIED!';
        setTimeout(() => {
          btnShare.classList.remove('copied');
          if (shareBtnIcon) shareBtnIcon.textContent = '🔗';
          if (shareBtnText) shareBtnText.textContent = 'SHARE';
        }, 2000);
      } catch {
        prompt('Copy direct link to this amendment:', shareUrl);
      }
    });
  }
}

function renderDropdownMenu() {
  dropdownMenu.innerHTML = '';

  activeAmendments.forEach((amendment) => {
    const isJustActivated = amendment.isJustActivated || amendment.enabled;
    const isActivating = amendment.majority != null && !isJustActivated;
    const item = document.createElement('button');
    item.className = `dropdown-item ${selectedAmendment?.name === amendment.name ? 'selected' : ''}`;
    item.setAttribute('role', 'option');

    const badgeClass = isJustActivated ? 'just-activated' : (isActivating ? 'activating' : 'voting');
    const badgeText = isJustActivated ? '🎉 ACTIVATED' : (isActivating ? 'ACTIVATING' : 'VOTING');

    const total = amendment.validations || (currentVersionStats?.totalUnl || 0);
    const threshold = calculateConsensusThreshold(total);
    const votesSub = total > 0
      ? `${amendment.count}/${total} votes (${threshold} needed for >80%)`
      : `${amendment.count} votes`;

    item.innerHTML = `
      <div class="item-main">
        <span class="item-name">${escapeHtml(amendment.name)}</span>
        <span class="item-sub">${amendment.xls ? escapeHtml(amendment.xls) : 'Protocol Patch'} • ${votesSub}</span>
      </div>
      <span class="status-badge-small ${badgeClass}">
        ${badgeText}
      </span>
    `;

    item.addEventListener('click', () => {
      selectAmendment(amendment);
      dropdownMenu.classList.remove('open');
      dropdownTrigger.classList.remove('open');
      dropdownTrigger.setAttribute('aria-expanded', 'false');
    });

    dropdownMenu.appendChild(item);
  });
}

function renderOverviewGrid() {
  amendmentsOverviewGrid.innerHTML = '';

  activeAmendments.forEach((amendment) => {
    const isSelected = selectedAmendment?.name === amendment.name;
    const isJustActivated = amendment.isJustActivated || amendment.enabled;
    const isActivating = amendment.majority != null && !isJustActivated;
    const count = amendment.count;
    const total = amendment.validations || (currentVersionStats?.totalUnl || 0);
    const threshold = calculateConsensusThreshold(total);
    const hasConsensus = threshold > 0 && count >= threshold;
    const pct = isJustActivated ? 100 : (total > 0 ? Math.round((count / total) * 1000) / 10 : 0);

    const badgeClass = isJustActivated ? 'just-activated' : (isActivating ? 'activating' : 'voting');
    const badgeText = isJustActivated ? '🎉 ACTIVATED' : (isActivating ? 'ACTIVATING' : 'VOTING');
    const isLongName = amendment.name.length > 18;
    const specUrl = getXlsUrl(amendment) || 'https://github.com/XRPLF/XRPL-Standards/discussions';

    const card = document.createElement('div');
    card.className = `overview-card ${isSelected ? 'active' : ''}`;

    const comm = computeCommunityVotes(amendment.amendment_id, cachedValidatorRegistry, communityDomainOnly);

    card.innerHTML = `
      <div>
        <div class="ov-meta-row">
          <a href="${specUrl}" target="_blank" rel="noopener noreferrer" class="ov-sub-link" onclick="event.stopPropagation();" title="Open official ${amendment.xls || amendment.name} specification">
            <span>${amendment.xls ? escapeHtml(amendment.xls) : 'Protocol Patch'}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
          <span class="status-badge-small ${badgeClass}">
            ${badgeText}
          </span>
        </div>
        <div class="ov-name-wrap">
          <div class="ov-name ${isLongName ? 'long-name' : ''}" title="${escapeHtml(amendment.name)}">${escapeHtml(amendment.name)}</div>
        </div>
        <div class="ov-tally">
          <span class="ov-tally-num">UNL: ${isJustActivated ? total : count} <span style="font-size: 0.72rem; color: var(--text-muted);">${total > 0 ? `/ ${total}` : ''}</span></span>
          <span class="ov-pct">${pct}%</span>
        </div>
        <div class="ov-mini-track">
          <div class="ov-mini-fill ${isJustActivated ? 'majority' : (hasConsensus ? 'majority' : '')}" style="width: ${pct}%;"></div>
        </div>
        <div class="ov-comm-row">
          <span class="ov-comm-label">COMMUNITY:</span>
          <span class="ov-comm-val">${comm.total > 0 ? `${comm.yea}/${comm.total} (${comm.pct}% YES)` : '--'}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectAmendment(amendment);
      document.getElementById('heroCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    amendmentsOverviewGrid.appendChild(card);
  });
}

async function selectAmendment(amendment: RawAmendment, updateUrl = true) {
  selectedAmendment = amendment;

  if (updateUrl) {
    const url = new URL(window.location.href);
    if (amendment.xls) {
      const xlsNum = amendment.xls.replace(/^XLS-?/i, '');
      url.searchParams.set('XLS', xlsNum);
      url.searchParams.delete('xls');
      url.searchParams.delete('amendment');
      url.searchParams.delete('feature');
      url.searchParams.delete('name');
    } else {
      url.searchParams.set('XLS', amendment.name);
      url.searchParams.delete('xls');
      url.searchParams.delete('amendment');
      url.searchParams.delete('feature');
      url.searchParams.delete('name');
    }
    window.history.replaceState(null, '', url.toString());
  }

  renderDropdownMenu();
  renderOverviewGrid();

  // Dynamically derive retro header and subtitle directly from amendment name
  const cleanBase = amendment.name.replace(/V\d+(_\d+)?$/i, '');
  const featureWord = `${cleanBase.toLowerCase()}?`;
  const featureTitle = amendment.name.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

  if (titleWenTarget) {
    titleWenTarget.textContent = featureWord;
    if (featureWord.length > 14) {
      titleWenTarget.className = 'title-wen-target size-sm';
    } else if (featureWord.length > 9) {
      titleWenTarget.className = 'title-wen-target size-md';
    } else if (featureWord.length > 6) {
      titleWenTarget.className = 'title-wen-target size-lg';
    } else {
      titleWenTarget.className = 'title-wen-target size-xl';
    }
  } else if (appTitle) {
    const sizeClass = featureWord.length > 14 ? 'size-sm' : (featureWord.length > 9 ? 'size-md' : (featureWord.length > 6 ? 'size-lg' : 'size-xl'));
    appTitle.innerHTML = `<span class="title-wen-prefix">wen</span><span class="title-wen-target ${sizeClass}">${escapeHtml(featureWord)}</span>`;
  }
  if (subtitleXls) subtitleXls.textContent = amendment.xls ? amendment.xls.replace('-', '') : 'XRPL';
  if (subtitleFeature) subtitleFeature.textContent = featureTitle;

  // Update dropdown button header
  selectedFeatureName.textContent = amendment.name;
  selectedXlsTag.textContent = amendment.xls || 'AMENDMENT';

  // Update Hero Basic Info
  featureHeadline.textContent = amendment.name;

  // Update XLS Spec Links
  const specUrl = getXlsUrl(amendment) || 'https://github.com/XRPLF/XRPL-Standards/discussions';

  if (featureSpecBtn) {
    featureSpecBtn.href = specUrl;
    featureSpecBtn.innerHTML = `
      <span>📖 Read Official ${escapeHtml(amendment.xls ? `${amendment.xls} Specification` : `${amendment.name} Docs`)}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
    `;
  }

  // Update Validator Section Header
  if (validatorFeatureName) {
    validatorFeatureName.textContent = amendment.name;
  }
  if (validatorFeatureSub) {
    validatorFeatureSub.textContent = `${amendment.name}${amendment.xls ? ` (${amendment.xls})` : ''}`;
  }
  
  // Feature description: short, plain-English summary (single paragraph, max 1-2 sentences)
  const customDesc = amendmentDescriptions[amendment.name];
  if (customDesc) {
    featureDescription.textContent = customDesc;
  } else {
    const xlsDesc = amendment.xls ? ` (${amendment.xls})` : '';
    const verDesc = amendment.introduced ? ` Introduced in xrpld v${amendment.introduced}.` : '';
    featureDescription.textContent = `XRPL protocol amendment ${amendment.name}${xlsDesc}.${verDesc}`;
  }

  const reqVer = amendment.introduced || '3.3.0';

  // Fetch full vote details (who is voting yea and nay)
  try {
    currentDetails = await fetchAmendmentDetails(amendment.name);
  } catch (err) {
    console.error('Error fetching amendment details', err);
    displayFatalError(new Error(`Failed to load live vote breakdown for ${amendment.name}: ${err instanceof Error ? err.message : String(err)}`));
    return;
  }

  // Calculate software versions across all validators and UNL
  try {
    currentVersionStats = await calculateVersionStats(reqVer);
  } catch (err) {
    console.error('Error calculating version stats', err);
    displayFatalError(new Error(`Failed to calculate live node/validator version telemetry: ${err instanceof Error ? err.message : String(err)}`));
    return;
  }

  // Trigger pixel-by-pixel stepped arcade filling animation
  const fillBars = [retroBar1Fill, retroNodesFill, progressFill, segmentYes, segmentNo, segmentUnvoted, communitySegmentYes, communitySegmentNo];
  fillBars.forEach((b) => {
    if (b) {
      b.style.transition = 'none';
      b.style.width = '0%';
    }
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fillBars.forEach((b) => {
        if (b) b.style.transition = 'width 1s cubic-bezier(0.16, 1, 0.3, 1)';
      });
      updateProgressAndStatus();
    });
  });

  processValidators();
  renderValidators();
}

function updateProgressAndStatus() {
  if (!selectedAmendment) return;

  const reqVer = selectedAmendment.introduced || '3.3.0';
  const count = currentDetails?.count ?? selectedAmendment.count;
  // Dynamic UNL size: pulled directly from live amendment validations or live UNL registry
  const total = currentDetails?.validations ?? selectedAmendment.validations ?? (currentVersionStats?.totalUnl || 0);
  // XRPL Consensus Protocol: Majority requires strictly > 80% (> 0.80) of active UNL validators.
  // Dynamic threshold for any UNL size (including Negative UNL / nUNL adjustments):
  const threshold = calculateConsensusThreshold(total);
  const majority = currentDetails?.majority ?? selectedAmendment.majority;
  const isJustActivated = selectedAmendment.isJustActivated || selectedAmendment.enabled;

  const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  const isActivating = majority != null && !isJustActivated;

  // Update Bar 1: All Network Validators Version (matching screenshot top bar)
  if (currentVersionStats) {
    const pct1 = Math.round((currentVersionStats.updatedValidators / currentVersionStats.totalValidators) * 10000) / 100;
    if (retroBar1Title) retroBar1Title.textContent = `Xrpld Validators   Ver ${reqVer}+`;
    if (retroBar1Metric) retroBar1Metric.textContent = `${currentVersionStats.updatedValidators}/${currentVersionStats.totalValidators} - ${pct1}%`;
    if (retroBar1Fill) retroBar1Fill.style.width = `${pct1}%`;

    // Update Bar 2: All Network Nodes Version (matching screenshot middle bar)
    const pctNodes = Math.round((currentVersionStats.updatedNodes / currentVersionStats.totalNodes) * 10000) / 100;
    if (retroNodesTitle) retroNodesTitle.textContent = `Xrpld Nodes   Ver ${reqVer}+`;
    if (retroNodesMetric) retroNodesMetric.textContent = `${currentVersionStats.updatedNodes}/${currentVersionStats.totalNodes} - ${pctNodes}%`;
    if (retroNodesFill) retroNodesFill.style.width = `${pctNodes}%`;

    // Update Bar 3: UNL Consensus Validators Version
    const pct2 = Math.round((currentVersionStats.updatedUnl / currentVersionStats.totalUnl) * 10000) / 100;
    if (retroBar2Title) retroBar2Title.textContent = `UNL Validators   Ver ${reqVer}+`;
    if (retroBar2Metric) retroBar2Metric.textContent = `${currentVersionStats.updatedUnl}/${currentVersionStats.totalUnl} - ${pct2}%`;
    if (progressFill) progressFill.style.width = `${pct2}%`;
  } else {
    if (retroBar1Metric) retroBar1Metric.textContent = `API ERROR`;
    if (retroNodesMetric) retroNodesMetric.textContent = `API ERROR`;
    if (retroBar2Metric) retroBar2Metric.textContent = `API ERROR`;
    if (retroBar1Fill) retroBar1Fill.style.width = '0%';
    if (retroNodesFill) retroNodesFill.style.width = '0%';
    if (progressFill) progressFill.style.width = '0%';
  }

  // Update Bar 3: Segmented Vote Breakdown (matching screenshot bottom bar)
  if (retroAmendmentLabel) {
    retroAmendmentLabel.textContent = `${selectedAmendment.xls ? selectedAmendment.xls.replace('-', '') : 'XRPL'}  ${selectedAmendment.name}`;
  }

  const outdatedCount = isJustActivated ? 0 : (currentVersionStats ? currentVersionStats.outdatedUnl : 0);
  const yeaCount = isJustActivated ? total : (currentDetails?.voters ? currentDetails.voters.length : count);
  const nayCount = isJustActivated ? 0 : (currentDetails?.vetoers ? currentDetails.vetoers.length : Math.max(0, total - yeaCount - outdatedCount));

  const pctYea = isJustActivated ? 100 : Math.round((yeaCount / total) * 1000) / 10;
  const pctNay = isJustActivated ? 0 : Math.round((nayCount / total) * 1000) / 10;
  const pctOutdated = isJustActivated ? 0 : Math.round((outdatedCount / total) * 1000) / 10;

  if (segmentYes) {
    if (pctYea > 0) {
      segmentYes.style.display = 'flex';
      segmentYes.style.width = `${pctYea}%`;
      segmentYes.textContent = pctYea >= 12 ? `YES (${pctYea}%)` : (pctYea > 0 ? `${pctYea}%` : '');
    } else {
      segmentYes.style.display = 'none';
      segmentYes.style.width = '0%';
      segmentYes.textContent = '';
    }
  }
  if (segmentNo) {
    if (pctNay > 0) {
      segmentNo.style.display = 'flex';
      segmentNo.style.width = `${pctNay}%`;
      segmentNo.textContent = pctNay >= 12 ? `NO (${pctNay}%)` : (pctNay > 0 ? `${pctNay}%` : '');
    } else {
      segmentNo.style.display = 'none';
      segmentNo.style.width = '0%';
      segmentNo.textContent = '';
    }
  }
  if (segmentUnvoted) {
    if (pctOutdated > 0) {
      segmentUnvoted.style.display = 'flex';
      segmentUnvoted.style.width = `${pctOutdated}%`;
      segmentUnvoted.textContent = pctOutdated >= 15 ? `OUTDATED (${pctOutdated}%)` : (pctOutdated > 0 ? `${pctOutdated}%` : '');
    } else {
      segmentUnvoted.style.display = 'none';
      segmentUnvoted.style.width = '0%';
      segmentUnvoted.textContent = '';
    }
  }

  // Update Community Sentiment Bar
  const commStats = computeCommunityVotes(selectedAmendment.amendment_id, cachedValidatorRegistry, communityDomainOnly);
  if (domainOnlyCount) domainOnlyCount.textContent = String(commStats.domainOnlyCount);
  if (allNodesCount) allNodesCount.textContent = String(commStats.allNodesCount);
  if (communitySubtext) {
    communitySubtext.textContent = communityDomainOnly
      ? 'Showing identified community validators with configured domains (ignores test and backup anon units).'
      : 'Showing all registered mainnet community nodes, including anonymous/unverified units.';
  }
  if (communitySentimentMetric) {
    communitySentimentMetric.textContent = `${commStats.pct}% YES (${commStats.yea}/${commStats.total})`;
  }
  if (communitySegmentYes) {
    if (commStats.pct > 0) {
      communitySegmentYes.style.display = 'flex';
      communitySegmentYes.style.width = `${commStats.pct}%`;
      communitySegmentYes.textContent = commStats.pct >= 14 ? `YES (${commStats.pct}%)` : (commStats.pct > 0 ? `${commStats.pct}%` : '');
    } else {
      communitySegmentYes.style.display = 'none';
      communitySegmentYes.style.width = '0%';
      communitySegmentYes.textContent = '';
    }
  }
  if (communitySegmentNo) {
    const nayPct = Math.max(0, Math.round((100 - commStats.pct) * 10) / 10);
    if (nayPct > 0) {
      communitySegmentNo.style.display = 'flex';
      communitySegmentNo.style.width = `${nayPct}%`;
      communitySegmentNo.textContent = nayPct >= 14 ? `NO (${nayPct}%)` : (nayPct > 0 ? `${nayPct}%` : '');
    } else {
      communitySegmentNo.style.display = 'none';
      communitySegmentNo.style.width = '0%';
      communitySegmentNo.textContent = '';
    }
  }

  if (blockedVersionTag) {
    blockedVersionTag.textContent = `Ver ${reqVer}`;
  }
  if (blockedVersionNotice) {
    blockedVersionNotice.textContent = `Ver ${reqVer}`;
  }

  voteCount.textContent = String(count);

  if (isJustActivated) {
    percentageDisplay.textContent = '100% YES';
    progressFill.className = 'retro-fill just-activated';

    statusCallout.className = 'status-callout activating';
    calloutTitle.textContent = 'Amendment Officially Activated on Mainnet!';
    calloutSubtitle.textContent = selectedAmendment.enabled_on
      ? `Successfully enabled on ${new Date(selectedAmendment.enabled_on).toUTCString()} (Ledger #${selectedAmendment.enabled_in_ledger || 'confirmed'}). Showing for 48 hours.`
      : 'This amendment has cleared the 14-day countdown and is now permanently active on the XRPL!';
    countdownBox.style.display = 'none';
    stopCountdown();

    fireConfetti(140);
  } else {
    percentageDisplay.textContent = `${pctYea}% YES`;

    const hasConsensus = threshold > 0 && count >= threshold;

    if (hasConsensus || isActivating) {
      progressFill.className = 'retro-fill majority';
    } else {
      progressFill.className = 'retro-fill';
    }

    if (isActivating) {
      statusCallout.className = 'status-callout activating';
      calloutTitle.textContent = 'Majority Achieved: Activation Countdown Active';
      calloutSubtitle.textContent = 'This feature has sustained >80% validator support and is scheduled to activate on-ledger.';
      countdownBox.style.display = 'flex';
      startCountdown(majority!);
    } else {
      statusCallout.className = 'status-callout voting';
      
      const needed = Math.max(0, threshold - count);
      if (needed > 0) {
        calloutTitle.textContent = `Needs ${needed} More Vote${needed > 1 ? 's' : ''} to Reach >80% Consensus`;
        calloutSubtitle.textContent = `Current tally is ${count} of ${total} validators (${percentage}%). Consensus requires strictly >80% (${threshold} of ${total} votes, 80.01%+) maintained for 14 continuous days.`;
      } else {
        calloutTitle.textContent = '>80% Achieved: Awaiting Flag Ledger';
        calloutSubtitle.textContent = `Current tally is ${count} of ${total} validators (${percentage}%). >80% threshold reached! Awaiting next flag ledger to record majority and begin 14-day countdown.`;
      }
      countdownBox.style.display = 'none';
      stopCountdown();
    }
  }
}

function startCountdown(majorityTimestamp: number) {
  stopCountdown();

  // Ripple epoch starts at Jan 1 2000 00:00:00 UTC (946684800 seconds)
  // Activation is majority + 14 days (14 * 86400 seconds)
  const activationEpochSec = majorityTimestamp + 946684800 + (14 * 86400);

  const update = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const diffSec = activationEpochSec - nowSec;

    if (diffSec <= 0) {
      timeDays.textContent = '00';
      timeHours.textContent = '00';
      timeMins.textContent = '00';
      timeSecs.textContent = '00';
      stopCountdown();

      // Trigger Celebration & Confetti upon timer completion!
      if (selectedAmendment) {
        selectedAmendment.isJustActivated = true;
        updateProgressAndStatus();
      }
      fireConfetti(280);
      return;
    }

    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    timeDays.textContent = String(days).padStart(2, '0');
    timeHours.textContent = String(hours).padStart(2, '0');
    timeMins.textContent = String(mins).padStart(2, '0');
    timeSecs.textContent = String(secs).padStart(2, '0');
  };

  update();
  countdownInterval = window.setInterval(update, 1000);
}

function stopCountdown() {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function processValidators() {
  if (!currentDetails) {
    currentUnlValidators = [];
    currentCommunityValidators = [];
    currentValidators = [];
    return;
  }

  // 1. UNL Validators from currentDetails
  const voters = currentDetails.voters || [];
  const vetoers = currentDetails.vetoers || [];

  const unlList: EnrichedValidator[] = [];
  voters.forEach((v) => {
    const domain = v.domain || v.domain_legacy || (v.master_key ? v.master_key.slice(0, 16) : 'Unknown Validator');
    unlList.push({
      key: v.master_key || domain,
      domain,
      status: 'YEA',
      faviconUrl: domain,
      isUnl: true
    });
  });
  vetoers.forEach((v) => {
    const domain = v.domain || v.domain_legacy || (v.master_key ? v.master_key.slice(0, 16) : 'Unknown Validator');
    unlList.push({
      key: v.master_key || domain,
      domain,
      status: 'NAY',
      faviconUrl: domain,
      isUnl: true
    });
  });
  unlList.sort((a, b) => a.domain.localeCompare(b.domain));
  currentUnlValidators = unlList;

  // 2. Community Validators from cachedValidatorRegistry
  if (selectedAmendment) {
    const commStats = computeCommunityVotes(selectedAmendment.amendment_id, cachedValidatorRegistry, communityDomainOnly);
    currentCommunityValidators = commStats.validators;
  } else {
    currentCommunityValidators = [];
  }

  if (unlCohortCount) unlCohortCount.textContent = String(currentUnlValidators.length);
  if (communityCohortCount) communityCohortCount.textContent = String(currentCommunityValidators.length);

  updateActiveCohortList();
}

function updateActiveCohortList() {
  const list = currentCohort === 'UNL' ? currentUnlValidators : currentCommunityValidators;
  currentValidators = list;

  if (validatorCohortSubtitle) {
    validatorCohortSubtitle.textContent = currentCohort === 'UNL'
      ? 'Showing UNL consensus validator positions on '
      : 'Showing non-UNL community validator positions on ';
  }

  const yeaCount = list.filter((v) => v.status === 'YEA').length;
  const nayCount = list.filter((v) => v.status === 'NAY').length;

  countAll.textContent = String(list.length);
  countYea.textContent = String(yeaCount);
  countNay.textContent = String(nayCount);

  renderValidators();
}

function setValidatorCohort(cohort: 'UNL' | 'COMMUNITY') {
  currentCohort = cohort;
  if (btnCohortUnl) {
    btnCohortUnl.classList.toggle('active', cohort === 'UNL');
    btnCohortUnl.setAttribute('aria-selected', String(cohort === 'UNL'));
  }
  if (btnCohortCommunity) {
    btnCohortCommunity.classList.toggle('active', cohort === 'COMMUNITY');
    btnCohortCommunity.setAttribute('aria-selected', String(cohort === 'COMMUNITY'));
  }
  updateActiveCohortList();
}

function setValidatorFilter(filter: 'ALL' | 'YEA' | 'NAY') {
  currentFilter = filter;
  tabAll.classList.toggle('active', filter === 'ALL');
  tabYea.classList.toggle('active', filter === 'YEA');
  tabNay.classList.toggle('active', filter === 'NAY');
  renderValidators();
}

function renderValidators() {
  validatorGrid.innerHTML = '';

  if (!currentDetails) {
    validatorGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 4px;">
        <p style="font-family: var(--font-pixel); color: #ef4444; font-size: 0.8rem; margin-bottom: 0.5rem;">⚠️ API ERROR: LIVE VOTER LIST UNREACHABLE</p>
        <p style="font-family: var(--font-silkscreen); color: #fca5a5; font-size: 0.75rem;">Could not load live validator votes for ${selectedAmendment ? escapeHtml(selectedAmendment.name) : 'this feature'} from XRPScan API. No fake data is shown.</p>
      </div>
    `;
    return;
  }

  const filtered = currentValidators.filter((v) => {
    if (currentFilter === 'ALL') return true;
    return v.status === currentFilter;
  });

  if (filtered.length === 0) {
    validatorGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">No validators match this filter.</div>`;
    return;
  }

  filtered.forEach((val) => {
    const card = document.createElement('div');
    card.className = 'validator-card';

    const candidates = getFaviconCandidates(val.domain);
    const fallbackSvg = getFallbackMonogram(val.domain);

    const left = document.createElement('div');
    left.className = 'val-left';

    const avatarFrame = document.createElement('div');
    avatarFrame.className = 'val-avatar-frame';

    const img = document.createElement('img');
    img.className = 'val-avatar';
    img.alt = val.domain;
    img.loading = 'lazy';

    // Progressive hierarchy fallback handler
    let candidateIndex = 0;
    img.src = candidates[0] || fallbackSvg;

    img.onerror = () => {
      candidateIndex++;
      if (candidateIndex < candidates.length) {
        img.src = candidates[candidateIndex];
      } else {
        img.src = fallbackSvg;
        img.onerror = null;
      }
    };

    avatarFrame.appendChild(img);

    const info = document.createElement('div');
    info.className = 'val-info';
    const displayDomain = formatValidatorName(val.domain);
    const subText = val.isUnl ? 'dUNL Consensus' : (val.version ? `v${val.version}` : 'Independent');
    info.innerHTML = `
      <span class="val-domain" title="${escapeHtml(val.domain)}">${escapeHtml(displayDomain)}</span>
      <span class="val-sub"><span class="cohort-badge-tag ${val.isUnl ? 'unl' : 'community'}">${val.isUnl ? 'UNL' : 'COMMUNITY'}</span>${escapeHtml(subText)}</span>
    `;

    left.appendChild(avatarFrame);
    left.appendChild(info);

    const badge = document.createElement('span');
    badge.className = `val-badge ${val.status.toLowerCase()}`;
    badge.textContent = val.status === 'YEA' ? 'YEA' : 'NAY';

    card.appendChild(left);
    card.appendChild(badge);

    validatorGrid.appendChild(card);
  });
}

const SUBDOMAIN_PREFIXES = [
  'validator.xrpl.',
  'xrpl.validator.',
  'xrp-validator.',
  'ripplevalidator.',
  'validator.',
  'xrpl.',
  'ripple.'
];

function formatValidatorName(domain: string, maxLen = 22): string {
  if (!domain) return 'Unknown Validator';
  let clean = domain.trim();

  // Check if it's a raw master public key or long hash without domain dots
  if (!clean.includes('.') && clean.length > 16) {
    return `${clean.slice(0, 8)}...${clean.slice(-6)}`;
  }

  // Strip generic validator subdomains if present to preserve their root identity
  const lower = clean.toLowerCase();
  for (const prefix of SUBDOMAIN_PREFIXES) {
    if (lower.startsWith(prefix)) {
      const remainder = clean.slice(prefix.length);
      // Ensure we don't reduce a domain to just a TLD (e.g. keep "ripple.com")
      if (remainder.includes('.')) {
        clean = remainder;
      }
      break;
    }
  }

  // If still exceeding max length and truncation is required, truncate subdomains from start rather than cutting off the root domain
  if (clean.length > maxLen && clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join('.');
      const sub = parts.slice(0, -2).join('.');
      const availableSub = maxLen - rootDomain.length - 4;
      if (availableSub > 2) {
        clean = `${sub.slice(0, availableSub)}...${rootDomain}`;
      } else {
        clean = `...${rootDomain}`;
      }
    } else {
      clean = `${clean.slice(0, maxLen - 3)}...`;
    }
  }

  return clean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function displayFatalError(err: unknown) {
  const container = document.querySelector('.container');
  if (!container) return;
  const msg = err instanceof Error ? err.message : String(err);
  container.innerHTML = `
    <header class="header">
      <h1 class="title-wen" style="color: #ef4444;">error!</h1>
      <div class="subtitle" style="color: #f87171;">XRPL LIVE API FAILED</div>
    </header>
    <div class="hero-card" style="border-color: #ef4444; box-shadow: 0 0 24px rgba(239, 68, 68, 0.4); text-align: center; padding: 2.5rem 1.5rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🚨</div>
      <h2 style="font-family: var(--font-pixel); font-size: 1rem; color: #ef4444; margin-bottom: 1rem;">LIVE TELEMETRY UNAVAILABLE</h2>
      <p style="font-family: var(--font-silkscreen); color: #fca5a5; font-size: 0.9rem; line-height: 1.6; max-width: 600px; margin: 0 auto 1.5rem;">
        ${escapeHtml(msg)}
      </p>
      <p style="font-family: var(--font-pixel); font-size: 0.65rem; color: #94a3b8; margin-bottom: 2rem;">
        No fake or cached fallback data is permitted. If the API is offline or rate-limited, live consensus telemetry cannot be displayed.
      </p>
      <button onclick="location.reload()" style="font-family: var(--font-pixel); background: #ef4444; color: #ffffff; border: none; padding: 0.85rem 1.5rem; font-size: 0.8rem; cursor: pointer; border-radius: 4px; box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);">
        🔄 RETRY CONNECTION
      </button>
    </div>
  `;
}

// Start application
init();
