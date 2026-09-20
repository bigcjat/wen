import './style.css';
import type { RawAmendment, DetailedAmendment, EnrichedValidator } from './types';
import { fetchAllAmendments, fetchAmendmentDetails, FEATURE_INFO } from './services/api';
import { getFaviconCandidates, getFallbackMonogram } from './services/favicon';
import { fireConfetti } from './services/confetti';

// App State
let activeAmendments: RawAmendment[] = [];
let selectedAmendment: RawAmendment | null = null;
let currentDetails: DetailedAmendment | null = null;
let currentValidators: EnrichedValidator[] = [];
let currentFilter: 'ALL' | 'YEA' | 'NAY' = 'ALL';
let countdownInterval: number | null = null;

// DOM Elements
const dropdownTrigger = document.getElementById('dropdownTrigger') as HTMLButtonElement;
const dropdownMenu = document.getElementById('dropdownMenu') as HTMLDivElement;
const selectedFeatureName = document.getElementById('selectedFeatureName') as HTMLSpanElement;
const selectedXlsTag = document.getElementById('selectedXlsTag') as HTMLSpanElement;
const activeCountBadge = document.getElementById('activeCountBadge') as HTMLSpanElement;
const pillsStrip = document.getElementById('pillsStrip') as HTMLDivElement;
const amendmentsOverviewGrid = document.getElementById('amendmentsOverviewGrid') as HTMLDivElement;
const overviewBadge = document.getElementById('overviewBadge') as HTMLSpanElement;

const featureHeadline = document.getElementById('featureHeadline') as HTMLHeadingElement;
const featureXlsBadge = document.getElementById('featureXlsBadge') as HTMLSpanElement;
const featureStatusPill = document.getElementById('featureStatusPill') as HTMLSpanElement;
const featureStatusText = document.getElementById('featureStatusText') as HTMLSpanElement;
const featureDescription = document.getElementById('featureDescription') as HTMLParagraphElement;

const voteCount = document.getElementById('voteCount') as HTMLSpanElement;
const percentageDisplay = document.getElementById('percentageDisplay') as HTMLDivElement;
const progressFill = document.getElementById('progressFill') as HTMLDivElement;

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
    console.error('Failed to load amendments', err);
  }

  if (activeAmendments.length === 0) return;

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

    const card = document.createElement('div');
    card.className = `overview-card ${isSelected ? 'active' : ''}`;

    card.innerHTML = `
      <div>
        <div class="ov-meta-row">
          <span class="ov-sub">${amendment.xls ? escapeHtml(amendment.xls) : 'Protocol Patch'}</span>
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

  // Update dropdown button header
  selectedFeatureName.textContent = amendment.name;
  selectedXlsTag.textContent = amendment.xls || 'AMENDMENT';

  // Update Hero Basic Info
  featureHeadline.textContent = amendment.name;
  featureXlsBadge.textContent = amendment.xls || 'XRPL';

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

  // Fetch full vote details (who is voting yea and nay)
  try {
    currentDetails = await fetchAmendmentDetails(amendment.name);
  } catch (err) {
    console.error('Error fetching amendment details', err);
    currentDetails = null;
  }

  updateProgressAndStatus();
  processValidators();
  renderValidators();
}

function updateProgressAndStatus() {
  if (!selectedAmendment) return;

  const count = currentDetails?.count ?? selectedAmendment.count;
  const total = currentDetails?.validations ?? selectedAmendment.validations ?? 35;
  const threshold = currentDetails?.threshold ?? selectedAmendment.threshold ?? 28;
  const majority = currentDetails?.majority ?? selectedAmendment.majority;
  const isJustActivated = selectedAmendment.isJustActivated || selectedAmendment.enabled;

  const percentage = Math.round((count / total) * 1000) / 10;
  const isActivating = majority != null && !isJustActivated;

  // Update Progress Bar
  voteCount.textContent = String(count);

  if (isJustActivated) {
    percentageDisplay.textContent = '100% ACTIVATED';
    progressFill.style.width = '100%';
    progressFill.className = 'progress-fill just-activated';

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

    // Fire celebratory confetti when viewing an amendment activated within 48h!
    fireConfetti(140);
  } else {
    percentageDisplay.textContent = `${percentage}%`;
    progressFill.style.width = `${Math.min(100, percentage)}%`;

    if (percentage >= 80) {
      progressFill.className = 'progress-fill majority';
    } else {
      progressFill.className = 'progress-fill';
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
    info.innerHTML = `
      <span class="val-domain" title="${escapeHtml(val.domain)}">${escapeHtml(val.domain)}</span>
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start application
init();
