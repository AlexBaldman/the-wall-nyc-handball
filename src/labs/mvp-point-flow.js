const UPDATE_INTERVAL_MS = 120;

function waitForLab() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.__THE_WALL_LAB__?.getMatch && window.__THE_WALL_LAB__?.startRallyPoint) {
        resolve(window.__THE_WALL_LAB__);
      } else {
        window.requestAnimationFrame(check);
      }
    };
    check();
  });
}

function currentInputMode() {
  return window.__THE_WALL_MVP__?.getState?.().inputMode ?? 'keyboard';
}

function contactControl(mode) {
  if (mode === 'gamepad') return 'A / Cross';
  if (mode === 'touch') return 'Open Palm';
  return 'Space';
}

function advanceControl(mode) {
  return mode === 'touch' ? 'Next point' : 'R';
}

function actorLabel(actor) {
  return actor === 'player' ? 'You' : 'Ghost';
}

function derivePrompt(match, mode) {
  if (!match) return null;
  const hit = contactControl(mode);
  const next = advanceControl(mode);

  if (match.matchWinner) {
    return {
      id: 'rematch',
      tag: 'Match complete',
      title: match.matchWinner === 'player' ? 'Court yours.' : 'Run it back.',
      detail: `${next} starts a fresh race to 11.`,
      actionLabel: 'Run it back',
    };
  }

  if (match.active) {
    if (match.phase === 'serve-ready' && match.server === 'player') {
      return {
        id: 'player-serve-ready',
        tag: 'Your serve',
        title: `Hold ${hit} to toss + load.`,
        detail: 'Keep holding through the toss, aim at the wall, then release through the ball.',
        actionLabel: null,
      };
    }
    if (match.phase === 'serve-ready' && match.server === 'ai') {
      return {
        id: 'receive-serve',
        tag: 'Receive',
        title: 'Ghost is serving.',
        detail: 'Get balanced behind the return and let the live contact coach take over when the ball is yours.',
        actionLabel: null,
      };
    }
    if (match.phase === 'serve-toss' && match.server === 'player') {
      return {
        id: 'player-serve-toss',
        tag: 'Serve toss live',
        title: `Release ${hit} through the ball.`,
        detail: 'The same physical hand collider decides whether the serve is clean, short, long, or down.',
        actionLabel: null,
      };
    }
    return null;
  }

  if (match.phase === 'serve-fault') {
    return {
      id: 'second-serve',
      tag: 'One serve left',
      title: 'Second serve.',
      detail: `${next} resets the point. Then hold ${hit} for the next toss.`,
      actionLabel: 'Second serve',
    };
  }

  if (match.pointWinner) {
    const server = actorLabel(match.server);
    return {
      id: 'next-point',
      tag: 'Dead ball',
      title: `${actorLabel(match.pointWinner)} won the rally.`,
      detail: `${next} starts the next point · ${server} serve${server === 'You' ? '' : 's'}.`,
      actionLabel: 'Next point',
    };
  }

  return null;
}

