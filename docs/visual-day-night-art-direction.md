# Visual System and Day / Night Art Direction

## Purpose

The next visual pass should make *The Wall* feel brighter, more authored, and
more alive without making the ball, court lines, contact timing, or officiating
harder to read.

The target is not a generic light-theme / dark-theme switch. `Day` and `Night`
are two complete NYC court atmospheres built from the same competitive
visibility contract:

- the physical court, rules, collision shapes, and camera framing never change
- the ball remains readable against the wall, floor, players, particles, and sky
- player silhouettes and team identity survive every venue and color mode
- live gameplay information remains louder than decorative chrome
- pixel-art geometry, comic ink, graffiti, and modern lighting feel like one art
  direction rather than four unrelated filters

## SetScope reference translated for The Wall

The current SetScope design system and July 26 UI/UX audit are the reference,
not a palette to copy literally:

- every surface should feel like a playable instrument, not a generic web form
- semantic color roles remain stable across modes
- configuration never becomes louder than live feedback
- important state is at least 11–12px and primary coarse-pointer targets are at
  least 44px
- success, warning, recovery, and destructive state use shape, pattern, motion,
  and copy as well as color
- phone, tablet, and desktop are reviewed as first-class game surfaces
- decorative skins may change atmosphere but must preserve interaction geometry
  and legibility

Reference sources:

