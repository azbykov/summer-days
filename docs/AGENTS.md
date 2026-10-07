# Instructions for AI Coding Agents

## Project goal

Build the smallest playable prototype that can validate the game concept described in:

1. VISION.md
2. GAME_DESIGN.md
3. WORLD.md
4. MVP.md

Read all four documents before making significant gameplay decisions.

---

# Primary rule

DO NOT expand scope without explicit approval.

The current target is the vertical slice described in MVP.md.

Do not proactively implement features from the full game vision.

---

# Prefer validation over architecture

This project is currently testing a hypothesis.

Prefer:

simple working implementation

over:

generalized future-proof system.

Do not build infrastructure for hypothetical future requirements.

---

# MVP boundaries

Do not add:

- Chkalovsk;
- buses;
- aunt visits;
- mother visits;
- full summer calendar;
- complex economy;
- farming systems;
- tractors;
- combine harvesters;
- horses;
- relationship simulation;
- weather simulation;
- advanced motorcycle simulation;
- large NPC systems;

unless explicitly requested.

---

# Game design principles

Do not turn interactions into traditional RPG quests unless explicitly requested.

Avoid:

- quest markers;
- objective arrows;
- Mission Failed screens;
- XP;
- arbitrary reputation points;
- excessive HUD.

Prefer information delivered through:

- dialogue;
- environment;
- schedules;
- objects;
- observation.

---

# World simulation

The world should continue operating independently of the player.

Example:

The cow returns around 19:00 regardless of player location.

Do not pause world events until the player arrives.

---

# Data

Keep gameplay content configurable where doing so is cheap.

Good candidates:

- NPC schedules;
- dialogue;
- event times;
- item definitions;
- motorcycle state;
- interaction text.

Do not create complex content frameworks before they are needed.

Simple JSON/resources/config files are preferable to hard-coded content when appropriate.

---

# Motorcycle

For the MVP the motorcycle is NOT a full mechanical simulator.

Use a minimal internal model sufficient for:

- failed start;
- fuel diagnosis;
- spark diagnosis;
- first partial ignition.

The player should not see internal boolean/debug state.

---

# Bicycle

The bicycle is the primary vehicle in the MVP.

It should exist as a persistent world object.

If the player leaves it somewhere, it stays there.

Do not implement automatic vehicle recall.

---

# Time

Game time continues while the player explores.

Scheduled events should be driven by game time rather than quest state.

---

# Development philosophy

When choosing between:

A. realistic but expensive implementation

and

B. simplified implementation producing the same player experience

choose B.

Before adding a system ask:

> Does this help us determine whether the player wants to spend another day in this world?

If not, it probably does not belong in the MVP.

---

# Before coding a new feature

Check:

1. Is it required by MVP.md?
2. Which hypothesis does it test?
3. Can it be implemented more simply?
4. Does it accidentally require another large system?

If unclear, ask before implementing it.

---

# Current status

Prototype phase.

Stack decision (made, do not revisit without explicit approval):

- TypeScript;
- Phaser 3;
- Vite;
- runs in the browser.

View: top-down world with a directly controlled character, not a map screen with travel points.

The project currently contains placeholder geometry only.
Vysokaya, the road and Shestovo are not authored yet.