const STORAGE_KEY = 'the-wall:mvp:v1';
const DIFFICULTIES = new Set(['rookie', 'regular', 'champion']);
const POLL_INTERVAL_MS = 140;

function readPreferences() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      difficulty: DIFFICULTIES.has(value.difficulty) ? value.difficulty : null,
      firstRunComplete: value.firstRunComplete === true,
    };
  } catch {
    return { difficulty: null, firstRunComplete: false };
  }
}

function writePreferences(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is a convenience, not a gameplay dependency.
  }
}

function waitForLab() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.__THE_WALL_LAB__?.getMatchStats && window.__THE_WALL_LAB__?.startRallyPoint) {
        resolve(window.__THE_WALL_LAB__);
      } else {
        window.requestAnimationFrame(check);
      }
    };
    check();
  });
}

function inputMode() {
  const controllerConnected = document.getElementById('controllerBadge')?.classList.contains('is-connected');
  if (controllerConnected) return 'gamepad';
  if (window.matchMedia?.('(pointer: coarse)').matches) return 'touch';
  return 'keyboard';
}

const CONTROL_COPY = Object.freeze({
  keyboard: Object.freeze({
    move: 'WASD',
    aim: 'Mouse',
    hit: 'Hold + release Space',
  }),
  gamepad: Object.freeze({
    move: 'Left stick',
    aim: 'Right stick',
    hit: 'Hold + release A / Cross',
  }),
  touch: Object.freeze({
    move: 'Move pad',
    aim: 'Tap the wall',
    hit: 'Hold + release a contact',
  }),
});

function installStyles() {
  const style = document.createElement('style');
  style.dataset.mvpShell = 'true';
  style.textContent = `
    .mvp-help-button {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 999px;
      background: rgba(255,255,255,0.055);
      color: rgba(245,247,250,0.9);
      padding: 8px 11px;
      font: 700 11px/1 "Space Grotesk", system-ui, sans-serif;
      cursor: pointer;
    }
    .mvp-help-button:hover { border-color: rgba(185,255,102,0.55); }
    .mvp-quickstart {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      width: min(620px, 100%);
      margin: 14px auto 12px;
    }
    .mvp-quickstart > div {
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 11px;
      background: rgba(255,255,255,0.045);
      text-align: left;
    }
    .mvp-quickstart span {
      display: block;
      margin-bottom: 3px;
      color: rgba(185,255,102,0.82);
      font: 800 9px/1 "Space Grotesk", system-ui, sans-serif;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }
    .mvp-quickstart strong {
      display: block;
      overflow: hidden;
      color: #fff;
      font: 750 11px/1.25 "Space Grotesk", system-ui, sans-serif;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .entry-difficulty button[data-mvp-recommended="true"] {
      border-color: rgba(185,255,102,0.6);
      box-shadow: inset 0 0 0 1px rgba(185,255,102,0.12);
    }
    .entry-difficulty button[data-mvp-recommended="true"]::after {
      content: 'BEST FIRST MATCH';
      display: block;
      margin-top: 3px;
      color: rgba(185,255,102,0.8);
      font-size: 8px;
      letter-spacing: 0.08em;
    }
    .practice-first-button[data-mvp-recommended="true"] {
      border-color: rgba(185,255,102,0.58);
      color: #dfffb9;
    }
    .mvp-warmup {
      position: absolute;
      left: 50%;
      bottom: 78px;
      z-index: 21;
      width: min(420px, calc(100% - 24px));
      padding: 11px 12px;
      border: 1px solid rgba(185,255,102,0.42);
      border-radius: 13px;
      background: rgba(5,8,14,0.9);
      box-shadow: 0 14px 36px rgba(0,0,0,0.32);
      transform: translateX(-50%);
      backdrop-filter: blur(10px);
    }
    .mvp-warmup[hidden] { display: none; }
    .mvp-warmup__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .mvp-warmup__top span {
      color: rgba(185,255,102,0.84);
      font: 800 9px/1 "Space Grotesk", system-ui, sans-serif;
      letter-spacing: 0.11em;
      text-transform: uppercase;
    }
    .mvp-warmup strong { color: #fff; font: 800 16px/1 "Barlow Condensed", system-ui, sans-serif; }
    .mvp-warmup p { margin: 6px 0 0; color: rgba(245,247,250,0.78); font: 500 11px/1.35 "Space Grotesk", system-ui, sans-serif; }
    .mvp-warmup__actions { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 9px; }
    .mvp-warmup button {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: #fff;
      padding: 7px 10px;
      font: 750 10px/1 "Space Grotesk", system-ui, sans-serif;
      cursor: pointer;
    }
    .mvp-warmup button[data-primary="true"] {
      border-color: rgba(185,255,102,0.62);
      background: rgba(185,255,102,0.13);
      color: #e8ffd0;
    }
    .mvp-help-dialog {
      width: min(620px, calc(100% - 24px));
      max-height: min(82vh, 720px);
      padding: 0;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 18px;
      background: #0d121a;
      color: #f5f7fa;
      box-shadow: 0 28px 90px rgba(0,0,0,0.55);
    }
    .mvp-help-dialog::backdrop { background: rgba(0,0,0,0.72); backdrop-filter: blur(5px); }
    .mvp-help-dialog__body { padding: 20px; }
    .mvp-help-dialog header { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
    .mvp-help-dialog h2 { margin: 0; font: 900 30px/0.95 "Barlow Condensed", system-ui, sans-serif; }
    .mvp-help-dialog header button {
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      color: #fff;
      width: 34px;
      height: 34px;
      cursor: pointer;
    }
    .mvp-help-dialog__grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 12px; margin-top: 16px; }
    .mvp-help-dialog section { padding: 13px; border: 1px solid rgba(255,255,255,0.1); border-radius: 13px; background: rgba(255,255,255,0.025); }
    .mvp-help-dialog h3 { margin: 0 0 8px; color: #b9ff66; font: 800 12px/1 "Space Grotesk", system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
    .mvp-help-dialog ul { margin: 0; padding-left: 18px; color: rgba(245,247,250,0.8); font: 500 12px/1.5 "Space Grotesk", system-ui, sans-serif; }
    .mvp-help-dialog li + li { margin-top: 5px; }
    @media (max-width: 660px) {
      .mvp-quickstart { grid-template-columns: 1fr; }
      .mvp-quickstart > div { display: grid; grid-template-columns: 66px 1fr; align-items: center; gap: 8px; }
      .mvp-quickstart span { margin: 0; }
      .mvp-warmup { bottom: 146px; }
      .mvp-help-dialog__grid { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mvp-warmup { backdrop-filter: none; }
    }
  `;
  document.head.append(style);
}

