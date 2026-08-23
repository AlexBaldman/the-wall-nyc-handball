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

function sampleCoach() {
  const state = coach.getState();
  if (!state) return null;
  telemetry = ONE_WALL_HANDBALL.recordCoachTelemetry(telemetry, state);
  return summary();
}

function frame(timestamp) {
  if (timestamp - lastSample >= SAMPLE_INTERVAL_MS) {
    sampleCoach();
    lastSample = timestamp;
  }
  window.requestAnimationFrame(frame);
}

window.__THE_WALL_INTERCEPT_TELEMETRY__ = {
  getRaw: () => telemetry,
  getSummary: summary,
  getDiagnostic: diagnostic,
  sample: sampleCoach,
  reset: () => {
    telemetry = ONE_WALL_HANDBALL.createCoachTelemetry();
    return summary();
  },
};

window.requestAnimationFrame(frame);
