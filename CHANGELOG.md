# Changelog

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