function installQuickStart() {
  const entry = document.getElementById('courtEntry');
  const playButton = document.getElementById('enterCourtButton');
  if (!entry || !playButton) return null;
  const element = document.createElement('div');
  element.className = 'mvp-quickstart';
  element.setAttribute('aria-label', 'Three step quick start');
  element.innerHTML = `
    <div><span>1 · Move</span><strong data-mvp-control="move"></strong></div>
    <div><span>2 · Aim</span><strong data-mvp-control="aim"></strong></div>
    <div><span>3 · Contact</span><strong data-mvp-control="hit"></strong></div>
  `;
  entry.insertBefore(element, playButton);
  return element;
}

function syncControlCopy(quickStart) {
  if (!quickStart) return;
  const copy = CONTROL_COPY[inputMode()];
  for (const [key, value] of Object.entries(copy)) {
    const target = quickStart.querySelector(`[data-mvp-control="${key}"]`);
    if (target) target.textContent = value;
  }
}

function installHelp() {
  const actions = document.querySelector('.lab-topbar__actions');
  if (!actions) return null;

  const button = document.createElement('button');
  button.className = 'mvp-help-button';
  button.id = 'mvpHelpButton';
  button.type = 'button';
  button.textContent = 'How to play';
  actions.insertBefore(button, actions.querySelector('.back-link'));

  const dialog = document.createElement('dialog');
  dialog.className = 'mvp-help-dialog';
  dialog.id = 'mvpHelpDialog';
  dialog.innerHTML = `
    <div class="mvp-help-dialog__body">
      <header>
        <div><p class="eyebrow">The Wall · quick rules</p><h2>Meet it. Load it. Send it.</h2></div>
        <button type="button" data-mvp-close aria-label="Close help">×</button>
      </header>
      <div class="mvp-help-dialog__grid">
        <section>
          <h3>How a rally works</h3>
          <ul>
            <li>Move so the return reaches you around a comfortable arm’s length.</li>
            <li>Aim at the front wall. Hold a contact to prepare, then release through the ball.</li>
            <li>The ball must reach the wall before the floor. After the wall, the opponent gets it before the second bounce.</li>
            <li>Your buttons choose contact technique. The physical collision decides the actual shot.</li>
          </ul>
        </section>
        <section>
          <h3>Scoring</h3>
          <ul>
            <li>First to 11 wins the match.</li>
            <li>Only the server scores a point.</li>
            <li>Win while receiving and you earn a side out, not a point.</li>
            <li>A first service fault leaves one second serve.</li>
          </ul>
        </section>
        <section>
          <h3>Best first contact</h3>
          <ul>
            <li>Use Open Palm before worrying about spin.</li>
            <li>Move first. Preparing early slows your feet.</li>
            <li>The live coach tells you whether to move, load, hold, or strike.</li>
          </ul>
        </section>
        <section>
          <h3>Controls</h3>
          <ul data-mvp-help-controls></ul>
        </section>
      </div>
    </div>
  `;
  document.body.append(dialog);

  button.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('[data-mvp-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return dialog;
}

function syncHelpControls(dialog) {
  const list = dialog?.querySelector('[data-mvp-help-controls]');
  if (!list) return;
  const copy = CONTROL_COPY[inputMode()];
  list.innerHTML = `
    <li><b>Move:</b> ${copy.move}</li>
    <li><b>Aim:</b> ${copy.aim}</li>
    <li><b>Open palm:</b> ${copy.hit}</li>
    <li><b>Spin:</b> J/K or X/B on gamepad; extra contact buttons on touch.</li>
  `;
}

function installWarmupHandoff(api, completeFirstRun) {
  const viewport = document.getElementById('viewportWrap');
  const practiceButton = document.getElementById('practiceFirstButton');
  const enterButton = document.getElementById('enterCourtButton');
  const rallyButton = document.getElementById('rallyButton');
  if (!viewport || !practiceButton) return null;

  const card = document.createElement('aside');
  card.className = 'mvp-warmup';
  card.hidden = true;
  card.setAttribute('aria-live', 'polite');
  card.innerHTML = `
    <div class="mvp-warmup__top"><span>30-second warm-up</span><strong data-mvp-warmup-title>Meet one return</strong></div>
    <p data-mvp-warmup-detail>Move into the lane, aim at the wall, hold Open Palm, then release through the rise.</p>
    <div class="mvp-warmup__actions">
      <button type="button" data-mvp-start-match data-primary="true" hidden>Start match</button>
      <button type="button" data-mvp-another-feed>Another feed</button>
      <button type="button" data-mvp-dismiss>Hide</button>
    </div>
  `;
  viewport.append(card);

  const title = card.querySelector('[data-mvp-warmup-title]');
  const detail = card.querySelector('[data-mvp-warmup-detail]');
  const startButton = card.querySelector('[data-mvp-start-match]');
  let active = false;
  let baselineContacts = 0;

  function beginWarmup() {
    active = true;
    baselineContacts = api.getMatchStats().totalContacts ?? 0;
    card.hidden = false;
    startButton.hidden = true;
    title.textContent = 'Meet one return';
    detail.textContent = 'Move into the lane, aim at the wall, hold Open Palm, then release through the rise.';
  }

  function stopWarmup() {
    active = false;
    card.hidden = true;
  }

  practiceButton.addEventListener('click', beginWarmup);
  card.querySelector('[data-mvp-another-feed]')?.addEventListener('click', () => {
    baselineContacts = api.getMatchStats().totalContacts ?? 0;
    api.feedBall();
    card.hidden = false;
    startButton.hidden = true;
    title.textContent = 'Meet one return';
    detail.textContent = 'Try again. Move first, then hold and release as the ball enters reach.';
  });
  card.querySelector('[data-mvp-dismiss]')?.addEventListener('click', stopWarmup);
  startButton.addEventListener('click', () => {
    completeFirstRun();
    stopWarmup();
    api.startRallyPoint();
  });
  for (const button of [enterButton, rallyButton]) {
    button?.addEventListener('click', () => {
      completeFirstRun();
      stopWarmup();
    });
  }

  window.setInterval(() => {
    if (!active) return;
    const contacts = api.getMatchStats().totalContacts ?? 0;
    if (contacts <= baselineContacts) return;
    active = false;
    title.textContent = 'Contact made. Now play the point.';
    detail.textContent = 'That is enough to start. Keep Open Palm simple until movement and timing feel natural.';
    startButton.hidden = false;
  }, POLL_INTERVAL_MS);

  return card;
}

const api = await waitForLab();
let preferences = readPreferences();
const firstRun = !preferences.firstRunComplete;

installStyles();
const quickStart = installQuickStart();
const helpDialog = installHelp();

function savePreferences(patch) {
  preferences = { ...preferences, ...patch };
  writePreferences(preferences);
}

const initialDifficulty = preferences.difficulty ?? 'rookie';
api.setDifficulty(initialDifficulty);
if (!preferences.difficulty) savePreferences({ difficulty: initialDifficulty });

if (firstRun) {
  document.querySelector('[data-difficulty="rookie"]')?.setAttribute('data-mvp-recommended', 'true');
  const practiceButton = document.getElementById('practiceFirstButton');
  if (practiceButton) {
    practiceButton.dataset.mvpRecommended = 'true';
    practiceButton.textContent = 'Recommended: take one warm-up feed';
  }
}

for (const button of document.querySelectorAll('[data-difficulty]')) {
  button.addEventListener('click', () => {
    if (DIFFICULTIES.has(button.dataset.difficulty)) {
      savePreferences({ difficulty: button.dataset.difficulty });
    }
  });
}

function completeFirstRun() {
  if (!preferences.firstRunComplete) savePreferences({ firstRunComplete: true });
}

const warmupCard = installWarmupHandoff(api, completeFirstRun);
syncControlCopy(quickStart);
syncHelpControls(helpDialog);

const controllerBadge = document.getElementById('controllerBadge');
new MutationObserver(() => {
  syncControlCopy(quickStart);
  syncHelpControls(helpDialog);
}).observe(controllerBadge ?? document.body, { attributes: true, attributeFilter: ['class'] });

window.__THE_WALL_MVP__ = {
  getState: () => ({
    firstRun: !preferences.firstRunComplete,
    difficulty: preferences.difficulty,
    inputMode: inputMode(),
    warmupVisible: Boolean(warmupCard && !warmupCard.hidden),
  }),
  openHelp: () => helpDialog?.showModal(),
  getStorageKey: () => STORAGE_KEY,
};
