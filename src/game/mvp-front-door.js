function installStyles() {
  const style = document.createElement('style');
  style.dataset.mvpFrontDoor = 'true';
  style.textContent = `
    .mvp-launch-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      width: min(100%, 1180px);
      align-items: center;
      gap: 18px;
      margin: 0 auto 0.85rem;
      padding: 12px 14px;
      border: 1px solid rgba(215,243,106,0.42);
      border-radius: 12px;
      background:
        linear-gradient(105deg, rgba(215,243,106,0.12), rgba(125,228,220,0.055) 46%, transparent 72%),
        rgba(7,20,30,0.88);
      box-shadow: 5px 5px 0 rgba(255,77,131,0.08);
    }
    .mvp-launch-strip__copy { min-width: 0; }
    .mvp-launch-strip__copy span {
      display: block;
      margin-bottom: 3px;
      color: var(--lime);
      font: 800 0.58rem/1 "Space Grotesk", sans-serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .mvp-launch-strip__copy strong {
      display: block;
      color: var(--ink);
      font: 900 clamp(1.15rem, 2vw, 1.55rem)/1 "Barlow Condensed", sans-serif;
      letter-spacing: 0.025em;
      text-transform: uppercase;
    }
    .mvp-launch-strip__copy p {
      max-width: 760px;
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 0.72rem;
      line-height: 1.35;
    }
    .mvp-launch-strip__actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mvp-launch-strip__play,
    .mvp-launch-strip__classic {
      display: inline-flex;
      min-height: 42px;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      padding: 0.62rem 0.82rem;
      font: 800 0.68rem/1 "Space Grotesk", sans-serif;
      text-decoration: none;
      white-space: nowrap;
    }
    .mvp-launch-strip__play {
      border: 1px solid rgba(215,243,106,0.64);
      color: #07121d;
      background: var(--lime);
      box-shadow: 3px 3px 0 rgba(255,77,131,0.28);
    }
    .mvp-launch-strip__play:hover { filter: brightness(1.06); }
    .mvp-launch-strip__classic {
      border: 1px solid rgba(255,255,255,0.11);
      color: var(--muted);
      background: rgba(255,255,255,0.035);
    }
    @media (max-width: 760px) {
      .mvp-launch-strip { grid-template-columns: 1fr; gap: 10px; }
      .mvp-launch-strip__actions { width: 100%; }
      .mvp-launch-strip__play { flex: 1; }
      .mvp-launch-strip__classic { display: none; }
    }
  `;
  document.head.append(style);
}

function installLaunchStrip() {
  const topbar = document.querySelector('.topbar');
  const gameShell = document.querySelector('.game-shell');
  if (!topbar || !gameShell) return null;

  const strip = document.createElement('section');
  strip.className = 'mvp-launch-strip';
  strip.setAttribute('aria-label', 'Current recommended build');
  strip.innerHTML = `
    <div class="mvp-launch-strip__copy">
      <span>Current MVP · recommended</span>
      <strong>Play the physics-first 3D Street Match</strong>
      <p>True-scale court, physical hand contact, live positioning coach, Rookie-to-Champion rivals, and the newest movement/timing work. The classic 2.5D build stays playable below.</p>
    </div>
    <div class="mvp-launch-strip__actions">
      <a class="mvp-launch-strip__play" href="lab.html">Play 3D Street Match →</a>
      <a class="mvp-launch-strip__classic" href="#gameCanvas">Stay in Classic</a>
    </div>
  `;
  topbar.after(strip);
  return strip;
}

installStyles();
const strip = installLaunchStrip();

window.__THE_WALL_FRONT_DOOR__ = {
  getRecommendedHref: () => strip?.querySelector('.mvp-launch-strip__play')?.getAttribute('href') ?? null,
};
