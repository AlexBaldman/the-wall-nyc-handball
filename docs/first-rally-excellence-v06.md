# First Rally Excellence · v0.6 development pass

## Objective
Make the first five minutes of the physical 3D Street Match easier to understand, evaluate, and improve without changing the regulation ball radius, court dimensions, material coefficients, or scoring.

## What changed
- **Independent player assistance:** Guided = novice bounded hand-start; Street = canonical bounded hand-start; Pure = no planned hand-start correction. Rival skill stays on its own axis. The actual swept physical hand-ball intersection remains mandatory.
- **Contact coaching:** RELEASE now accounts for an estimate of hand movement *after* button release, instead of a single fixed ball-arrival threshold. Coaching predictions are advisory, not authoritative.
- **Court readability:** A non-colliding floor reference follows the actual ball for depth perception. Camera position and look target now use frame-rate-independent exponential smoothing.
- **Telemetry:** reports include assistance profile, planner hand-assist profile, whether the optional return guide was enabled, attempted swings, air swings, and bounded frame pacing (recent mean FPS, 95th-percentile frame time, slow-frame fraction).
- **Browser gates:** GitHub Actions installs Chromium and runs both legacy browser runtime smoke tests and a new first-rally flow before deploying Pages.

## How to evaluate
1. Open `lab.html`, choose **Rookie** with **Guided**, and take the first practice feed.
2. Follow the turquoise foot-position marker, **hold Space** to prepare, and release when the physical coach says **RELEASE**.
3. Repeat in **Street** and **Pure** assistance without changing Rookie difficulty. Check if contacts feel controllable, rather than automatic.
4. Change camera (C) and resize to phone width. Check ball depth reference, serve flow, pause/resume, and on-screen touch buttons.
5. Export the MVP session JSON in each variant, recording build revision, settings, swing attempts, air swings, and frame pacing.

## Reproduce checks
```bash
npm ci
npm test
npx playwright install chromium
npm run serve
# In a second shell:
npm run test:browser
```

On PRs and main, GitHub Actions now runs the browser suite in an independent job and only deploys when both build and browser checks pass.

## Honest limitations
- Playwright and deterministic tests cannot determine *fun*, body mechanics authenticity, or personal comfort. At least several novice and experienced-player sessions are still necessary.
- RELEASE uses an approximate release-to-hand-contact travel time. Real contact still depends on the ball, hand trajectory, player position, and contact envelope. Tune its thresholds from observed timing errors.
- The floor reference is **directly beneath the current ball**, not a predicted bounce point. It never changes gameplay.
- Frame pacing metrics reflect a rolling browser requestAnimationFrame sample, not GPU-only timings or a complete device profiler.
- This pass preserves the stronger 2.5D classic build; no claim is made that its content is migrated into the 3D game.

## Next human-playtest gates
- First legal serve and three-return rally within 90 seconds for at least 80% of novice subjects (existing project hypothesis, not yet measured).
- Miss-reason recognition without replay for at least 75%.
- Rematch chosen by at least 50% of first-time players.
- Record per-mode clean-contact rate, misses/attempt, median rally length, camera choice, and subjective control confidence. Do not mistake assistance-only contact gains for improved player skill.

## IP and evaluator notes
The repository is publicly readable, but public availability alone does **not** grant a prospective AI-training buyer a license. Obtain written terms and verify source authorship, AI-assisted portions, third-party libraries/assets, vendored dependencies, reusable code shared with other projects, and Git history before any repository/sample license is granted. Preserve the pre-offer revision as a historical baseline; keep post-offer changes attributed to their own dates.
