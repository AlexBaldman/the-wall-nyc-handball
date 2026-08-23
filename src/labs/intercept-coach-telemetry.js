import { ONE_WALL_HANDBALL } from '../sports/handball/sport-pack.js';

const SAMPLE_INTERVAL_MS = 100;

function waitForCoach() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.__THE_WALL_INTERCEPT_COACH__?.getState) {
        resolve(window.__THE_WALL_INTERCEPT_COACH__);
      } else {
        window.requestAnimationFrame(check);
      }
    };
    check();
  });
}

const coach = await waitForCoach();
let telemetry = ONE_WALL_HANDBALL.createCoachTelemetry();
let lastSample = -Infinity;

function summary() {
  return ONE_WALL_HANDBALL.summarizeCoachTelemetry(telemetry);
}

function diagnostic() {
  return ONE_WALL_HANDBALL.diagnoseCoachTelemetry(summary());
}

function report(generatedAt = new Date()) {
  return ONE_WALL_HANDBALL.createCoachReport({
    generatedAt,
    summary: summary(),
    diagnostic: diagnostic(),
  });
}

function sampleCoach() {
  const state = coach.getState();
  if (!state) return null;
  telemetry = ONE_WALL_HANDBALL.recordCoachTelemetry(telemetry, state);
  return summary();
}

function downloadReport() {
  const payload = report();
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `the-wall-coach-${stamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return payload;
}

function installReportButton() {
  const topline = document.querySelector('.intercept-coach__topline');
  if (!topline || topline.querySelector('.intercept-coach__report')) return;

  const style = document.createElement('style');
  style.textContent = `
    .intercept-coach__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
    }
    .intercept-coach__report {
      appearance: none;
      padding: 0;
      border: 0;
      background: transparent;
      color: rgba(255,255,255,0.52);
      cursor: pointer;
      font: 650 10px/1.1 "Space Grotesk", system-ui, sans-serif;
    }
    .intercept-coach__report:hover,
    .intercept-coach__report:focus-visible {
      color: rgba(185,255,102,0.95);
    }
  `;
  document.head.append(style);

  const tuneLink = topline.querySelector('a');
  const actions = document.createElement('span');
  actions.className = 'intercept-coach__actions';
  if (tuneLink) actions.append(tuneLink);
  const button = document.createElement('button');
  button.className = 'intercept-coach__report';
  button.type = 'button';
  button.textContent = 'Report ↓';
  button.title = 'Download coaching playtest report';
  button.addEventListener('click', downloadReport);
  actions.append(button);
  topline.append(actions);
}

function frame(timestamp) {
  if (timestamp - lastSample >= SAMPLE_INTERVAL_MS) {
    sampleCoach();
    lastSample = timestamp;
  }
  window.requestAnimationFrame(frame);
}

installReportButton();

window.__THE_WALL_INTERCEPT_TELEMETRY__ = {
  getRaw: () => telemetry,
  getSummary: summary,
  getDiagnostic: diagnostic,
  getReport: report,
  downloadReport,
  sample: sampleCoach,
  reset: () => {
    telemetry = ONE_WALL_HANDBALL.createCoachTelemetry();
    return summary();
  },
};

window.requestAnimationFrame(frame);
