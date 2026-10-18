// Presentation-only pause controls. The simulation stays authoritative in Ball Lab.
const api = window.__THE_WALL_LAB__;
const viewport = document.getElementById('viewportWrap');
const actions = document.querySelector('.lab-topbar__actions');
const canvas = document.getElementById('labCanvas');
const helpDialog = document.getElementById('mvpHelpDialog');

if (api?.setPaused && api?.isPaused && viewport && actions) {
  const style = document.createElement('style');
  style.dataset.mvpPause = 'true';
  style.textContent = `
    .mvp-pause-button {
      min-height: 34px;
      padding: 7px 12px;
      border: 1px solid rgba(185, 255, 102, 0.48);
      border-radius: 999px;
      color: #e7ffc7;
      background: rgba(185, 255, 102, 0.09);
      font: 800 11px/1 "Space Grotesk", system-ui, sans-serif;
      cursor: pointer;
    }
    .mvp-pause-button:hover,
    .mvp-pause-button:focus-visible {
      border-color: #b9ff66;
      outline-color: #b9ff66;
    }
    .mvp-pause-overlay {
      position: absolute;
      inset: 0;
      z-index: 22;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 13px;
      padding: 24px;
      color: #fff;
      text-align: center;
      background: rgba(4, 9, 17, 0.85);
      backdrop-filter: blur(6px);
    }
    .mvp-pause-overlay[hidden] { display: none; }
    .mvp-pause-overlay__tag {
      color: #b9ff66;
      font: 800 11px/1 "Space Grotesk", system-ui, sans-serif;
      letter-spacing: 0.17em;
      text-transform: uppercase;
    }
    .mvp-pause-overlay h2 {
      margin: 0;
      font: 900 clamp(48px, 9vw, 86px)/0.9 "Barlow Condensed", system-ui, sans-serif;
      text-transform: uppercase;
    }
    .mvp-pause-overlay p {
      max-width: 340px;
      margin: 0;
      color: rgba(245, 247, 250, 0.81);
      font: 500 13px/1.5 "Space Grotesk", system-ui, sans-serif;
    }
    .mvp-pause-overlay button {
      min-height: 46px;
      padding: 11px 22px;
      border: 1px solid #b9ff66;
      border-radius: 9px;
      background: #b9ff66;
      color: #0b1420;
      font: 800 13px/1 "Space Grotesk", system-ui, sans-serif;
      cursor: pointer;
    }
    .mvp-pause-overlay button:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) {
      .mvp-pause-overlay { backdrop-filter: none; }
    }
  `;
  document.head.append(style);

  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.id = 'mvpPauseButton';
  pauseButton.className = 'mvp-pause-button';
  pauseButton.setAttribute('aria-keyshortcuts', 'P Escape');
  actions.insertBefore(pauseButton, actions.querySelector('.back-link'));

  const overlay = document.createElement('section');
  overlay.className = 'mvp-pause-overlay';
  overlay.id = 'mvpPauseOverlay';
  overlay.hidden = true;
  overlay.setAttribute('aria-label', 'Game paused');
  overlay.innerHTML = `
    <span class="mvp-pause-overlay__tag">Time out · West 4th Street</span>
    <h2>Catch your breath.</h2>
    <p>The rally and physics clock are frozen. Resume when you're ready; you won't lose the point.</p>
    <button type="button" id="mvpResumeButton">Back to the court · P</button>
  `;
  viewport.append(overlay);

  // Reasons prevent closing Help from accidentally resuming an attention-paused match.
  const reasons = new Set();
  const resumeButton = overlay.querySelector('#mvpResumeButton');

  function sync() {
    const isPaused = reasons.size > 0;
    api.setPaused(isPaused);
    overlay.hidden = !isPaused;
    pauseButton.textContent = isPaused ? '▶ Resume' : 'Ⅱ Pause';
    pauseButton.setAttribute('aria-pressed', String(isPaused));
    resumeButton.disabled = reasons.has('help');
  }

  function hold(reason) {
    reasons.add(reason);
    sync();
  }

  function resume() {
    if (reasons.has('help')) return;
    reasons.clear();
    sync();
    canvas?.focus({ preventScroll: true });
  }

  function toggle() {
    if (reasons.size) resume();
    else {
      hold('manual');
      resumeButton.focus({ preventScroll: true });
    }
  }

  pauseButton.addEventListener('click', toggle);
  resumeButton.addEventListener('click', resume);
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyP' && event.code !== 'Escape') return;
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (helpDialog?.open || event.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
    toggle();
  }, true);

  function liveRally() {
    return Boolean(api.getMatch?.().active || api.getSnapshot?.().ball?.active);
  }

  const pauseForAttention = () => {
    if (liveRally()) hold('attention');
  };
  window.addEventListener('blur', pauseForAttention);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseForAttention();
  });

  if (helpDialog) {
    const syncHelp = () => {
      if (helpDialog.open) hold('help');
      else {
        reasons.delete('help');
        sync();
      }
    };
    new MutationObserver(syncHelp).observe(helpDialog, {
      attributes: true,
      attributeFilter: ['open'],
    });
    helpDialog.addEventListener('close', syncHelp);
  }

  window.__THE_WALL_PAUSE__ = {
    isPaused: () => api.isPaused(),
    getReasons: () => [...reasons],
  };
  sync();
}
