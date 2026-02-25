# Spirit Collectors - Content Creation Guide

This guide explains how to add your own content to the game: new monsters, maps, items, moves, NPCs, and more. Everything is data-driven through JSON files and TypeScript, so you don't need to touch the game engine.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Tile Types Reference](#tile-types-reference)
3. [Creating Maps](#creating-maps)
4. [Adding Monsters](#adding-monsters)
5. [Adding Moves](#adding-moves)
6. [Adding Items](#adding-items)
7. [Adding NPCs](#adding-npcs)
8. [Adding Encounter Zones](#adding-encounter-zones)
9. [Adding Monster SVG Art](#adding-monster-svg-art)
10. [Biome Types](#biome-types)
11. [Monster Types & Effectiveness](#monster-types--effectiveness)
12. [Registering New Maps](#registering-new-maps)
13. [Tips & Best Practices](#tips--best-practices)

---

## Project Structure

```
public/data/
  monsters.json      - All monster species definitions
  moves.json         - All moves/attacks
  items.json         - All items (healing, capture, key items)
  npcs.json          - All NPC definitions (trainers, healers, shopkeepers, flavor)
  encounters.json    - Encounter zone definitions (which monsters spawn where)
  maps/              - All map JSON files
    home.json
    town.json
    wild_steppe.json
    ...etc

src/data/
  monsterSprites.ts  - SVG artwork for each monster (keyed by species ID)

src/scenes/
  BootScene.ts       - Where all data files are loaded (you register new maps here)
```

---

## Tile Types Reference

Every map grid is a 2D array of numbers. Each number represents a tile type:

| Number | Tile Type    | Description | Walkable? |
|--------|-------------|-------------|-----------|
| **0**  | GROUND      | Basic open ground (grass-colored in most biomes) | Yes |
| **1**  | WALL        | Solid wall/rock/tree - blocks movement | **No** |
| **2**  | TALL_GRASS  | Tall grass - walkable but triggers wild encounters | Yes |
| **3**  | PATH        | Dirt/stone path - walkable, no encounters | Yes |
| **4**  | WATER       | Water/lake/ocean (renders as lava in volcano biome!) | **No** |
| **5**  | FENCE       | Wooden fence - blocks movement | **No** |
| **6**  | HOUSE_WALL  | House wall (cream/beige colored) | **No** |
| **7**  | HOUSE_DOOR  | Door tile - walkable, typically used as an exit point | Yes |
| **8**  | ROOF        | Roof tile (red) - blocks movement | **No** |
| **9**  | FLOWERS     | Decorative flowers on grass - walkable | Yes |
| **10** | LEDGE       | Solid ledge cliff - blocks movement entirely | **No** |
| **11** | SIGN        | Sign post on grass - blocks movement | **No** |
| **12** | LEDGE_JUMP  | One-way ledge - can ONLY walk onto it going DOWN | Special |

### Ledge Jump (12) Details
- You can step onto tile 12 ONLY when moving DOWN (south)
- When you do, your character hops down with an animation
- You CANNOT walk onto it from any other direction (up, left, right)
- Use this to create one-way shortcuts like Pokemon's ledge system

---

## Creating Maps

Maps are JSON files in `public/data/maps/`. Here's the complete format:

```json
{
  "id": "my_new_map",
  "name": "My Cool Area",
  "cols": 20,
  "rows": 15,
  "grid": [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,0,0,0,0,3,3,3,0,0,0,2,2,0,0,1],
    ...more rows...
    [1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1]
  ],
  "exits": [
    {
      "col": 9,
      "row": 14,
      "targetMap": "town",
      "targetCol": 5,
      "targetRow": 1,
      "direction": "DOWN"
    }
  ],
  "npcs": [
    { "npcId": "my_npc", "col": 5, "row": 7 }
  ],
  "encounterZone": "my_encounter_zone",
  "playerSpawn": { "x": 9, "y": 1 },
  "biomeType": "forest",
  "isSafeZone": false
}
```

### Key rules:
- **`cols`/`rows`**: Must match the actual grid dimensions exactly
- **`grid`**: First row is row 0. First column is col 0. Every row must have the same number of elements
- **Border**: Row 0, last row, col 0, and last col should generally be walls (1), except where exits are
- **Exits**: The tile at the exit position must be walkable (use 3 for path). `targetMap` is the `id` of the destination map. `targetCol`/`targetRow` is where the player appears in that map. `direction` is the direction the player faces on arrival
- **`encounterZone`**: Set to a zone ID from encounters.json, or `null` for safe areas
- **`playerSpawn`**: Default position when entering the map (used if no exit specifies a position)
- **`biomeType`**: Controls the color palette (see Biome Types section)
- **`isSafeZone`**: If true, no wild encounters even if encounterZone is set

### Exit with required flag:
You can lock exits behind flags:
```json
{ "col": 28, "row": 13, "targetMap": "wild_steppe", "targetCol": 2, "targetRow": 15, "direction": "RIGHT", "requiredFlag": "hasFirstSpirit" }
```

### Making a house:
```
8,8,8      <- roof (row above the house)
6,6,6      <- house wall
6,7,6      <- house wall with door in the middle
```
Then add an exit on the door tile (7) pointing to an interior map.

### Interior maps:
Small 8x6 maps with walls around the border, house_wall (6) interior, and a door (7) as the exit:
```json
{
  "id": "my_shop",
  "cols": 8, "rows": 6,
  "grid": [
    [1,1,1,1,1,1,1,1],
    [1,6,6,6,6,6,6,1],
    [1,6,0,0,0,0,6,1],
    [1,6,0,0,0,0,6,1],
    [1,6,0,0,7,0,6,1],
    [1,1,1,1,1,1,1,1]
  ],
  "exits": [
    { "col": 4, "row": 4, "targetMap": "my_town", "targetCol": 5, "targetRow": 6, "direction": "DOWN" }
  ],
  "npcs": [{ "npcId": "my_shopkeeper", "col": 3, "row": 2 }],
  "encounterZone": null,
  "playerSpawn": { "x": 4, "y": 3 },
  "biomeType": "interior",
  "isSafeZone": true
}
```

---

## Adding Monsters

Add entries to `public/data/monsters.json`. Each monster looks like:

```json
{
  "id": 51,
  "name": "Coolmon",
  "types": ["water", "ice"],
  "baseHP": 50,
  "baseAttack": 45,
  "baseDefense": 40,
  "baseSpeed": 55,
  "learnset": [
    { "level": 1, "moveId": 10 },
    { "level": 5, "moveId": 12 },
    { "level": 10, "moveId": 15 },
    { "level": 18, "moveId": 25 }
  ],
  "evolution": { "level": 20, "speciesId": 52 },
  "rarity": "common",
  "placeholderColor": "#44aacc",
  "xpYield": 55
}
```

### Fields explained:
- **`id`**: Unique number. Next available is 51+
- **`types`**: Array of 1-2 types. Valid: `fire`, `water`, `grass`, `electric`, `normal`, `ice`, `fighting`, `poison`, `ground`, `dragon`
- **`baseHP/Attack/Defense/Speed`**: Stats scale with level. Higher = stronger. Typical ranges: 30-60 for basics, 50-90 for evolved, 80-120 for legendaries
- **`learnset`**: Moves learned at each level. `moveId` must match an entry in moves.json
- **`evolution`**: Optional. `level` = when it evolves, `speciesId` = what it evolves into. Remove this field for final evolutions
- **`rarity`**: `"common"`, `"uncommon"`, `"rare"`, or `"legendary"`. Affects encounter rates
- **`placeholderColor`**: Hex color fallback if no SVG art exists
- **`xpYield`**: XP given when defeated. ~40-80 for commons, 100-200 for rares/legendaries

---

## Adding Moves

Add entries to `public/data/moves.json`:

```json
{
  "id": 46,
  "name": "Frost Beam",
  "type": "ice",
  "power": 70,
  "accuracy": 95,
  "description": "A beam of freezing energy."
}
```

- **`id`**: Unique number, next available is 46+
- **`type`**: Must be a valid monster type
- **`power`**: Damage dealt (30 = weak, 60 = medium, 90 = strong, 120+ = very powerful)
- **`accuracy`**: Hit chance out of 100 (95 = reliable, 70 = risky)

---

## Adding Items

Add entries to `public/data/items.json`:

```json
{
  "id": 22,
  "name": "Mega Salve",
  "description": "Restores 150 HP to one spirit.",
  "category": "healing",
  "effect": { "type": "healFlat", "amount": 150 },
  "price": 600
}
```

### Categories:
- **`healing`**: Usable in battle to heal. Effects: `{ "type": "healFlat", "amount": 100 }` or `{ "type": "healPercent", "percent": 50 }`
- **`capture`**: Spirit orbs. Effect: `{ "type": "capture", "multiplier": 1.5 }`
- **`keyItem`**: Story items, not usable in battle. Effect: `{ "type": "none" }`

### Adding items to shops:
In npcs.json, shopkeepers have `eventData.shopItems` which is an array of item IDs:
```json
"eventData": { "shopItems": [2, 3, 7, 10, 22] }
```

---

## Adding NPCs

Add entries to `public/data/npcs.json`:

### Flavor NPC (just talks):
```json
{
  "id": "my_npc",
  "name": "Friendly Person",
  "facing": "DOWN",
  "placeholderColor": "#CC8844",
  "dialogue": [
    {
      "lines": ["Hello there!", "Nice weather we're having."]
    }
  ]
}
```

### NPC with conditional dialogue:
```json
{
  "id": "my_npc",
  "name": "Guide",
  "facing": "DOWN",
  "placeholderColor": "#88AA44",
  "dialogue": [
    {
      "condition": { "flag": "hasFirstSpirit", "value": false },
      "lines": ["You need a spirit companion first!"]
    },
    {
      "condition": { "flag": "hasFirstSpirit", "value": true },
      "lines": ["Good luck on your adventure!"]
    }
  ]
}
```

### Trainer NPC:
```json
{
  "id": "my_trainer",
  "name": "Trainer Sam",
  "facing": "DOWN",
  "placeholderColor": "#AA4444",
  "trainer": {
    "party": [
      { "speciesId": 10, "level": 12 },
      { "speciesId": 14, "level": 14 }
    ],
    "visionRange": 4,
    "defeatFlag": "defeated_my_trainer",
    "reward": { "items": [{ "itemId": 3, "quantity": 2 }] }
  },
  "dialogue": [
    {
      "condition": { "flag": "defeated_my_trainer", "value": false },
      "lines": ["You dare challenge me?!", "Let's battle!"]
    },
    {
      "condition": { "flag": "defeated_my_trainer", "value": true },
      "lines": ["You beat me... well fought."]
    }
  ]
}
```

### Healer NPC:
```json
{
  "id": "my_healer",
  "name": "Nurse Joy",
  "facing": "DOWN",
  "placeholderColor": "#FF88AA",
  "dialogue": [
    {
      "lines": ["Welcome! Let me heal your spirits."],
      "event": "healParty"
    }
  ]
}
```

### Shopkeeper NPC:
```json
{
  "id": "my_shopkeeper",
  "name": "Merchant",
  "facing": "DOWN",
  "placeholderColor": "#44AA88",
  "dialogue": [
    {
      "lines": ["Welcome to my shop! Take a look."],
      "event": "openShop",
      "eventData": { "shopItems": [1, 2, 3, 8, 9] }
    }
  ]
}
```

### Placing NPCs on maps:
In your map JSON, add them to the `npcs` array:
```json
"npcs": [
  { "npcId": "my_trainer", "col": 10, "row": 5 },
  { "npcId": "my_healer", "col": 3, "row": 2 }
]
```
Make sure the NPC is on a walkable tile!

---

## Adding Encounter Zones

Add entries to `public/data/encounters.json`:

```json
{
  "id": "my_zone",
  "monsters": [
    { "speciesId": 1, "minLevel": 3, "maxLevel": 7, "weight": 40 },
    { "speciesId": 7, "minLevel": 3, "maxLevel": 6, "weight": 40 },
    { "speciesId": 10, "minLevel": 4, "maxLevel": 7, "weight": 15 },
    { "speciesId": 16, "minLevel": 5, "maxLevel": 8, "weight": 5 }
  ]
}
```

- **`weight`**: Relative spawn chance. Higher = more common. All weights in a zone are relative to each other
- **`minLevel`/`maxLevel`**: Random level range for spawned monsters
- Set `"encounterZone": "my_zone"` on your map to use it

---

## Adding Monster SVG Art

Edit `src/data/monsterSprites.ts` to add SVG art for your monster:

```typescript
export const monsterSprites: Record<number, string> = {
  // ...existing entries...

  51: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <ellipse cx="32" cy="40" rx="16" ry="14" fill="#44aacc"/>
    <circle cx="32" cy="28" r="12" fill="#55bbdd"/>
    <circle cx="27" cy="26" r="3" fill="#fff"/>
    <circle cx="37" cy="26" r="3" fill="#fff"/>
    <circle cx="28" cy="26" r="1.5" fill="#222"/>
    <circle cx="38" cy="26" r="1.5" fill="#222"/>
  </svg>`,
};
```

### SVG Tips:
- ViewBox is always `0 0 64 64` (64x64 pixel canvas)
- Center your creature around x=32, y=32
- Use simple shapes: `<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<path>`
- Always include eyes: white circles (r=3) with dark pupils (r=1.5)
- Use `fill="#hexcolor"` for solid colors
- Use `stroke="#color" stroke-width="1.5"` for outlines/details
- Keep SVGs simple - under 800 characters each
- The SVG renders at various sizes (80x80 in battle, 16x16 in menus)

### Common shapes:
- **Body**: `<ellipse cx="32" cy="40" rx="16" ry="14" fill="#color"/>`
- **Head**: `<circle cx="32" cy="28" r="12" fill="#color"/>`
- **Eyes**: `<circle cx="27" cy="26" r="3" fill="#fff"/>` + `<circle cx="28" cy="26" r="1.5" fill="#222"/>`
- **Ears/horns**: `<polygon points="22,20 18,8 26,18" fill="#color"/>`
- **Tail/flames**: `<path d="M48,42 Q56,38 54,44" fill="#color"/>`

If no SVG exists for a monster, it falls back to a colored rectangle using `placeholderColor`.

---

## Biome Types

Set `"biomeType"` in your map to change the visual palette:

| Biome | Ground | Water Renders As | Best For |
|-------|--------|-----------------|----------|
| `town` | Bright grass | Blue water | Cities, villages |
| `forest` | Green grass | Blue water | Wooded routes |
| `desert` | Sandy yellow | Blue water | Arid areas |
| `tundra` | Frosty gray-blue | Blue water | Cold/snowy areas |
| `lake` | Green grass | Blue water | Lakeside areas |
| `interior` | Gray floor | N/A | Indoor spaces |
| `volcano` | Dark ashy | **Orange/red LAVA!** | Volcanic areas |
| `swamp` | Dark murky green | Green-tinted | Swamp/marsh |
| `mountain` | Gray rocky | Blue water | Mountain areas |
| `coastal` | Sandy yellow | Bright blue | Beach/ocean |

---

## Monster Types & Effectiveness

| Attacking ↓ / Defending → | fire | water | grass | electric | ice | ground | fighting | poison | normal | dragon |
|---|---|---|---|---|---|---|---|---|---|---|
| **fire** | 0.5x | 0.5x | **2x** | - | **2x** | - | - | - | - | - |
| **water** | **2x** | 0.5x | 0.5x | - | - | **2x** | - | - | - | - |
| **grass** | 0.5x | **2x** | 0.5x | - | - | **2x** | - | - | - | - |
| **electric** | - | **2x** | 0.5x | 0.5x | - | **0x** | - | - | - | - |
| **ice** | 0.5x | 0.5x | **2x** | - | 0.5x | - | - | - | - | **2x** |
| **ground** | **2x** | - | 0.5x | **2x** | - | - | - | **2x** | - | - |
| **fighting** | - | - | - | - | **2x** | - | - | - | **2x** | 0.5x |
| **poison** | - | - | **2x** | - | - | 0.5x | - | 0.5x | - | - |
| **normal** | - | - | - | - | - | - | - | - | - | - |
| **dragon** | - | - | - | - | - | - | - | - | - | **2x** |

`-` = neutral (1x damage), **2x** = super effective, 0.5x = not very effective, **0x** = immune

---

## Registering New Maps

After creating a map JSON file, you must register it in `src/scenes/BootScene.ts`:

Add a line in the `preload()` method:
```typescript
this.load.json('map_my_new_map', 'data/maps/my_new_map.json');
```

The key format is `map_` + the map's `id` field.

---

## Tips & Best Practices

1. **Test exits**: Make sure exits are bidirectional. If map A exits to map B, map B should have an exit back to map A
2. **Check tile counts**: Every row in your grid must have exactly `cols` elements. Every grid must have exactly `rows` rows
3. **NPC placement**: NPCs must be on walkable tiles (0, 3, 7, 9). Don't place them on walls
4. **Evolution chains**: Make sure evolution `speciesId` values point to monsters that actually exist
5. **Learnset moves**: Make sure all `moveId` values in learnsets exist in moves.json
6. **Shop items**: Make sure all item IDs in `shopItems` arrays exist in items.json
7. **Encounter balance**: Use `weight` to control rarity. Common: 30-50, Uncommon: 10-20, Rare: 3-8, Legendary: 1-2
8. **Level scaling**: Routes further from the starting town should have higher-level encounters
9. **Run `npm run build`** after changes to catch any TypeScript errors

### Quick workflow to add a new area:
1. Create the map JSON file in `public/data/maps/`
2. Add exits on an existing map pointing to your new map (and vice versa)
3. Add encounter zone in encounters.json (if it has wild encounters)
4. Add any NPCs in npcs.json
5. Register the map in BootScene.ts
6. Build and test!
