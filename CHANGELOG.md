# Changelog

## 0.3.0 — Rhythm and depth

### Playability

- slowed the default visible ball arrival to roughly 74% of the previous prototype while preserving spatial trajectory and rule outcomes
- added four bounded Rhythm Lab presets plus custom, device-saved tuning for master tempo, ball, footwork, read window, and camera depth
- added reproducible playtest codes so players can share an exact feel configuration
- added a receiving Read stance with a foot-speed tradeoff and a controlled step-in weight-transfer reward

### Presentation

- added a deeper Player camera and made it the default
- enlarged the desktop court presentation, strengthened foreground sprite/ball scaling, and added perspective floor guides
- layered scanline texture and harder 16-bit/comic UI treatments into the court and tuning lab

### Research and planning

- added a champion and court-player recruitment, interview, and instrumented playtest protocol
- documented the boundary between footage-derived hypotheses, actual player evidence, and any future public endorsement
- preserved the single-player-first, multiplayer-ready, doubles-ready, and regulated-stakes product boundaries

## 0.2.0 — Gameplay vertical slice

### Court and rules

- mapped the court to official USHA one-wall proportions
- implemented server-only scoring, side outs, two service attempts, and front-wall / bounce validation
- added legal Set positioning and movement-created avoidable block calls
- added post-match rally, contact, crack, and block statistics

### Feel and physics

- moved ball integration to a deterministic 120 Hz fixed step
- added time-based drag, lateral english, vertical spin, floor response, crack-seam behavior, and seeded fist-ball knuckle flutter
- added live bounce prediction plus difficulty-scaled landing reads
- implemented contact quality from preparation, spacing, footwork balance, and fly / bounce / short-hop interception
- added shot-specific preparation windows and a real control-versus-power tradeoff
- preserved true analog movement magnitude with momentum-aware direction changes

### Players and opponents

- expanded the roster to Rookie Rae, Wall Ghost, and King Shade with distinct movement, tactics, shot selection, and visual identities
- added match-memory responses to repeated player patterns
- added a device-saved My Player creator with modular bodies, faces, hair, clothing, colorways, emblems, footwear, accessories, eyewear, and body art

### Presentation and access

- added Broadcast, Follow, and Courtside cameras with zoom
- added West 4th Street, Coney Island, and Venice Beach atmosphere presets
- layered pixel sprites, comic ink, wall targeting, impact typography, particles, hit-stop, synthesized audio, and gamepad rumble
- added keyboard, touch, and standard Gamepad API controls
- added Wall School drills, help content, live status messaging, and reduced-motion behavior

### Delivery

- added dependency-free structural smoke tests
- added an automated GitHub Pages test deployment
