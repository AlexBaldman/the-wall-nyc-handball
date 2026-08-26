const REPORT_TYPE = 'the-wall-mvp-session';
const SCHEMA_VERSION = 1;

function waitForApis() {
  return new Promise((resolve) => {
    const check = () => {
      const lab = window.__THE_WALL_LAB__;
      const coach = window.__THE_WALL_INTERCEPT_TELEMETRY__;
      if (
        lab?.getMatch
        && lab?.getMatchStats
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

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createSessionReport({ lab, coach }, generatedAt = new Date()) {
  const mvpState = window.__THE_WALL_MVP__?.getState?.() ?? null;
  const match = lab.getMatch();
  const matchStats = lab.getMatchStats();
  const coachSummary = coach.getSummary();
  const coachDiagnostic = coach.getDiagnostic();

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    type: REPORT_TYPE,
    generatedAt: generatedAt.toISOString(),
    session: Object.freeze({
      difficulty: lab.getDifficulty(),
      inputMode: mvpState?.inputMode ?? null,
      firstRun: mvpState?.firstRun ?? null,
    }),
    match: Object.freeze({
      targetScore: match?.targetScore ?? null,
      scores: clone(match?.scores ?? null),
      winner: match?.matchWinner ?? null,
      server: match?.server ?? null,
      pointWinner: match?.pointWinner ?? null,
      phase: match?.phase ?? null,
    }),
    performance: Object.freeze(clone(matchStats)),
    coaching: Object.freeze({
      summary: clone(coachSummary),
      diagnostic: clone(coachDiagnostic),
    }),
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
  button.title = 'Export match stats plus coaching diagnostics for playtesting';
  button.addEventListener('click', download);
  replayButton.after(button);
  return button;
}

const apis = await waitForApis();

function report(generatedAt = new Date()) {
  return createSessionReport(apis, generatedAt);
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
  type: REPORT_TYPE,
  schemaVersion: SCHEMA_VERSION,
};
