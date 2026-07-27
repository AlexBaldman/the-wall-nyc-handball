# My Player — MVP Character Creator

## Product goal

The character creator should let players recognize themselves, invent a court persona, or remix a familiar NYC style without forcing identity into a stereotype. The MVP uses modular appearance pieces and style-based presets. Religion, ethnicity, gender expression, and body shape are not difficulty classes, jokes, or opponent traits.

## Implemented option groups

- eight skin tones across a broad light-to-deep range
- compact, lean, athletic, and power body silhouettes
- focused, soft, grinning, tough, and wide-eyed face treatments
- clean shave, stubble, mustache, goatee, and beard options
- buzz, fade, curls, afro, braids, locs, mohawk, and ponytail hairstyles
- tanks, tees, jerseys, hoodies, sport crops, denim, and graffiti-influenced tops
- six remixable outfit colorways and seven chest emblems
- court shorts, track pants, jeans, cargos, leggings, and board shorts
- fitted caps, bucket hats, bandanas, and beanies
- high tops, runners, skate shoes, boots, slides, and retro court sneakers
- independently mixable eyewear, chains, hoops, wrist tape, and arm tattoos

Six starting presets demonstrate the range: Park Ace, Uptown Breaker, LES Skater, Boardwalk Hippy, Downtown Bruiser, and Cage Veteran. Every preset can be completely remixed.

## Game integration

The selected body, face, facial hair, clothing, colorway, emblem, hair, skin, footwear, and accessories are rendered by the same pixel/comic actor used in live rallies. Builds alter visual silhouette only; they do not create competitive reach or speed advantages. The Locker preview animates idle, palm, backhand, roller, and victory poses. The saved avatar is stored locally under `the-wall-avatar`.

For future online play, the avatar can be serialized as a small allow-listed record:

```json
{
  "name": "Court name",
  "skin": "golden",
  "build": "athletic",
  "face": "focused",
  "facialHair": "none",
  "hair": "fade",
  "top": "parkJersey",
  "palette": "original",
  "emblem": "wall",
  "bottom": "courtShorts",
  "headwear": "none",
  "shoes": "highTops",
  "accessory": "wristTape",
  "eyewear": "none",
  "bodyart": "none"
}
```

Servers should validate every option ID, filter player names, and keep cosmetic ownership separate from match physics.

## Next character milestone

- independent per-garment color editing
- layered tattoo placement and freeform emblem editor
- more face shapes and additional hair textures
- unlockable venue-specific drops
- selectable victory poses, entrance styles, and emotes
- accessibility labels for color and pattern choices
- preview animation for every remaining contact type
