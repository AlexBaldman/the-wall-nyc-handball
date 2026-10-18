import { deriveReturnGuideView } from '../presentation/return-guide.js';

// The marker reflects the same reachable contact calculation as the live coach.
// It is a suggestion for foot placement, never an auto-hit or aim correction.
const api = window.__THE_WALL_LAB__;
const coach = window.__THE_WALL_INTERCEPT_COACH__;
const viewport = document.getElementById('viewportWrap');
const topbar = document.querySelector('.lab-topbar__actions');
const STORAGE_KEY = 'the-wall:return-guide:v1';

if (api?.projectCourtPoint && coach?.getState && viewport && topbar) {
  const style = document.createElement('style');
  style.dataset.returnGuide = 'true';
  style.textContent = `
    .return-guide-toggle {
      min-height: 34px;
      padding: 7px 11px;
      border: 1px solid rgba(110, 231, 242, 0.43);
      border-radius: 999px;
      background: rgba(110, 231, 242, 0.08);
      color: #d8faff;
      font: 800 11px/1 "Space Grotesk", system-ui, sans-serif;
      cursor: pointer;
    }
    .return-guide-toggle[aria-pressed="false"] {
      border-color: rgba(255,255,255,0.15);
      color: rgba(245,247,250,0.66);
      background: rgba(255,255,255,0.035);
    }
    .return-guide-toggle:focus-visible {
      outline: 2px solid #b9ff66;
      outline-offset: 2px;
    }
    .return-guide-marker {
      position: absolute;
      z-index: 10;
      width: 0;
      height: 0;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }
    .return-guide-marker[hidden] { display: none; }
    .return-guide-marker__ring {
      position: absolute;
      left: -30px;
      top: -13px;
      width: 60px;
      height: 26px;
      border: 3px solid #8bf5fc;
      border-radius: 50%;
      background: rgba(110,231,242,0.09);
      box-shadow: 0 0 0 4px rgba(110,231,242,0.1), 0 0 20px rgba(110,231,242,0.28);
      transform: translateZ(0);
    }
    .return-guide-marker__stem {
      position: absolute;
      left: -1px;
      bottom: 16px;
      width: 2px;
      height: 24px;
      background: linear-gradient(0deg, rgba(110,231,242,0.5), #8bf5fc);
    }
    .return-guide-marker__label {
      position: absolute;
      left: 0;
      bottom: 39px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      min-width: 130px;
      padding: 7px 9px;
      border: 1px solid rgba(139,245,252,0.54);
      border-radius: 9px;
      background: rgba(5,12,20,0.9);
      box-shadow: 0 8px 16px rgba(0,0,0,0.35);
      transform: translateX(-50%);
      white-space: nowrap;
    }
    .return-guide-marker__label strong {
      color: #b9ff66;
      font: 900 14px/1 "Barlow Condensed", system-ui, sans-serif;
      letter-spacing: 0.065em;
    }
    .return-guide-marker__label small {
      color: rgba(245,247,250,0.82);
      font: 650 10px/1 "Space Grotesk", system-ui, sans-serif;
    }
    .return-guide-marker[data-cue="strike"] .return-guide-marker__ring {
      border-color: #ffd166;
      box-shadow: 0 0 0 4px rgba(255,209,102,0.16), 0 0 22px rgba(255,209,102,0.46);
    }
    .return-guide-marker[data-cue="strike"] .return-guide-marker__label {
      border-color: #ffd166;
    }
    @media (max-width: 620px) {
      .return-guide-marker__label { min-width: 108px; padding: 5px 7px; }
      .return-guide-marker__label strong { font-size: 12px; }
      .return-guide-marker__label small { font-size: 9px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .return-guide-marker__ring { transition: none; }
    }
  `;
  document.head.append(style);

  const toggle = document.createElement('button');
  toggle.id = 'returnGuideToggle';
  toggle.type = 'button';
  toggle.className = 'return-guide-toggle';
  toggle.setAttribute('aria-keyshortcuts', 'H');
  topbar.insertBefore(toggle, document.getElementById('mvpPauseButton'));

  const marker = document.createElement('div');
  marker.id = 'returnGuideMarker';
  marker.className = 'return-guide-marker';
  marker.hidden = true;
  marker.setAttribute('aria-hidden', 'true');
  marker.innerHTML = `
    <span class="return-guide-marker__ring"></span>
    <span class="return-guide-marker__stem"></span>
    <span class="return-guide-marker__label"><strong></strong><small></small></span>
  `;
  viewport.append(marker);
  const title = marker.querySelector('strong');
  const detail = marker.querySelector('small');
  let enabled = true;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'off') enabled = false;
  } catch {
    // Private browsing and disabled storage must still be playable.
  }

  function syncToggle() {
    toggle.textContent = enabled ? 'Guide ON · H' : 'Guide OFF · H';
    toggle.setAttribute('aria-pressed', String(enabled));
    if (!enabled) marker.hidden = true;
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Optional preference only.
    }
    syncToggle();
  }

  toggle.addEventListener('click', () => setEnabled(!enabled));
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyH' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (event.target instanceof Element && event.target.closest('button, input, select, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
    setEnabled(!enabled);
  });

  function frame() {
    const guidance = deriveReturnGuideView(coach.getState());
    const entry = document.getElementById('courtEntry');
    const visible = enabled
      && guidance.visible
      && !api.isPaused?.()
      && (!entry || entry.classList.contains('is-hidden'));
    const projection = visible ? api.projectCourtPoint(guidance.targetPosition) : null;
    marker.hidden = !projection?.visible;

    if (!marker.hidden) {
      marker.style.left = `${projection.xPercent}%`;
      marker.style.top = `${projection.yPercent}%`;
      marker.dataset.cue = guidance.cue;
      if (title.textContent !== guidance.label) title.textContent = guidance.label;
      if (detail.textContent !== guidance.detail) detail.textContent = guidance.detail;
    }
    window.requestAnimationFrame(frame);
  }

  syncToggle();
  window.__THE_WALL_RETURN_GUIDE__ = {
    isEnabled: () => enabled,
    setEnabled,
    getView: () => deriveReturnGuideView(coach.getState()),
  };
  window.requestAnimationFrame(frame);
}
