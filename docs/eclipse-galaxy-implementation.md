## Eclipse: Second Dawn Galaxy Implementation

Complete implementation of the Eclipse board game galaxy map system.

## Overview

This implementation provides the full hex grid galaxy board from Eclipse: Second Dawn for the Galaxy, including all 54 sector tiles, population squares, wormhole connections, discovery tiles, and player control mechanics.

## Architecture

### Type System (`src/types/eclipse-sectors.ts`)

**Core Types**:
- `EclipseSector` - Complete sector tile data
- `PopulationSquare` - Resource-producing planets
- `WormholeEdge` - Wormhole gates on hex edges
- `DiscoveryTile` - Hidden rewards with Ancient guardians
- `SectorRing` - Center | Inner | Middle | Outer | Starting | Guardian

**Sector Numbering** (from official Eclipse rules):
- Center: 001
- Inner: 101-110 (10 tiles)
- Middle: 201-211, 214, 281 (13 tiles)
- Outer: 301-318, 381-382 (20 tiles)
- Starting: 221-232 (6 tiles, one per player)
- Guardian: 271-274 (4 tiles, advanced challenges)

**Total**: 54 sector tiles

### Components

#### EclipseSectorTile (`src/components/eclipse/EclipseSectorTile.tsx`)

Renders sector content:
- **Population Squares**: Colored by resource type (money=yellow, science=blue, materials=orange, gray=any)
- **Advanced Markers**: Star symbol (★) for advanced populations requiring tech
- **Discovery Tiles**: Purple circle when unrevealed, green when revealed
- **Ancient Ships**: Red warning (⚠) with count
- **Player Ships**: Blue rocket (🚀) with count and pinned status
- **Influence Disks**: Colored circle for player control

**Sub-components**:
- `PopulationSquares` - Grid layout of resource squares
- `DiscoveryTileOverlay` - Overlay rendering
- `AncientShips` - Ancient guardian count
- `PlayerShips` - Fleet count with pinned indicator
- `InfluenceDisk` - Control marker
- `WormholeEdges` - Wormhole gates on hex borders

#### EclipseGalaxyBoard (`src/components/eclipse/EclipseGalaxyBoard.tsx`)

Main galaxy board container:
- Renders all placed sectors (center, starting, explored)
- Click and hover handlers for sector interaction
- Color-coded by sector type:
  - Center: Deep purple
  - Guardian: Dark red
  - Controlled: Blue tint
  - Unexplored: Dark gray
  - Default: Gray

**Props**:
```typescript
interface EclipseGalaxyBoardProps {
  sectors: EclipseSector[];                  // All sectors to render
  onSectorClick?: (sectorId: string) => void; // Click handler
  onSectorHover?: (sectorId: string | null) => void; // Hover handler
  showCoordinates?: boolean;                 // Show sector IDs and coordinates
}
```

### Sample Data (`src/data/sample-eclipse-sectors.ts`)

**Predefined Sectors**:
- `GALACTIC_CENTER` - Center hex (001) with 6 wormholes
- `SAMPLE_STARTING_SECTOR` - Player home sector (221)
- `SAMPLE_INNER_SECTOR_WITH_DISCOVERY` - Inner sector with discovery tile
- `SAMPLE_MIDDLE_SECTOR_RICH` - Resource-rich middle sector
- `SAMPLE_GUARDIAN_SECTOR` - Guardian sector with powerful ancients
- `SAMPLE_2_PLAYER_GALAXY` - Complete 2-player setup

**Generators**:
- `generateSectorStack(ring, count)` - Create randomized sector stacks for exploration
- `generateRandomPopulation(ring)` - Random population squares
- `generateRandomWormholes()` - Random wormhole placements

## Eclipse Rules Implementation

### Sector Rings

**Starting Setup** (varies by player count):
- Galactic Center (001) placed at table center
- Each player gets a starting sector (221-226)
- Guardian sectors placed if using that variant
- Remaining sectors shuffled into face-down stacks by ring

