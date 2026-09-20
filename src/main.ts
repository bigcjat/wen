import './style.css';
import type { RawAmendment, DetailedAmendment, EnrichedValidator } from './types';
import { fetchAllAmendments, fetchAmendmentDetails, FEATURE_INFO, getXlsUrl, calculateVersionStats, type VersionStats } from './services/api';
import { getFaviconCandidates, getFallbackMonogram } from './services/favicon';
import { fireConfetti } from './services/confetti';

// App State
let activeAmendments: RawAmendment[] = [];
let selectedAmendment: RawAmendment | null = null;
let currentDetails: DetailedAmendment | null = null;
let currentValidators: EnrichedValidator[] = [];
let currentVersionStats: VersionStats | null = null;
let currentFilter: 'ALL' | 'YEA' | 'NAY' = 'ALL';
let countdownInterval: number | null = null;

const RETRO_NAMES: Record<string, { wen: string; title: string }> = {
  BatchV1_1: { wen: 'wen batch?', title: 'ATOMIC BATCH' },
  PermissionDelegationV1_1: { wen: 'wen delegate?', title: 'PERMISSION DELEGATION' },
  SingleAssetVault: { wen: 'wen vault?', title: 'SINGLE ASSET VAULT' },
  ConfidentialTransfer: { wen: 'wen privacy?', title: 'CONFIDENTIAL TRANSFERS' },
  DynamicMPT: { wen: 'wen mpt?', title: 'DYNAMIC MPT' },
  LendingProtocolV1_1: { wen: 'wen lend?', title: 'LENDING PROTOCOL' },
  Sponsor: { wen: 'wen sponsor?', title: 'RESERVE SPONSOR' },
  XChainBridge: { wen: 'wen bridge?', title: 'CROSS-CHAIN BRIDGE' },
  fixCleanup3_4_0: { wen: 'wen 3.4.0?', title: 'CLEANUP PATCH' },
  fixXChainRewardRounding: { wen: 'wen fix?', title: 'REWARD ROUNDING FIX' }
};

// DOM Elements
const appTitle = document.getElementById('appTitle') as HTMLHeadingElement;
const subtitleXls = document.getElementById('subtitleXls') as HTMLSpanElement;
const subtitleFeature = document.getElementById('subtitleFeature') as HTMLSpanElement;

const dropdownTrigger = document.getElementById('dropdownTrigger') as HTMLButtonElement;
const dropdownMenu = document.getElementById('dropdownMenu') as HTMLDivElement;
const selectedFeatureName = document.getElementById('selectedFeatureName') as HTMLSpanElement;
const selectedXlsTag = document.getElementById('selectedXlsTag') as HTMLSpanElement;
const activeCountBadge = document.getElementById('activeCountBadge') as HTMLSpanElement;
const pillsStrip = document.getElementById('pillsStrip') as HTMLDivElement;
const amendmentsOverviewGrid = document.getElementById('amendmentsOverviewGrid') as HTMLDivElement;
const overviewBadge = document.getElementById('overviewBadge') as HTMLSpanElement;

const featureHeadline = document.getElementById('featureHeadline') as HTMLHeadingElement;
const featureXlsBadge = document.getElementById('featureXlsBadge') as HTMLAnchorElement;
const featureSpecBtn = document.getElementById('featureSpecBtn') as HTMLAnchorElement;
const featureStatusPill = document.getElementById('featureStatusPill') as HTMLSpanElement;
const featureStatusText = document.getElementById('featureStatusText') as HTMLSpanElement;
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
const calloutIcon = document.getElementById('calloutIcon') as HTMLDivElement;
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

