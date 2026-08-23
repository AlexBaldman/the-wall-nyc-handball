import { ONE_WALL_HANDBALL } from '../sports/handball/sport-pack.js';

const UPDATE_INTERVAL_MS = 100;

const COPY = Object.freeze({
  recover: Object.freeze({ label: 'RECOVER', detail: 'Get behind the next return before loading the hand.' }),
  move: Object.freeze({ label: 'MOVE', detail: 'Close the distance before you commit to the swing.' }),
  prepare: Object.freeze({ label: 'SET + LOAD', detail: 'You have a reachable window. Start preparing now.' }),
  hold: Object.freeze({ label: 'HOLD', detail: 'Stay balanced. Let the ball enter your contact window.' }),
  strike: Object.freeze({ label: 'STRIKE', detail: 'The ball is inside the playable contact window.' }),
});

function waitForLab() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.__THE_WALL_LAB__?.getSnapshot) {
        resolve(window.__THE_WALL_LAB__);
      } else {
        window.requestAnimationFrame(check);
      }
    };
    check();
  });
}

function createCoachUi() {
  const viewport = document.getElementById('viewportWrap');
  if (!viewport) return null;

  const style = document.createElement('style');
  style.textContent = `
    .intercept-coach {
      position: absolute;
      right: 16px;
      bottom: 76px;
      z-index: 18;
      width: min(316px, calc(100% - 32px));
      padding: 11px 12px;
      border: 1px solid rgba(185, 255, 102, 0.27);
      border-radius: 14px;
      background: rgba(5, 8, 14, 0.84);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(10px);
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 120ms ease, transform 120ms ease, border-color 120ms ease;
    }
    .intercept-coach.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .intercept-coach[data-cue="strike"] { border-color: rgba(255, 209, 102, 0.72); }
    .intercept-coach[data-cue="prepare"],
    .intercept-coach[data-cue="hold"] { border-color: rgba(110, 231, 242, 0.52); }
    .intercept-coach__topline {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }
    .intercept-coach__topline span {
      color: rgba(255,255,255,0.52);
      font: 700 10px/1.1 "Space Grotesk", system-ui, sans-serif;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }
    .intercept-coach__topline a {
      color: rgba(255,255,255,0.52);
      font: 650 10px/1.1 "Space Grotesk", system-ui, sans-serif;
      text-decoration: none;
      pointer-events: auto;
    }
    .intercept-coach strong {
      display: block;
      color: #ffd166;
      font: 900 22px/0.95 "Barlow Condensed", system-ui, sans-serif;
      letter-spacing: 0.04em;
    }
    .intercept-coach__footwork {
      min-height: 13px;
      margin-top: 5px;
      color: rgba(185,255,102,0.94);
      font: 800 11px/1.15 "Space Grotesk", system-ui, sans-serif;
      letter-spacing: 0.055em;
      text-transform: uppercase;
    }
    .intercept-coach small {
      display: block;
      margin-top: 5px;
      color: rgba(245,247,250,0.82);
      font: 500 11px/1.35 "Space Grotesk", system-ui, sans-serif;
    }
    .intercept-coach__metrics {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 7px;
      color: rgba(185,255,102,0.82);
      font: 650 10px/1.1 "Space Grotesk", system-ui, sans-serif;
    }
    @media (max-width: 620px) {
      .intercept-coach {
        right: 10px;
        bottom: 144px;
        width: min(270px, calc(100% - 20px));
        padding: 9px 10px;
      }
      .intercept-coach strong { font-size: 19px; }
      .intercept-coach small { font-size: 10px; }
      .intercept-coach__footwork { font-size: 10px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .intercept-coach { transition: none; }
    }
  `;
  document.head.append(style);

  const element = document.createElement('aside');
  element.className = 'intercept-coach';
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-label', 'Reachable contact coach');
  element.innerHTML = `
    <div class="intercept-coach__topline">
      <span>Reachable contact</span>
      <a href="intercept.html">Tune ↗</a>
    </div>
    <strong>READ</strong>
    <div class="intercept-coach__footwork"></div>
    <small>Watch the return.</small>
    <div class="intercept-coach__metrics" aria-hidden="true"></div>
  `;
  viewport.append(element);

  return {
    element,
    label: element.querySelector('strong'),
    footwork: element.querySelector('.intercept-coach__footwork'),
    detail: element.querySelector('small'),
    metrics: element.querySelector('.intercept-coach__metrics'),
  };
}

