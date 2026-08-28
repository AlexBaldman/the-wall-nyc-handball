import {
  groupPlaytestReports,
  summarizePlaytestCohort,
  validatePlaytestSessionReport,
} from '../playtest/session-report.js';
import { evaluateAllHandballTuningPacks } from '../sports/handball/playtest-tuning-packs.js';

const ui = Object.fromEntries([
  'reportFiles',
  'clearReports',
  'sourceStatus',
  'sourceDetail',
  'importMessages',
  'confidenceNote',
  'sessionsMetric',
  'completedMetric',
  'cleanMetric',
  'rallyMetric',
  'reachableMetric',
  'movementMetric',
  'transitionMetric',
  'groupDimension',
  'cohortTableBody',
  'contactBreakdown',
  'spacingBreakdown',
  'pointBreakdown',
  'candidatePacks',
].map((id) => [id, document.getElementById(id)]));

const LABELS = Object.freeze({
  palm: 'Open palm',
  topspin: 'Topspin',
  backspin: 'Backspin',
  fist: 'Fist',
  jammed: 'Jammed',
  balanced: 'Balanced',
  stretched: 'Stretched',
  'second-bounce': 'Second bounce',
  'wall-out': 'Wall out',
  'short-serve': 'Short serve',
  'long-serve': 'Long serve',
  'outside-serve': 'Outside serve',
  'serve-down': 'Down serve',
  'double-fault': 'Double fault',
  unreachable: 'Unreachable',
});

const state = {
  reports: [],
  messages: [],
};

function percent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—';
}

function decimal(value, suffix = '', digits = 1) {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—';
}

function labelFor(value) {
  return LABELS[value] ?? String(value).replaceAll('-', ' ');
}

function reportKey(report) {
  return [
    report.generatedAt,
    report.build.revision,
    report.session.difficulty,
    report.session.inputMode,
    report.match.winner,
    JSON.stringify(report.match.scores),
  ].join('|');
}

function appendMessage(kind, text) {
  state.messages.push({ kind, text });
}

function importPayloads(entries, { replace = false } = {}) {
  if (replace) {
    state.reports = [];
    state.messages = [];
  }
  const seen = new Set(state.reports.map(reportKey));
  for (const entry of entries) {
    const name = entry.name ?? 'Untitled report';
    const result = validatePlaytestSessionReport(entry.payload);
    if (!result.ok) {
      appendMessage('error', `${name}: ${result.errors.join(' ')}`);
      continue;
    }
    const key = reportKey(result.report);
    if (seen.has(key)) {
      appendMessage('warning', `${name}: duplicate session skipped.`);
      continue;
    }
    seen.add(key);
    state.reports.push(result.report);
    for (const warning of result.warnings) appendMessage('warning', `${name}: ${warning}`);
  }
  render();
  return getState();
}

function renderMessages() {
  ui.importMessages.replaceChildren(...state.messages.map(({ kind, text }) => {
    const item = document.createElement('li');
    item.className = kind;
    item.textContent = text;
    return item;
  }));
}

function renderSummary(summary) {
  ui.sessionsMetric.textContent = String(summary.sessions);
  ui.completedMetric.textContent = `${summary.completedMatches} completed · ${percent(summary.winRate)} wins`;
  ui.cleanMetric.textContent = percent(summary.cleanContactRate);
  ui.rallyMetric.textContent = decimal(summary.averageRallyContacts);
  ui.reachableMetric.textContent = percent(summary.reachableRate);
  ui.movementMetric.textContent = decimal(summary.averageMovementDemandMeters, ' m', 2);
  ui.transitionMetric.textContent = decimal(summary.cueTransitionsPer100Samples);
  ui.sourceStatus.textContent = summary.sessions === 1 ? '1 report loaded' : `${summary.sessions} reports loaded`;
  ui.sourceDetail.textContent = summary.sessions
    ? `${new Set(state.reports.map((report) => report.build.revision)).size} build revision(s) · local memory only`
    : 'Waiting for local files.';
  ui.confidenceNote.textContent = summary.confidence === 'reviewable'
    ? `${summary.sessions} sessions meet the minimum review floor. Inspect cohort sizes before comparing.`
    : `Small sample: ${summary.sessions}/3 sessions loaded. Patterns are descriptive only.`;
}

