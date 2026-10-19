# Mobile Court: two-thumb interaction pass

The original mobile experience required four tiny directional buttons, an off-court contact dock and separately tapping the wall to aim. It was effectively a desktop control scheme on a phone.

This pass replaces it on **touch devices at up to 900 CSS pixels wide**. Desktop keyboard, mouse, gamepad, and fallback narrow non-touch layouts are preserved.

## Play on a phone
1. Open `lab.html`, select Rookie / Guided, choose **Warm up with a feed**.
2. The court takes over the phone's viewport (including landscape orientation). **Left thumb:** drag the circular stick continuously to move toward/away from the front wall, sidestep, or move diagonally. Let go to stop.
3. **Right thumb:** select PALM / TOP / SLICE / FIST with a tap, then hold the big **HIT** pad to load the hand. While holding, slide left/right to steer your wall target and up/down to change its height. Lift to release the physical swing.
4. The coach pill reads MOVE / LOAD / HOLD / RELEASE. This is timing guidance, not automatic contact. A real swept hand-ball intersection is still required.
5. Use **?** for mobile help, **Ⅱ** for Pause, and **Next point / Feed another ball** when a point or feed ends. The desktop contact bar is hidden during mobile play. The wall target can still be tapped directly if preferred.

## What actually changed
- Full-height fixed game surface only while on-court on a touch phone, with notch/home-indicator safe-area padding. All controls remain inside the court.
- Pointer-captured analog stick, continuous two-axis movement and stable deadzone, independent multitouch pointers, right-thumb swipe aiming while charging, prominent hold/release contact pad and shot tabs.
- Portrait camera keeps a useful horizontal field of view, instead of cropping most of the court; landscape uses the normal lens model.
- Reduced mobile internal render resolution and initial shadow-map size to cut work on mobile GPUs. These are **rendering-only** changes and do not alter the simulation clock or ball physics.
- Concise in-court guidance and minimal top controls. Large desktop panels are hidden while the phone is playing.
- A pure testable math module (`src/controls/mobile-thumb.js`) for joystick and aim; a mobile view adapter (`src/labs/mobile-court.js`) only calls the existing canonical game control functions.
- Browser regression suite includes Chromium mobile emulation with two real simultaneous touches, aim steering, cancellation, profile compatibility, portrait and landscape, and pause/resume.

## Testing locally
```bash
npm ci
npm test
npx playwright install --with-deps chromium
npm run serve
# second terminal
npm run test:mobile-court-runtime
npm run test:browser
```

## Device review still essential
Test on at least one iPhone Safari and one Android Chrome device:
- Can you track an incoming ball while sliding right-thumb aim and moving with the left?
- Do physical contacts feel predictable and fair? Is the 'RELEASE' cue too late or early on a phone?
- Does the control pad remain clear of the browser toolbar and home indicator in portrait, landscape, and after rotation?
- Is the game smooth during a long match? Are the GPU temperature, battery drain or touch response unacceptable?
- Does losing app focus cancel both gestures without an accidental swing?
- Can smaller hands reach shot choices and the hit area comfortably?

The existing automated tests validate input ownership and interaction safety, **not** human fun, real device thermals, Safari behaviors, or screen-reader ergonomics. Those must be judged separately.

## Next experiments
Explore touch-adjustable camera presets and a simplified one-button beginner serve tutorial only after physical play sessions. Do not add auto-hits or enlarge collision volumes to conceal input problems.
