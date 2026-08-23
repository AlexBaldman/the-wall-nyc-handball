# World Grammar and Factory Principles

## Purpose

The Wall is one game inside a larger family of interactive systems. Its architecture should improve the game in front of us while also teaching us how to build reusable worlds, simulations, tools, lessons, gamifications, and mixed-reality experiences.

The durable abstraction is broader than an asset factory or game engine. We want a composable **world grammar**: reusable ways to define entities, actions, traits, manners, relationships, constraints, and transformations without forcing every idea into a rigid preordained product category.

This document is project canon. It describes how reusable primitives should be discovered and promoted while building real products.

## Grammar as architecture

A useful mental model is ordinary language:

| Grammar | System analogue | Examples |
| --- | --- | --- |
| Noun | entity, object, concept | player, ball, wall, paddle, shirt, memory |
| Verb | action, capability, transformation | move, strike, throw, wear, teach, remember |
| Adjective | trait, property, persistent modifier | heavy, slippery, glowing, collectible, regulation |
| Adverb | execution modifier, manner, strategy | softly, quickly, accurately, procedurally, visually |
| Relationship | graph edge, ownership, affinity, spatial relation | holds, belongs-to, near, targets, teaches |
| Condition | predicate, rule, permission, state gate | legal, reachable, unlocked, visible, in-bounds |
| Quantity | measurable state | mass, velocity, score, confidence, durability |
| Time | sequencing, duration, cooldown, history | before, after, during, expires-at, last-touched |

The goal is not to force English grammar literally into code. The grammar is a pressure test for whether a useful concept has been buried inside a one-off implementation.

## Noun factories

Noun factories create or transform canonical entities and representations.

Examples include:

- Character Factory
- Item Factory
- Garment Factory
- Ball Factory
- Court / Level Factory
- Environment Factory
- Memory / Card Factory
- Audio / Media Factory

A canonical noun should prefer stable identity and semantic data over a single renderer-specific representation. A ball can have one identity while being represented as pixel art, a Three.js mesh, a VR object, an AR overlay, a physics proxy, or a fabrication model.

## Verb factories

Verbs deserve the same reuse discipline as nouns.

Candidate verb families include:

- move
- prepare
- strike
- throw
- grab
- release
- wear
- craft
- trade
- teach
- learn
- observe
- remember
- build
- transform
- damage
- heal
- speak
- listen

A verb factory assembles a capability pipeline rather than merely selecting an animation.

For example, `throw` may involve:

1. eligibility and permissions;
2. semantic player intent;
3. device-specific input mapping;
4. embodiment and animation;
5. physical release state;
6. simulation and collision;
7. rule consequences;
8. presentation feedback;
9. replay and telemetry.

Different products can reuse portions of the pipeline while supplying different noun types, rules, and presentation.

## Traits and adjectives

Prefer composable traits over exploding inheritance trees.

A noun may carry traits such as:

- heavy
- slippery
- bouncy
- fragile
- glowing
- edible
- wearable
- collectible
- regulation
- dangerous

A trait may affect several systems. `Heavy`, for example, might influence mass, throw effort, animation, sound, AI evaluation, and inventory cost.

Traits remain domain-aware. The word `slippery` can describe a floor, fish, or salesperson without pretending all three share a friction coefficient.

## Manner and adverbs

Actions should allow modifiers that describe how an action is attempted or executed.

Examples:

- strike softly
- aim carefully
- move stealthily
- teach visually
- generate procedurally
- throw forcefully

These modifiers can select strategies, alter timing, affect physics, change animation, influence UI feedback, or choose another implementation while preserving the semantic action.

The architecture should distinguish **intent** from **outcome**. A player may attempt to strike accurately or softly; simulation and context decide what actually happened.

## Relationships and graph thinking

Entities should be able to participate in durable relationships such as:

```text
PLAYER
  holds -> PADDLE
  stands_on -> COURT
  belongs_to -> TEAM
  can -> STRIKE
  aims_at -> BALL

BALL
  affected_by -> GRAVITY
  last_touched_by -> PLAYER
  collides_with -> SURFACE
```

Actions mutate world state and relationships. Physics, rules, AI, rendering, replay, analytics, education, and procedural systems may consume the same state without owning competing truths.

## Factories as transformations

A factory is any reusable transformation with a clear input contract and output contract.

Examples:

```text
source art -> segment -> normalize -> rig -> animate -> sprite sheet
raw trajectory -> classify -> annotate -> explain -> lesson
player action -> evaluate -> score -> reward -> adapt difficulty
idea -> research -> prototype -> test -> product
```

Factories may produce assets, states, metadata, rules, tools, or even other factories. Reusable tools should compound future creation rather than remain trapped inside the feature that revealed them.

## Interaction sentence

When designing an interaction, ask whether the system can clearly represent:

```text
WHO
performed WHAT
on WHAT
with WHAT
WHERE
WHEN
HOW
under WHICH constraints
producing WHICH effects
```

This often reveals the correct seams between actor, action, target, instrument, environment, rules, manner, and result.

## Product categories are views, not prisons

An experience may simultaneously behave like a game, simulation, lesson, tool, social space, story, experiment, marketplace, or trainer.

Do not force a reusable primitive to belong exclusively to one category when several experiences can consume it.

## Promotion rule

During feature work, ask:

1. What noun did we create?
2. What verb did we implement?
3. What reusable traits emerged?
4. What manners or runtime modifiers became useful?
5. What relationships, rules, or conditions did we discover?
6. Could any of these become a reusable primitive without harming the current product?

Do not extract automatically. A new abstraction earns promotion when it removes duplicated ownership, enables a real second consumer, clarifies a contract, or becomes a meaningful reusable tool.

Avoid speculative abstraction whose only accomplishment is renaming existing code.

## Recursive tooling

The system should increasingly be able to use its own tools to create more of itself.

Editors, validators, generators, simulation labs, asset processors, replay tools, calibration harnesses, AI controllers, and research registries should become reusable capabilities. Each successful tool belongs on the growing toolbelt if it lowers the cost of future work.

## Long-term principle

We are not trying to accumulate unrelated applications with slightly different implementations of the same ideas.

We are gradually building a language in which increasingly sophisticated interactive experiences become cheaper and clearer to express.