- [SetScope design tokens](https://github.com/AlexBaldman/setscope-dj-companion/blob/main/src/design-tokens.css)
- [SetScope adaptive arcade UI/UX audit](https://github.com/AlexBaldman/setscope-dj-companion/blob/main/docs/UI_UX_AUDIT_2026-07-26.md)
- [SetScope light-theme implementation](https://github.com/AlexBaldman/setscope-dj-companion/blob/main/src/theme.css)

## Shared visual grammar

### Semantic color roles

The game should use semantic tokens instead of one-off colors inside components
or Three.js scene code.

| Role | Day direction | Night direction | Meaning |
| --- | --- | --- | --- |
| Action | sun-hot orange `#ff8a1f` | electric amber `#ffb11b` | serve, continue, primary action |
| Aim / data | saturated cyan `#00aeea` | luminous cyan `#39d9ff` | target, trajectory, measured information |
| Clean / success | court mint `#22c98b` | laser mint `#60f0bd` | legal serve, clean contact, confirmed state |
| Pressure / fault | comic magenta `#ef3d76` | neon pink `#ff4f9a` | fault, recovery, danger, review |
| Special / mastery | spray-can violet `#7458ff` | ultraviolet `#9c78ff` | elite contact, unlock, special state |
| Ball | NYC blue `#087dff` with pale rim | electric blue `#2f9dff` with warm rim | physical ball and render-only readability halo |
| Ink | near-black violet `#161225` | blue-black `#090b19` | comic outlines, deep shadow, typography |

These are starting hypotheses for screenshot and playtest calibration. Final
values must pass contrast and ball-tracking checks on representative displays.

### Surface tokens

CSS and Three.js should consume one shared theme object with at least:

- `sceneSky`, `sceneHaze`, `sceneGround`, `wallBase`, `wallInk`
- `surfaceApp`, `surfacePanel`, `surfaceRaised`, `surfaceScreen`
- `borderSubtle`, `borderStrong`, `textPrimary`, `textSecondary`
- `action`, `data`, `success`, `warning`, `danger`, `special`
- `ballCore`, `ballRim`, `shadow`, `focusRing`
- `sunOrFlood`, `fillLight`, `rimLight`, `fogColor`, `exposure`

The renderer reads the theme. It never writes to the simulation, rules, replay,
or input state.

### Shape and material language

- **Sega-era silhouette:** chunky, instantly readable forms and limited-value
  ramps at gameplay distance.
- **Comic ink:** dark contour, selective rim light, speed lines, impact stars,
  and panel-like point transitions.
- **NYC print texture:** halftone, wheatpaste edges, concrete wear, paint
  overspray, and hand-authored graffiti zones.
- **Modern light:** physically coherent sun or floodlight direction, controlled
  bloom, contact shadows, and restrained atmospheric depth.
- **Tactile HUD:** compact hardware-like controls, crisp borders, clear pressed
  depth, and one obvious primary action at a time.

Graffiti is environmental storytelling, not wallpaper. It belongs on authored
wall margins, fence banners, court furniture, character drops, and point-end
graphics; it must stay out of the live wall-target and ball-read lanes.

## Day mode — Saturday cypher

Day mode should feel like a perfect blue-ball afternoon: optimistic, saturated,
sun-warmed, and crowded without becoming pastel or washed out.

- bright cyan-to-blue sky with light atmospheric haze
- sun-bleached warm concrete rather than neutral gray
- cooler blue-gray wall shadow so the ball separates from both light and shade
- hard but slightly softened directional shadows that communicate player depth
- vivid orange, aqua, lime, magenta, and violet streetwear accents
- chain-link highlights, faded paint, sticker layers, and selective greenery
- sparing warm lens glints only outside active contact windows
- HUD surfaces based on warm off-white paper and ink with saturated signal color

The wall stays the quietest major color field. Brightness comes from sky,
wardrobe, signage, crowd details, and signal accents—not from putting noise
behind the ball.

## Night mode — floodlight battle

Night mode should feel like a legal, playable court under city floodlights, not
a dark UI laid over the day scene.

- deep indigo sky and blue-black surroundings rather than flat black
- warm sodium-vapor key light crossed with a cool moon/flood fill
- localized cyan, amber, magenta, and violet emissive graffiti
- bright court-line paint and a restrained ball rim/halo calibrated for motion
- stronger player rim light and simpler interior sprite values
- window glow, distant traffic color, fence reflections, and crowd silhouettes
- optional subtle damp-concrete sheen only as a cosmetic material treatment
- HUD surfaces based on ink, smoked acrylic, and luminous signal color

Bloom must be bounded. It cannot enlarge the apparent wall target, hide the ball
edge, or turn every bright object into the same glowing mass.

## Theme control

- expose a labeled `Day / Night` control in the court shell and pause/settings
  surface
- support keyboard and gamepad navigation with a visible focus state
- save the explicit player choice locally
- use system color preference only for the first visit; never switch an active
  match because the real-world clock changed
- transition over roughly 300–500ms outside live ball contact
- defer the transition until the next dead-ball moment when changed during play
- keep venue and time-of-day independent: West 4th Day and West 4th Night are
  art variants of the same court geometry

## Competitive readability contract

Every mode and venue must pass the same gates:

1. The physical ball edge remains identifiable in representative wall, sky,
   floor, player, and particle overlap cases.
2. Short line, long line, sidelines, service markers, and wall boundaries remain
   distinguishable without relying on hue alone.
3. Player, opponent, active server, and current receiver are readable at every
   supported camera depth.
4. Legal, fault, down, block, and winner states use text plus a unique
   silhouette, icon, or motion signature.
5. Camera shake, bloom, flashes, particles, and trails have reduced-effects
   controls.
6. Day and Night use the exact same simulation seed, input stream, geometry, and
   rule outcomes in replay comparison.

## Implementation pass

### 1. Token and scene seam

- consolidate current CSS colors into semantic tokens
- add a serializable `VisualTheme` object consumed by the DOM, 2.5D canvas, and
  3D renderer
- add explicit `data-theme="day|night"` state and local persistence
- prove that a theme toggle cannot mutate a simulation snapshot or replay hash

### 2. Day-mode color script

- repaint app shell, HUD, court, wall, environment, effects, and wardrobe as one
  coordinated color script
- protect live wall and ball lanes from decorative contrast
- capture Tactical, Player, and Courtside reference frames at desktop and phone

### 3. Night-mode light rig

- build the floodlight key/fill/rim rig and matching fog/exposure values
- create authored emissive accents with strict bloom layers
- recalibrate ball rim, court lines, character values, particles, and UI

### 4. Retro-modern character pass

- define shared pixel value ramps, outline weights, pose silhouettes, and comic
  highlight rules
- extend skin, hair, clothing, and accessory palettes so every combination is
  readable in both modes
- keep culturally specific archetypes respectful, customizable, and free of
  caricature

### 5. Review and tune

- screenshot matrix: mode × venue × camera × desktop/tablet/phone
- live rally checks with clean contact, deep lob, low kill, crack, block, and
  point-end effects
- contrast and color-vision review plus reduced-motion/reduced-effects review
- player test question: “Where is the ball going?” before “Does this look cool?”
- visual-quality question after readability passes: “Does this feel unmistakably
  like our NYC handball world?”

## Definition of done

The pass is done when Day and Night each look intentional enough to be a
marketable screenshot, a player can change them without learning a settings
system, the ball is at least as readable as before, and deterministic replay
proves that appearance never alters the point.
