import {
  createPlaytestSessionReport,
  PLAYTEST_REPORT_SCHEMA_VERSION,
  PLAYTEST_REPORT_TYPE,
} from '../playtest/session-report.js';

const FALLBACK_BUILD = Object.freeze({
  version: 'unknown',
  revision: 'development',
  channel: 'local',
});

function waitForApis() {
  return new Promise((resolve) => {
    const check = () => {
      const lab = window.__THE_WALL_LAB__;
      const coach = window.__THE_WALL_INTERCEPT_TELEMETRY__;
      if (
        lab?.getMatch
        && lab?.getMatchStats
        && lab?.getPlaytestContext
        && lab?.getDifficulty
        && coach?.getSummary
        && coach?.getDiagnostic
      ) {
        resolve({ lab, coach });
      } else {
        window.requestAnimationFrame(check);
      }
    };
    check();
  });
}

async function loadBuildMetadata() {
  try {
    const response = await fetch('build.json', { cache: 'no-store' });
    if (!response.ok) return FALLBACK_BUILD;
    const value = await response.json();
    return Object.freeze({
      version: String(value.version ?? FALLBACK_BUILD.version),
      revision: String(value.revision ?? FALLBACK_BUILD.revision),
      channel: String(value.channel ?? FALLBACK_BUILD.channel),
    });
  } catch {
    return FALLBACK_BUILD;
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createSessionReport({ lab, coach, build }, generatedAt = new Date()) {
  const mvpState = window.__THE_WALL_MVP__?.getState?.() ?? null;
  const match = lab.getMatch();
  const performance = lab.getMatchStats();
  const context = lab.getPlaytestContext();

  return createPlaytestSessionReport({
    generatedAt,
    build,
    sport: {
      id: 'american-handball-one-wall',
      physicsProfileId: context.physicsProfileId,
    },
    tuning: {
      packId: context.tuningPackId,
      movement: clone(context.movement),
      ghostProfile: clone(context.ghostProfile),
      physicsCoefficients: clone(context.physicsCoefficients),
    },
    session: {
      difficulty: lab.getDifficulty(),
      inputMode: mvpState?.inputMode ?? null,
      firstRun: mvpState?.firstRun ?? null,
      tempoScale: context.tempoScale,
      cameraId: context.cameraId,
    },
    match: {
      targetScore: match?.targetScore ?? null,
      scores: clone(match?.scores ?? null),
      winner: match?.matchWinner ?? null,
      server: match?.server ?? null,
      pointWinner: match?.pointWinner ?? null,
      phase: match?.phase ?? null,
    },
    performance,
    coaching: {
      summary: clone(coach.getSummary()),
      diagnostic: clone(coach.getDiagnostic()),
    },
  });
}

function downloadJson(payload) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `the-wall-mvp-session-${stamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function installButton(download) {
  const replayButton = document.getElementById('exportReplayButton');
  if (!replayButton || document.getElementById('mvpSessionReportButton')) return null;

  const button = document.createElement('button');
  button.id = 'mvpSessionReportButton';
  button.type = 'button';
  button.textContent = 'Download MVP session JSON';
  button.title = 'Export versioned match evidence plus coaching diagnostics for playtesting';
  button.addEventListener('click', download);
  replayButton.after(button);
  return button;
}

const [apis, build] = await Promise.all([waitForApis(), loadBuildMetadata()]);
const sources = Object.freeze({ ...apis, build });

function report(generatedAt = new Date()) {
  return createSessionReport(sources, generatedAt);
}

function download() {
  const payload = report();
  downloadJson(payload);
  return payload;
}

installButton(download);

window.__THE_WALL_MVP_PLAYTEST__ = {
  getReport: report,
  downloadReport: download,
  type: PLAYTEST_REPORT_TYPE,
  schemaVersion: PLAYTEST_REPORT_SCHEMA_VERSION,
};