**Stack Sizes** (by player count):
```typescript
Outer stack size:
- 2 players: 6 tiles
- 3 players: 9 tiles
- 4 players: 12 tiles
- 5 players: 15 tiles
- 6 players: 18 tiles
```

### Population Squares

Four resource types:
1. **Gray** (neutral) - Can produce any resource, player chooses
2. **Money** (yellow) - Produces credits
3. **Science** (blue) - Produces science points
4. **Materials** (orange) - Produces raw materials

**Advanced Populations** (marked with ★):
- Require advanced technology to colonize
- Higher production values
- Found on richer/harder sectors

### Wormhole Connections

**Movement Rules**:
- Ships move only through wormhole network
- Adjacent sectors must have matching wormholes on connecting edges
- Wormhole Generator tech modifies this (allows movement with single wormhole)

**Exploration Rules**:
- Can only explore if wormhole connection exists from controlled sector
- Must orient new sector to create wormhole connection
- Placement determines which hexes become accessible

**Implementation**:
```typescript
function hasWormholeConnection(sector1, sector2): boolean {
  // Check if adjacent
  // Calculate relative direction
  // Verify wormholes on both sides (accounting for orientation)
  // Return true if connected
}
```

### Discovery Tiles

**Placement**:
- Some sectors have discovery tile symbol
- Discovery tile placed face-down on sector
- If sector has Ancient symbols, place that many Ancients on top

**Resolution**:
- Player must defeat Ancients to reveal tile
- Front side shows reward (credits, science, materials, reputation, artifact)
- Back side always worth 2 VP

**Current Implementation**:
- Discovery tile rendered as purple circle (unrevealed) or green circle (revealed)
- Ancient count displayed
- Reward value shown when revealed

### Influence and Control

**Influence Action**:
- Costs 1 influence disk from player mat
- Can influence uncontrolled sector where no opponent ships present
- Requires wormhole/warp connection to controlled sector

**Control**:
- Controlled sectors produce resources during Income Phase
- Influence disk shows ownership
- Removing connecting influence breaks control chain

**Visual**:
- Filled circle = controlled (produces resources)
- Empty circle = influenced (not producing yet)
- Player color indicates owner

### Combat

**Trigger**: When opponent ships occupy same sector

**Integration with Existing System**:
- Current roguelike has excellent combat engine
- Can be adapted for Eclipse board game combat
- Same ship customization (parts, weapons)
- Same combat resolution (initiative, targeting, damage)

## Demo Page (`src/pages/EclipseDemoPage.tsx`)

**Features**:
- Toggle coordinate display
- Click sectors for detailed info
- Hover for quick preview
- Sector breakdown panel
- Resource legend

**Sample Galaxy**:
- 2-player setup
- Galactic Center
- 2 starting sectors (player1, player2)
- Inner sector with discovery tile + ancient
- Middle sector (rich resources, player2 controlled)
- Guardian sector (powerful ancients)

**Run**: `npm run dev` → `http://localhost:5173/eclipse-demo.html`

## Integration Points

### Convex Multiplayer Schema

Recommended schema addition:

```typescript
galaxyState: defineTable({
  roomId: v.id("rooms"),

  // Sector stacks (unexplored)
  innerStack: v.array(v.string()), // Sector IDs
  middleStack: v.array(v.string()),
  outerStack: v.array(v.string()),

  // Placed sectors
  sectors: v.array(v.object({
    id: v.string(),
    ring: v.string(),
    explored: v.boolean(),
    orientation: v.number(),
    coordinates: v.object({ q: v.number(), r: v.number(), s: v.number() }),
    populationSquares: v.array(v.object({
      type: v.string(),
      advanced: v.boolean(),
      resources: v.number(),
      occupied: v.optional(v.boolean()) // Population cube placed
    })),
    wormholes: v.array(v.object({
      direction: v.number(),
      type: v.string()
    })),
    discoveryTile: v.optional(v.object({
      id: v.string(),
      revealed: v.boolean(),
      type: v.optional(v.string()),
      value: v.optional(v.number()),
      ancientCount: v.number()
    })),
    controlledBy: v.optional(v.string()),
    influenceDisk: v.optional(v.string()),
    ships: v.array(v.object({
      playerId: v.string(),
      count: v.number(),
      pinned: v.boolean()
    })),
    ancients: v.array(v.object({
      count: v.number(),
      type: v.string()
    }))
  }))
}).index("by_room", ["roomId"])
```