function currentPhysicsCoefficients() {
  const floor = Number.parseFloat(document.getElementById('floorRestitution')?.value);
  const wall = Number.parseFloat(document.getElementById('wallRestitution')?.value);
  const dragPercent = Number.parseFloat(document.getElementById('dragScale')?.value);
  const magnusPercent = Number.parseFloat(document.getElementById('magnusScale')?.value);

  return {
    ...(Number.isFinite(floor) ? { floorRestitution: floor } : {}),
    ...(Number.isFinite(wall) ? { wallRestitution: wall } : {}),
    ...(Number.isFinite(dragPercent) ? { dragScale: dragPercent / 100 } : {}),
    ...(Number.isFinite(magnusPercent) ? { magnusScale: magnusPercent / 100 } : {}),
  };
}

function formatMetrics(plan) {
  if (!plan?.recommended) return '';
  const eta = `${plan.recommended.time.toFixed(2)} s`;
  const height = `${plan.recommended.position.y.toFixed(2)} m high`;
  const margin = `${plan.recommended.reachMarginMeters >= 0 ? '+' : ''}${plan.recommended.reachMarginMeters.toFixed(2)} m margin`;
  return `<span>${eta}</span><span>${height}</span><span>${margin}</span>`;
}

function formatFootwork(guidance) {
  if (!guidance?.available) return '';
  if (guidance.label === 'SET') return 'SET YOUR FEET';
  return `${guidance.label} · ${guidance.movementDistanceMeters.toFixed(2)} m`;
}

function shouldShowCoach(api, snapshot) {
  const entry = document.getElementById('courtEntry');
  if (entry && !entry.classList.contains('is-hidden')) return false;
  if (!snapshot?.ball?.active) return false;

  const match = api.getMatch?.();
  if (match?.active && match.expectedHitter && match.expectedHitter !== 'player') {
    return false;
  }
  return true;
}

function coachState(api, previousCueState) {
  const snapshot = api.getSnapshot();
  const preparing = (snapshot.player?.preparation ?? 0) > 0.01;
  const plan = ONE_WALL_HANDBALL.planIntercept({
    ball: snapshot.ball,
    player: snapshot.player,
    preparing,
    coefficients: currentPhysicsCoefficients(),
  });
  const visible = shouldShowCoach(api, snapshot);
  const cueState = ONE_WALL_HANDBALL.stabilizeCue(
    previousCueState,
    plan.cue,
    { visible },
  );
  const footwork = ONE_WALL_HANDBALL.guideFootwork(
    plan,
    snapshot.player?.position,
  );

  return Object.freeze({
    visible,
    preparing,
    rawCue: plan.cue,
    cue: cueState.displayCue ?? plan.cue,
    cueState,
    footwork,
    plan,
  });
}

function renderCoach(ui, state) {
  if (!ui) return;
  ui.element.classList.toggle('is-visible', state.visible);
  if (!state.visible) return;

  const copy = COPY[state.cue] ?? COPY.recover;
  ui.element.dataset.cue = state.cue;
  ui.label.textContent = copy.label;
  ui.footwork.textContent = formatFootwork(state.footwork);
  ui.detail.textContent = state.plan.recommended
    ? copy.detail
    : 'No clean contact window yet. Recover toward the return.';
  ui.metrics.innerHTML = formatMetrics(state.plan);
}

const api = await waitForLab();
const ui = createCoachUi();
let lastUpdate = -Infinity;
let latestState = null;

function updateCoach() {
  latestState = coachState(api, latestState?.cueState);
  renderCoach(ui, latestState);
  return latestState;
}

function frame(timestamp) {
  if (timestamp - lastUpdate >= UPDATE_INTERVAL_MS) {
    updateCoach();
    lastUpdate = timestamp;
  }
  window.requestAnimationFrame(frame);
}

window.__THE_WALL_INTERCEPT_COACH__ = {
  getState: () => latestState,
  update: updateCoach,
};

window.requestAnimationFrame(frame);
