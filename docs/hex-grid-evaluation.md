# Hex Grid Library Evaluation for Eclipse

## Current Codebase Analysis

**Project**: Eclipse roguelike (space combat game)
- Current phases: Outpost (ship building) → Combat (battles)
- Tech stack: React 19, Vite, TypeScript, Convex (multiplayer)
- Mobile-first design
- No hex grid currently implemented

**Reference Implementation**: `/workspace/extra/home/eclipse-browser-game/src/components/EclipseGameBoard.tsx`
- Uses `react-hexgrid@2.0.1`
- Simple 3-ring layout (center + ring1 + ring2 + ring3)
- Displays q,r,s coordinates in each hex

## Library Options

### 1. react-hexgrid (Current choice in reference)

**Package**: `react-hexgrid@2.0.1`
- Last published: Over a year ago
- Maintainer: Hellenic
- Dependencies: classnames, fsevents
- License: MIT

**Pros**:
- Declarative React component API (HexGrid, Layout, Hexagon, Text, Pattern, Path)
- SVG-based rendering (scales perfectly, crisp at all zoom levels)
- Cubic coordinate system (q, r, s) built-in
- GridGenerator utilities for common patterns (rings, rectangles, parallelograms)
- TypeScript support
- Storybook examples
- Active community with multiple forks

**Cons**:
- SVG performance degrades with 5,000+ DOM elements
- Drag & Drop still under development
- Not actively maintained (last update >1 year ago)
- May have compatibility issues with React 19 (current project uses React 19.1.1)

**Sources**:
- [GitHub - Hellenic/react-hexgrid](https://github.com/Hellenic/react-hexgrid)
- [react-hexgrid on npm](https://www.npmjs.com/package/react-hexgrid)

### 2. Custom Canvas Implementation

**Approach**: Build hex grid using HTML5 Canvas API

**Pros**:
- Superior performance for large grids (no DOM overhead)
- Smooth animations and interactions
- Full control over rendering pipeline
- Better mobile performance
- Can easily handle 10,000+ hexes

**Cons**:
- Must implement hex math from scratch
- No built-in React integration
- Accessibility challenges (Canvas is black box to screen readers)
- More complex state management
- Loses vector scaling benefits (pixelation on zoom)

**Libraries to consider**:
- Chart.js (Canvas-based, handles 5K+ points well)
- Apache ECharts (supports both Canvas and SVG via ZRender engine)

**Sources**:
- [SVG versus Canvas](https://www.jointjs.com/blog/svg-versus-canvas)
- [Best Chart Libraries for React 2026](https://weavelinx.com/best-chart-libraries-for-react-projects-in-2026/)

### 3. Custom SVG Implementation

**Approach**: Build hex grid using raw SVG elements

**Pros**:
- Full control without library dependency
- Perfect scaling at all zoom levels
- Clean integration with React
- Easy to inspect/debug in DevTools
- Accessibility support via SVG titles/descriptions

**Cons**:
- Must implement hex coordinate math
- Must implement layout algorithms
- Same performance limitations as react-hexgrid (DOM overhead)
- Significant development time

### 4. Hybrid Approach (SVG + Canvas)

**Approach**: SVG for static grid structure, Canvas for dynamic elements (ships, effects)

**Pros**:
- Best of both worlds
- SVG for crisp hex outlines and labels
- Canvas for smooth ship movement and particles
- Good performance characteristics

**Cons**:
- Most complex to implement
- Two rendering pipelines to maintain
- Synchronization challenges

## Eclipse Board Game Requirements

Based on Eclipse: Second Dawn for the Galaxy:

**Galaxy Structure**:
- 2-6 players
- Center hex (Galactic Center 001)
- Inner ring: sectors 101-108
- Middle ring: sectors 201-211
- Outer ring: sectors 301-318
- Starting sectors: 221-232
- Total: 54 sector hexes

**Hex Content**:
- Population squares (colored, represent resources)
- Planets (different types)
- Wormhole gates (connections between non-adjacent sectors)
- Ancient ships/guardians
- Discovery tiles
- Influence disks (player ownership)
- Ship tokens (player fleets)
- Face-up vs face-down tiles (explored vs unexplored)

**Interactions**:
- Click to explore (draw face-down tile)
- Click to move ships
- Hover for sector details
- Zoom/pan for navigation
- Highlight valid movement paths

**Sources**:
- [Eclipse Official Rules](https://www.ultraboardgames.com/eclipse/game-rules.php)
- [Eclipse Wikipedia](https://en.wikipedia.org/wiki/Eclipse_(board_game))
- [Eclipse Rulebook PDF](https://cdn.1j1ju.com/medias/bb/af/07-eclipse-second-dawn-for-the-galaxy-rulebook.pdf)

## Recommendation

**CLARIFICATION NEEDED**: Current codebase is a roguelike, not the Eclipse board game. Awaiting team lead direction on:
1. Are we adding hex galaxy exploration to the existing roguelike?
2. Or building a separate Eclipse board game implementation?

### If adding to roguelike:
**Recommend**: react-hexgrid with React 19 compatibility testing
- Start with reference implementation
- Add 3-ring galaxy as exploration map
- Sectors could represent combat zones
- Simple, proven approach

### If building Eclipse board game:
**Recommend**: Custom Canvas implementation
- 54+ hexes with rich content (planets, resources, ships)
- Multiplayer with real-time updates (already have Convex)
- Mobile-responsive (Canvas performs better on mobile)
- More complex interactions justify custom solution

## Next Steps

1. **Await clarification** from team lead
2. Test react-hexgrid compatibility with React 19
3. Create proof-of-concept with both approaches
4. Performance benchmark with expected hex count
5. Design component architecture based on chosen approach
