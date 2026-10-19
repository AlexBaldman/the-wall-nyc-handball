import { aimDescription, draggedWallAim, joystickVector, MOBILE_TECHNIQUES } from '../controls/mobile-thumb.js';

const api = window.__THE_WALL_LAB__;
const viewport = document.getElementById('viewportWrap');
const coach = window.__THE_WALL_INTERCEPT_COACH__;
const page = document.body;
const capable = () => Boolean(window.matchMedia?.('(pointer: coarse) and (max-width: 900px)').matches);
const HINT = 'Left thumb moves · hold HIT, slide to aim, release to swing';

if (api?.setTouchMove && api?.beginTouchContact && viewport) {
  const surface = document.createElement('section');
  surface.id = 'mobileCourtControls';
  surface.className = 'mobile-court-controls';
  surface.hidden = true;
  surface.setAttribute('aria-label', 'Two thumb mobile court controls');
  surface.innerHTML = `
    <div class="mobile-court-top">
      <button class="mobile-court-top__button" type="button" data-mobile-help aria-label="How to play on mobile">?</button>
      <div class="mobile-court-top__state" data-mobile-state aria-live="polite">PRACTICE · YOUR COURT</div>
      <button class="mobile-court-top__button" type="button" data-mobile-pause aria-label="Pause or resume the game">Ⅱ</button>
    </div>
    <div class="mobile-court-coach" data-mobile-coach role="status" aria-live="polite">Move to the return. Hold HIT to prepare.</div>
    <div class="mobile-court-footer">
      <div class="mobile-court-stick" data-mobile-stick role="group" aria-label="Analog thumb movement">
        <div class="mobile-court-stick__ring"></div>
        <div class="mobile-court-stick__nub" data-mobile-nub></div>
        <span>MOVE</span>
      </div>
      <div class="mobile-court-right">
        <div class="mobile-court-aim" data-mobile-aim aria-live="off">WALL · CENTER · LOW</div>
        <div class="mobile-court-techniques" role="group" aria-label="Choose a contact">
          ${MOBILE_TECHNIQUES.map((shot) => `<button type="button" data-mobile-technique="${shot.id}" aria-pressed="${shot.id === 'palm'}">${shot.label}</button>`).join('')}
        </div>
        <button type="button" class="mobile-court-hit" data-mobile-hit aria-label="Hold to prepare, swipe to aim, release to swing">
          <strong data-mobile-hit-label>HOLD + HIT</strong>
          <span data-mobile-charge></span>
          <small>Slide for aim · release to swing</small>
        </button>
      </div>
    </div>
    <button class="mobile-court-next" type="button" data-mobile-next hidden>Next point</button>
    <div class="mobile-court-orient" data-mobile-orient aria-hidden="true">${HINT}</div>
  `;
  viewport.append(surface);

  const stick = surface.querySelector('[data-mobile-stick]');
  const nub = surface.querySelector('[data-mobile-nub]');
  const hit = surface.querySelector('[data-mobile-hit]');
  const hitLabel = surface.querySelector('[data-mobile-hit-label]');
  const charge = surface.querySelector('[data-mobile-charge]');
  const aimLabel = surface.querySelector('[data-mobile-aim]');
  const next = surface.querySelector('[data-mobile-next]');
  const coachLabel = surface.querySelector('[data-mobile-coach]');
  const stateLabel = surface.querySelector('[data-mobile-state]');
  const help = surface.querySelector('[data-mobile-help]');
  const pause = surface.querySelector('[data-mobile-pause]');
  let selected = 'palm';
  let stickPointer = null;
  let shotPointer = null;
  let shotOrigin = null;
  let active = false;
  let previousCue = '';
  let previousStatus = '';
  let previousPrompt = '';
  let previousCharge = -1;
  let lastUiTime = -Infinity;

  function setShot(id) {
    if (shotPointer !== null || !MOBILE_TECHNIQUES.some((value) => value.id === id)) return;
    selected = id;
    for (const button of surface.querySelectorAll('[data-mobile-technique]')) {
      const chosen = button.dataset.mobileTechnique === selected;
      button.classList.toggle('active', chosen);
      button.setAttribute('aria-pressed', String(chosen));
    }
    if (shotPointer === null) hitLabel.textContent = `HOLD ${selected.toUpperCase()}`;
  }

  function releaseStick(pointerId = stickPointer) {
    if (stickPointer === null || pointerId !== stickPointer) return;
    stickPointer = null;
    nub.style.transform = 'translate(-50%, -50%)';
    api.setTouchMove(0, 0);
  }

  function moveStick(event) {
    if (stickPointer !== event.pointerId) return;
    const rect = stick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.38;
    const vector = joystickVector({
      x: event.clientX, y: event.clientY,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      radius,
    });
    api.setTouchMove(vector.x, vector.z);
    // The visual nub follows the thumb, but cannot leave the circular pad.
    const rawX = event.clientX - (rect.left + rect.width / 2);
    const rawY = event.clientY - (rect.top + rect.height / 2);
    const magnitude = Math.hypot(rawX, rawY);
    const scale = magnitude ? Math.min(1, radius / magnitude) : 0;
    nub.style.transform = `translate(calc(-50% + ${rawX * scale}px), calc(-50% + ${rawY * scale}px))`;
  }

  stick.addEventListener('pointerdown', (event) => {
    if (!active || stickPointer !== null || api.isPaused?.()) return;
    event.preventDefault();
    stickPointer = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    moveStick(event);
  });
  stick.addEventListener('pointermove', (event) => {
    if (stickPointer !== null) {
      event.preventDefault();
      moveStick(event);
    }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(name, (event) => releaseStick(event.pointerId));
  }
  // iOS/Safari and multi-touch dispatch may deliver a touch end even when a
  // pointer's capture lifecycle is interrupted. Never leave the player moving.
  stick.addEventListener('touchend', () => releaseStick(), { passive: true });
  stick.addEventListener('touchcancel', () => releaseStick(), { passive: true });

  function moveShot(event) {
    if (shotPointer !== event.pointerId || !shotOrigin) return;
    const aim = draggedWallAim(
      shotOrigin.aim,
      event.clientX - shotOrigin.x,
      event.clientY - shotOrigin.y,
    );
    api.setTouchAim(aim.x, aim.y);
    aimLabel.textContent = `WALL · ${aimDescription(aim)}`;
  }

  function releaseShot(pointerId, commit) {
    if (shotPointer === null || pointerId !== shotPointer) return;
    shotPointer = null;
    shotOrigin = null;
    hit.classList.remove('is-loading');
    if (commit && !api.isPaused?.()) api.finishTouchContact(selected);
    else api.cancelTouchContact(selected);
    hitLabel.textContent = `HOLD ${selected.toUpperCase()}`;
    charge.style.width = '0%';
  }

  hit.addEventListener('pointerdown', (event) => {
    if (!active || shotPointer !== null || api.isPaused?.()) return;
    event.preventDefault();
    shotPointer = event.pointerId;
    shotOrigin = {
      x: event.clientX, y: event.clientY,
      aim: api.getTouchControlState().aim,
    };
    hit.setPointerCapture(event.pointerId);
    api.beginTouchContact(selected);
    hit.classList.add('is-loading');
    hitLabel.textContent = 'RELEASE TO HIT';
  });
  hit.addEventListener('pointermove', (event) => {
    if (shotPointer !== null) {
      event.preventDefault();
      moveShot(event);
    }
  });
  hit.addEventListener('pointerup', (event) => {
    event.preventDefault();
    moveShot(event);
    releaseShot(event.pointerId, true);
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    hit.addEventListener(name, (event) => releaseShot(event.pointerId, false));
  }
  // A real touchend fallback is essential when multiple fingers share a
  // viewport and a browser fails to deliver the expected captured pointerup.
  // The guard in releaseShot makes an ordinary pointerup + touchend idempotent.
  hit.addEventListener('touchend', () => {
    if (shotPointer !== null) releaseShot(shotPointer, true);
  }, { passive: true });
  hit.addEventListener('touchcancel', () => {
    if (shotPointer !== null) releaseShot(shotPointer, false);
  }, { passive: true });

  for (const button of surface.querySelectorAll('[data-mobile-technique]')) {
    // On phones switch the contact at touch-down rather than relying on a
    // delayed/suppressed synthetic click after a previous multi-touch gesture.
    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') {
        event.preventDefault();
        setShot(button.dataset.mobileTechnique);
      }
    });
    button.addEventListener('click', () => setShot(button.dataset.mobileTechnique));
  }
  help.addEventListener('click', () => document.getElementById('mvpHelpButton')?.click());
  pause.addEventListener('click', () => document.getElementById('mvpPauseButton')?.click());
  next.addEventListener('click', () => {
    const match = api.getMatch();
    if (match.phase === 'practice' || match.phase === 'drop-test') api.feedBall();
    else api.startRallyPoint();
  });

  function deactivate() {
    releaseStick();
    if (shotPointer !== null) releaseShot(shotPointer, false);
    api.setTouchMove(0, 0);
    if (api.getTouchControlState().activeTechnique === selected) api.cancelTouchContact(selected);
  }

  function syncCapability() {
    const useMobile = capable() && page.classList.contains('is-playing');
    if (useMobile !== active) {
      active = useMobile;
      if (!active) deactivate();
    }
    page.classList.toggle('mobile-court-active', useMobile);
    surface.hidden = !useMobile;
  }
  new MutationObserver(syncCapability).observe(page, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', syncCapability, { passive: true });
  window.addEventListener('orientationchange', syncCapability, { passive: true });
  window.addEventListener('blur', deactivate);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) deactivate();
  });

  function renderUi(time) {
    if (active && time - lastUiTime > 80) {
      lastUiTime = time;
      const match = api.getMatch();
      const paused = api.isPaused?.();
      const status = paused ? 'PAUSED'
        : match.active && match.expectedHitter === 'ai' ? 'GHOST RETURN'
          : match.active ? 'YOUR TURN' : 'PRACTICE';
      if (status !== previousStatus) {
        stateLabel.textContent = status;
        previousStatus = status;
      }
      const liveCoach = coach?.getState?.();
      const cue = paused ? 'PAUSED · Tap Resume' : liveCoach?.visible
        ? ({
            move: 'MOVE · Follow the turquoise marker',
            prepare: 'LOAD · Hold your contact',
            hold: 'HOLD · Stay balanced',
            strike: 'RELEASE · Meet the ball',
            recover: 'RECOVER · Track the next return',
          }[liveCoach.cue] ?? HINT)
        : HINT;
      if (cue !== previousCue) {
        coachLabel.textContent = cue;
        previousCue = cue;
      }
      const controls = api.getTouchControlState();
      const chargeValue = shotPointer !== null ? Math.round(controls.charge * 100) : 0;
      if (chargeValue !== previousCharge) {
        charge.style.width = `${chargeValue}%`;
        previousCharge = chargeValue;
      }
      const showNext = !paused && !match.active && !match.matchWinner;
      next.hidden = !showNext;
      const nextText = match.phase === 'practice' ? '↻ Feed another ball' : '▶ Next point';
      if (nextText !== previousPrompt) {
        next.textContent = nextText;
        previousPrompt = nextText;
      }
    }
    window.requestAnimationFrame(renderUi);
  }
  setShot('palm');
  syncCapability();
  window.__THE_WALL_MOBILE__ = {
    isActive: () => active,
    getInput: () => ({ ...api.getTouchControlState(), selected, stickPointer, shotPointer }),
    chooseTechnique: setShot,
    reset: deactivate,
  };
  window.requestAnimationFrame(renderUi);
}