### Turn System Integration

Eclipse has 6 action phases per round:
1. **Explore** - Draw and place new sector
2. **Influence** - Place influence disk
3. **Research** - Buy technology tile
4. **Upgrade** - Improve ship designs
5. **Build** - Construct ships
6. **Move** - Move ships through wormholes

Each phase triggers different UI:
- Explore: Highlight adjacent unexplored spaces, show stack to draw from
- Influence: Highlight sectors eligible for influence
- Move: Highlight sectors reachable via wormholes

### Resource System Integration

Coordinate with **Resources agent** on:
- Money (credits) production from yellow squares
- Science production from blue squares
- Materials production from orange squares
- Gray squares assigned by player choice
- Advanced populations require tech tiles (from **Tech-tree agent**)

### Technology System Integration

Coordinate with **Tech-tree agent** on:
- **Wormhole Generator**: Changes wormhole connection rules
- **Advanced Economy/Labs/Mines**: Allows colonizing advanced (★) populations
- **Orbital**: Adds population square to controlled sector
- Other tech tiles that affect galaxy exploration

## Next Steps

### High Priority

1. **Exploration Mechanics**
   - Implement draw from stack
   - Validate wormhole placement
   - Handle sector orientation
   - Update Convex galaxy state

2. **Convex Integration**
   - Add galaxy state schema
   - Sync sector placement
   - Real-time updates for all players
   - Handle concurrent exploration

3. **Turn System**
   - Implement 6 action phases
   - Action validation (can player explore here?)
   - Pass/done system

### Medium Priority

4. **Sector Stack Management**
   - Initialize stacks by player count
   - Shuffle sectors
   - Draw mechanics
   - Empty stack handling

5. **Influence System**
   - Influence action UI
   - Validate influence placement
   - Control chain calculation
   - Income generation from controlled sectors

6. **Combat Triggers**
   - Detect when ships meet
   - Launch existing combat system
   - Combat resolution affects sector ownership

### Low Priority

7. **Visual Polish**
   - Animated sector placement
   - Smooth ship movement
   - Discovery tile flip animation
   - Zoom/pan controls

8. **Mobile Optimization**
   - Touch-friendly hex sizes
   - Pinch zoom
   - Responsive layout

## Testing

**Manual Testing**:
1. Run `npm run dev`
2. Open `http://localhost:5173/eclipse-demo.html`
3. Verify all sector types render correctly
4. Test click/hover interactions
5. Check population squares display resource types
6. Verify wormhole indicators on edges
7. Confirm discovery tiles and ancients render

**Automated Tests** (TODO):
- Wormhole connection validation
- Sector production calculation
- Influence chain validation
- Sector stack generation

## References

- [Eclipse: Second Dawn Official Rules](https://cdn.1j1ju.com/medias/bb/af/07-eclipse-second-dawn-for-the-galaxy-rulebook.pdf)
- [Dized Rules - Sector Setup](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/kiQflaZoQaehrBIVgWap0Q/2-sector-setup)
- [Dized Rules - Exploration](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/lTdsEuraRVmBhbHfeoDrKw/explore-overview)
- [Dized Rules - Wormholes](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/RIubkL06QQGj58ciYVlRJw/wormhole-generator)
- [Red Blob Games - Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/)

---

*Implementation by Frontend Engineer (Hex Grid specialist)*
*Last updated: 2026-02-22*