function renderCohorts() {
  const groups = groupPlaytestReports(state.reports, ui.groupDimension.value);
  if (!groups.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" class="empty">Load reports to compare cohorts.</td>';
    ui.cohortTableBody.replaceChildren(row);
    return;
  }
  ui.cohortTableBody.replaceChildren(...groups.map((group) => {
    const row = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.append(document.createTextNode(labelFor(group.label)));
    if (group.confidence === 'small-sample') {
      const badge = document.createElement('span');
      badge.className = 'sample-badge';
      badge.textContent = 'small sample';
      labelCell.append(badge);
    }
    const values = [
      group.sessions,
      percent(group.winRate),
      percent(group.cleanContactRate),
      decimal(group.averageRallyContacts),
      percent(group.reachableRate),
      decimal(group.averageMovementDemandMeters, ' m', 2),
    ];
    row.append(labelCell, ...values.map((value) => {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      return cell;
    }));
    return row;
  }));
}

function renderBars(container, counts, emptyText) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = emptyText;
    container.replaceChildren(empty);
    return;
  }
  const max = Math.max(...entries.map(([, count]) => count));
  container.replaceChildren(...entries.map(([key, count]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const label = document.createElement('span');
    label.textContent = labelFor(key);
    const track = document.createElement('span');
    track.className = 'bar-track';
    const fill = document.createElement('i');
    fill.className = 'bar-fill';
    fill.style.width = `${count / max * 100}%`;
    track.append(fill);
    const value = document.createElement('strong');
    value.textContent = String(count);
    row.append(label, track, value);
    return row;
  }));
}

function renderCandidates() {
  const packs = evaluateAllHandballTuningPacks();
  ui.candidatePacks.replaceChildren(...packs.map((pack) => {
    const card = document.createElement('article');
    card.className = 'candidate-card';
    const free = pack.profiles.free;
    const prepared = pack.profiles.prepared;
    const warnings = pack.warnings.length
      ? `<p class="candidate-warning">Caution: ${pack.warnings.join(' ')}</p>`
      : '';
    card.innerHTML = `
      <span class="gate ${pack.gate === 'failed' ? 'failed' : ''}">${pack.gate} benchmark gate</span>
      <h3>${pack.label}</h3>
      <p>${pack.hypothesis}</p>
      <div class="candidate-meta">
        <span>Free · ${free.maxSpeed.toFixed(2)} m/s · ${free.responseRate.toFixed(2)} response</span>
        <span>Prepared · ${prepared.maxSpeed.toFixed(2)} m/s · ${prepared.responseRate.toFixed(2)} response</span>
      </div>
      ${warnings}`;
    return card;
  }));
}

function render() {
  const summary = summarizePlaytestCohort(state.reports);
  renderSummary(summary);
  renderMessages();
  renderCohorts();
  renderBars(ui.contactBreakdown, summary.contactTypes, 'No contact evidence yet.');
  renderBars(ui.spacingBreakdown, summary.spacingTypes, 'No spacing evidence yet.');
  renderBars(ui.pointBreakdown, summary.pointReasons, 'No rally evidence yet.');
}

async function importFiles(files) {
  const entries = await Promise.all([...files].map(async (file) => {
    try {
      return { name: file.name, payload: JSON.parse(await file.text()) };
    } catch (error) {
      return { name: file.name, parseError: error instanceof Error ? error.message : String(error) };
    }
  }));
  const validEntries = [];
  for (const entry of entries) {
    if (entry.parseError) appendMessage('error', `${entry.name}: invalid JSON (${entry.parseError}).`);
    else validEntries.push(entry);
  }
  importPayloads(validEntries);
  ui.reportFiles.value = '';
}

function getState() {
  return JSON.parse(JSON.stringify(state));
}

ui.reportFiles.addEventListener('change', () => importFiles(ui.reportFiles.files));
ui.clearReports.addEventListener('click', () => {
  state.reports = [];
  state.messages = [];
  render();
});
ui.groupDimension.addEventListener('change', renderCohorts);

renderCandidates();
render();

window.__THE_WALL_PLAYTEST_REVIEW__ = Object.freeze({
  getState,
  importPayloads,
});