function installStyles() {
  const style = document.createElement('style');
  style.dataset.mvpPointFlow = 'true';
  style.textContent = `
    .mvp-point-flow {
      position: absolute;
      left: 50%;
      top: 98px;
      z-index: 20;
      width: min(520px, calc(100% - 28px));
      padding: 9px 11px;
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 13px;
      background: rgba(5,8,14,0.88);
      box-shadow: 0 12px 34px rgba(0,0,0,0.28);
      transform: translateX(-50%);
      backdrop-filter: blur(9px);
      pointer-events: none;
    }
    .mvp-point-flow[hidden] { display: none; }
    .mvp-point-flow__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .mvp-point-flow__copy { min-width: 0; }
    .mvp-point-flow__copy span {
      display: block;
      margin-bottom: 2px;
      color: rgba(185,255,102,0.8);
      font: 800 9px/1 "Space Grotesk", system-ui, sans-serif;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .mvp-point-flow__copy strong {
      display: block;
      overflow: hidden;
      color: #fff;
      font: 850 17px/1 "Barlow Condensed", system-ui, sans-serif;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mvp-point-flow__copy small {
      display: block;
      margin-top: 3px;
      color: rgba(245,247,250,0.74);
      font: 500 10px/1.3 "Space Grotesk", system-ui, sans-serif;
    }
    .mvp-point-flow button {
      flex: none;
      border: 1px solid rgba(185,255,102,0.5);
      border-radius: 999px;
      background: rgba(185,255,102,0.12);
      color: #e8ffd0;
      padding: 7px 10px;
      font: 750 10px/1 "Space Grotesk", system-ui, sans-serif;
      cursor: pointer;
      pointer-events: auto;
    }
    @media (max-width: 620px) {
      .mvp-point-flow {
        top: 82px;
        width: min(360px, calc(100% - 18px));
        padding: 8px 9px;
      }
      .mvp-point-flow__copy strong { font-size: 15px; }
      .mvp-point-flow__copy small { font-size: 9px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mvp-point-flow { backdrop-filter: none; }
    }
  `;
  document.head.append(style);
}

function installUi() {
  const viewport = document.getElementById('viewportWrap');
  if (!viewport) return null;
  const element = document.createElement('aside');
  element.className = 'mvp-point-flow';
  element.hidden = true;
  element.setAttribute('aria-live', 'polite');
  element.innerHTML = `
    <div class="mvp-point-flow__row">
      <div class="mvp-point-flow__copy">
        <span data-mvp-flow-tag></span>
        <strong data-mvp-flow-title></strong>
        <small data-mvp-flow-detail></small>
      </div>
      <button type="button" data-mvp-flow-action hidden></button>
    </div>
  `;
  viewport.append(element);
  return {
    element,
    tag: element.querySelector('[data-mvp-flow-tag]'),
    title: element.querySelector('[data-mvp-flow-title]'),
    detail: element.querySelector('[data-mvp-flow-detail]'),
    action: element.querySelector('[data-mvp-flow-action]'),
  };
}

function markFirstRunComplete() {
  const key = window.__THE_WALL_MVP__?.getStorageKey?.();
  if (!key) return;
  try {
    const current = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    if (current.firstRunComplete === true) return;
    window.localStorage.setItem(key, JSON.stringify({ ...current, firstRunComplete: true }));
    const warmup = document.querySelector('.mvp-warmup');
    if (warmup) warmup.hidden = true;
  } catch {
    // First-run persistence is optional; match flow must never depend on storage.
  }
}

const api = await waitForLab();
installStyles();
const ui = installUi();
let lastPromptId = null;
let lastUpdate = -Infinity;

function update() {
  const match = api.getMatch();
  if (match?.active) markFirstRunComplete();
  const prompt = derivePrompt(match, currentInputMode());
  if (!ui) return prompt;

  ui.element.hidden = !prompt;
  if (!prompt) {
    lastPromptId = null;
    return null;
  }

  ui.tag.textContent = prompt.tag;
  ui.title.textContent = prompt.title;
  ui.detail.textContent = prompt.detail;
  ui.action.hidden = !prompt.actionLabel;
  ui.action.textContent = prompt.actionLabel ?? '';
  ui.element.dataset.prompt = prompt.id;
  lastPromptId = prompt.id;
  return prompt;
}

ui?.action.addEventListener('click', () => {
  api.startRallyPoint();
  update();
});

function frame(timestamp) {
  if (timestamp - lastUpdate >= UPDATE_INTERVAL_MS) {
    update();
    lastUpdate = timestamp;
  }
  window.requestAnimationFrame(frame);
}

window.__THE_WALL_MVP_FLOW__ = {
  getPrompt: () => derivePrompt(api.getMatch(), currentInputMode()),
  getPromptId: () => lastPromptId,
  update,
};

window.requestAnimationFrame(frame);