// Initialization
async function init() {
  setupEventListeners();

  try {
    activeAmendments = await fetchAllAmendments();
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
  renderPills();
  renderOverviewGrid();

  // Prefer BatchV1_1 if available, otherwise first item
  const initial = activeAmendments.find((a) => a.name === 'BatchV1_1') || activeAmendments[0];
  await selectAmendment(initial);
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

  // Tab filtering
  tabAll.addEventListener('click', () => setValidatorFilter('ALL'));
  tabYea.addEventListener('click', () => setValidatorFilter('YEA'));
  tabNay.addEventListener('click', () => setValidatorFilter('NAY'));
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

    item.innerHTML = `
      <div class="item-main">
        <span class="item-name">${escapeHtml(amendment.name)}</span>
        <span class="item-sub">${amendment.xls ? escapeHtml(amendment.xls) : 'Protocol Patch'} • ${amendment.count}/${amendment.threshold} votes</span>
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

function renderPills() {
  pillsStrip.innerHTML = '';

  activeAmendments.forEach((amendment) => {
    const isSelected = selectedAmendment?.name === amendment.name;
    const isJustActivated = amendment.isJustActivated || amendment.enabled;
    const isActivating = amendment.majority != null && !isJustActivated;
    const pill = document.createElement('button');
    pill.className = `feature-pill ${isSelected ? 'active' : ''} ${isJustActivated ? 'just-activated' : (isActivating ? 'activating' : '')}`;
    pill.setAttribute('role', 'tab');
    pill.setAttribute('aria-selected', String(isSelected));

    pill.innerHTML = `
      <span>${isJustActivated ? '🎉 ' : ''}${escapeHtml(amendment.name)}</span>
      <span class="pill-count">${isJustActivated ? '100%' : `${amendment.count}/${amendment.threshold}`}</span>
    `;

    pill.addEventListener('click', () => {
      selectAmendment(amendment);
    });

    pillsStrip.appendChild(pill);
  });
}

function renderOverviewGrid() {
  amendmentsOverviewGrid.innerHTML = '';

  activeAmendments.forEach((amendment) => {
    const isSelected = selectedAmendment?.name === amendment.name;
    const isJustActivated = amendment.isJustActivated || amendment.enabled;
    const isActivating = amendment.majority != null && !isJustActivated;
    const count = amendment.count;
    const total = amendment.validations || 35;
    const pct = isJustActivated ? 100 : Math.round((count / total) * 1000) / 10;

    const badgeClass = isJustActivated ? 'just-activated' : (isActivating ? 'activating' : 'voting');
    const badgeText = isJustActivated ? '🎉 ACTIVATED' : (isActivating ? 'ACTIVATING' : 'VOTING');
    const isLongName = amendment.name.length > 18;
    const specUrl = getXlsUrl(amendment) || 'https://github.com/XRPLF/XRPL-Standards/discussions';

    const card = document.createElement('div');
    card.className = `overview-card ${isSelected ? 'active' : ''}`;

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
          <span class="ov-tally-num">${isJustActivated ? '35' : count} <span style="font-size: 0.72rem; color: var(--text-muted);">/ ${total}</span></span>
          <span class="ov-pct">${pct}%</span>
        </div>
        <div class="ov-mini-track">
          <div class="ov-mini-fill ${isJustActivated ? 'majority' : (pct >= 80 ? 'majority' : '')}" style="width: ${pct}%;"></div>
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

async function selectAmendment(amendment: RawAmendment) {
  selectedAmendment = amendment;
  renderDropdownMenu();
  renderPills();
  renderOverviewGrid();

  // Update Retro Title & Subtitle (matching the screenshot style!)
  const retroInfo = RETRO_NAMES[amendment.name] || {
    wen: `wen ${amendment.name.toLowerCase().slice(0, 8)}?`,
    title: amendment.name.toUpperCase()
  };
  if (appTitle) appTitle.textContent = retroInfo.wen;
  if (subtitleXls) subtitleXls.textContent = amendment.xls ? amendment.xls.replace('-', '') : 'XRPL';
  if (subtitleFeature) subtitleFeature.textContent = retroInfo.title;

  // Update dropdown button header
  selectedFeatureName.textContent = amendment.name;
  selectedXlsTag.textContent = amendment.xls || 'AMENDMENT';

  // Update Hero Basic Info
  featureHeadline.textContent = amendment.name;

  // Update XLS Spec Links
  const specUrl = getXlsUrl(amendment) || 'https://github.com/XRPLF/XRPL-Standards/discussions';
  if (featureXlsBadge) {
    featureXlsBadge.href = specUrl;
    featureXlsBadge.innerHTML = `
      <span>${escapeHtml(amendment.xls || 'AMENDMENT')}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
    `;
    featureXlsBadge.title = `Read official ${amendment.xls || amendment.name} specification`;
  }

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
  
  const info = FEATURE_INFO[amendment.name];
  if (info) {
    featureDescription.textContent = `${info.summary} ${info.impact}`;
  } else {
    featureDescription.textContent = `XRPL protocol amendment ${amendment.name}. Requires 80%+1 validator consensus for 14 continuous days.`;
  }

  const reqVer = amendment.introduced || '3.3.0';

  // Fetch full vote details (who is voting yea and nay)
  try {
    currentDetails = await fetchAmendmentDetails(amendment.name);
  } catch (err) {
    console.error('Error fetching amendment details', err);
    currentDetails = null;
  }

  // Calculate software versions across all validators and UNL
  try {
    currentVersionStats = await calculateVersionStats(reqVer);
  } catch (err) {
    console.error('Error calculating version stats', err);
    currentVersionStats = null;
  }

  // Trigger pixel-by-pixel stepped arcade filling animation
  const fillBars = [retroBar1Fill, retroNodesFill, progressFill, segmentYes, segmentNo, segmentUnvoted];
  fillBars.forEach((b) => {
    if (b) {
      b.style.transition = 'none';
      b.style.width = '0%';
    }
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fillBars.forEach((b) => {
        if (b) b.style.transition = 'width 1.2s steps(28, end)';
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
  const total = currentDetails?.validations ?? selectedAmendment.validations ?? 35;
  const threshold = currentDetails?.threshold ?? selectedAmendment.threshold ?? 28;
  const majority = currentDetails?.majority ?? selectedAmendment.majority;
  const isJustActivated = selectedAmendment.isJustActivated || selectedAmendment.enabled;

  const percentage = Math.round((count / total) * 1000) / 10;
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
    segmentYes.style.width = `${pctYea}%`;
    segmentYes.textContent = pctYea >= 12 ? `YES (${pctYea}%)` : (pctYea > 0 ? `${pctYea}%` : '');
  }
  if (segmentNo) {
    segmentNo.style.width = `${pctNay}%`;
    segmentNo.textContent = pctNay >= 12 ? `NO (${pctNay}%)` : (pctNay > 0 ? `${pctNay}%` : '');
  }
  if (segmentUnvoted) {
    segmentUnvoted.style.width = `${pctOutdated}%`;
    segmentUnvoted.textContent = pctOutdated >= 15 ? `OUTDATED (${pctOutdated}%)` : (pctOutdated > 0 ? `${pctOutdated}%` : '');
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

    featureStatusPill.className = 'status-pill just-activated';
    featureStatusText.textContent = '🎉 JUST ACTIVATED (<48H)';
    statusCallout.className = 'status-callout activating';
    calloutIcon.textContent = '🎊';
    calloutTitle.textContent = '🎉 Amendment Officially Activated on Mainnet!';
    calloutSubtitle.textContent = selectedAmendment.enabled_on
      ? `Successfully enabled on ${new Date(selectedAmendment.enabled_on).toUTCString()} (Ledger #${selectedAmendment.enabled_in_ledger || 'confirmed'}). Showing for 48 hours.`
      : 'This amendment has cleared the 14-day lock and is now permanently active on the XRPL!';
    countdownBox.style.display = 'none';
    stopCountdown();

    fireConfetti(140);
  } else {
    percentageDisplay.textContent = `${pctYea}% YES`;

    if (percentage >= 80) {
      progressFill.className = 'retro-fill majority';
    } else {
      progressFill.className = 'retro-fill';
    }

    // Update Status Pill
    if (isActivating) {
      featureStatusPill.className = 'status-pill activating';
      featureStatusText.textContent = 'ACTIVATING (14-DAY LOCK)';
      statusCallout.className = 'status-callout activating';
      calloutIcon.textContent = '⚡';
      calloutTitle.textContent = 'Majority Achieved: Activation Countdown Active';
      calloutSubtitle.textContent = 'This feature has sustained >80% validator support and is scheduled to activate on-ledger.';
      countdownBox.style.display = 'flex';
      startCountdown(majority!);
    } else {
      featureStatusPill.className = 'status-pill voting';
      featureStatusText.textContent = 'VOTING IN PROGRESS';
      statusCallout.className = 'status-callout voting';
      calloutIcon.textContent = '🗳️';
      
      const needed = Math.max(0, threshold - count);
      calloutTitle.textContent = needed > 0 
        ? `Needs ${needed} More Vote${needed > 1 ? 's' : ''} to Reach 80% Consensus`
        : 'At Threshold: Awaiting Flag Ledger';
      calloutSubtitle.textContent = `Current tally is ${count} of ${total} validators. Once 28 votes (>80%) are maintained, a 14-day lock begins.`;
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
    currentValidators = [];
    return;
  }

  const voters = currentDetails.voters || [];
  const vetoers = currentDetails.vetoers || [];

  const list: EnrichedValidator[] = [];

  voters.forEach((v) => {
    const domain = v.domain || v.domain_legacy || (v.master_key ? v.master_key.slice(0, 16) : 'Unknown Validator');
    list.push({
      key: v.master_key || domain,
      domain: domain,
      status: 'YEA',
      faviconUrl: domain
    });
  });

  vetoers.forEach((v) => {
    const domain = v.domain || v.domain_legacy || (v.master_key ? v.master_key.slice(0, 16) : 'Unknown Validator');
    list.push({
      key: v.master_key || domain,
      domain: domain,
      status: 'NAY',
      faviconUrl: domain
    });
  });

  // Sort alphabetically by domain
  list.sort((a, b) => a.domain.localeCompare(b.domain));
  currentValidators = list;

  const yeaCount = list.filter((v) => v.status === 'YEA').length;
  const nayCount = list.filter((v) => v.status === 'NAY').length;

  countAll.textContent = String(list.length);
  countYea.textContent = String(yeaCount);
  countNay.textContent = String(nayCount);
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
    info.innerHTML = `
      <span class="val-domain" title="${escapeHtml(val.domain)}">${escapeHtml(displayDomain)}</span>
      <span class="val-sub">dUNL Validator</span>
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

function formatValidatorName(domain: string): string {
  if (!domain) return 'Unknown Validator';
  const clean = domain.trim();
  // Check if it's a raw master public key or long hash without domain dots
  if (!clean.includes('.') && clean.length > 20) {
    return `${clean.slice(0, 8)}...${clean.slice(-6)}`;
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
