import { expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { adjacentPosition, type HexEdge } from "../../shared/eclipse/geometry";
import { galaxyPoint, wormholePoint } from "../second-dawn-game/galaxyGeometry";
import GalaxyBoard from "../second-dawn-game/GalaxyBoard";
import fixturesJson from "../second-dawn-game/reviewFixtures.json?raw";
import { getPlayerView } from "../../shared/eclipse/protocol";
import type { GameState } from "../../shared/eclipse/types";

it("places every rotated opening toward the matching axial neighbor", () => {
  for (let rotation = 0; rotation < 6; rotation++)
    for (let edge = 0; edge < 6; edge++) {
      const point = wormholePoint(edge as HexEdge, rotation);
      const neighbor = galaxyPoint(
        adjacentPosition({ q: 0, r: 0 }, ((edge + rotation) % 6) as HexEdge),
      );
      expect(point.x * neighbor.y - point.y * neighbor.x).toBeCloseTo(0);
      expect(point.x * neighbor.x + point.y * neighbor.y).toBeGreaterThan(0);
    }
});
it("shows sector identities and reveals printed component details on zoom", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).late;
  const view = getPlayerView(state, state.seats[0].id)!;
  render(
    <GalaxyBoard
      view={view}
      candidates={[]}
      selected={null}
      onSelect={() => {}}
      onExplore={() => {}}
    />,
  );
  expect(
    screen.getAllByRole("button", { name: /^Inspect sector/ }),
  ).toHaveLength(view.sectors.length);
  expect(
    screen.getByText("Paired wormholes", { exact: true }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(
    document.querySelector('[data-component="population-square"]'),
  ).not.toBeNull();
  expect(
    screen.getByRole("img", { name: /Whole galaxy overview/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fit", exact: true }));
  expect(
    screen.queryByRole("img", { name: /Whole galaxy overview/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("100%")).toBeInTheDocument();
});

it("renders bridges only for paired physical openings and identifies distant warp portals separately", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).late;
  const view = getPlayerView(state, state.seats[0].id)!;
  view.sectors[0].portalVp = 1;
  view.sectors[view.sectors.length - 1].portalVp = 2;
  const { container } = render(
    <GalaxyBoard
      view={view}
      candidates={[]}
      selected={null}
      onSelect={() => {}}
      onExplore={() => {}}
    />,
  );
  const bridges = container.querySelectorAll('[data-connection="wormhole"]');
  expect(bridges.length).toBeGreaterThan(0);
  for (const bridge of bridges) {
    const dx =
      Number(bridge.getAttribute("x2")) - Number(bridge.getAttribute("x1"));
    const dy =
      Number(bridge.getAttribute("y2")) - Number(bridge.getAttribute("y1"));
    expect(Math.hypot(dx, dy)).toBeCloseTo(Math.sqrt(3) * 60);
  }
  expect(container.textContent).toContain(
    "Warp portal: connects to every other warp portal, regardless of distance.",
  );
});

it('uses faction-tinted sector faces while preserving non-color owner and sector identities',()=>{
 const state=(JSON.parse(fixturesJson) as Record<string,GameState>).midgame;
 const view=getPlayerView(state,state.seats[0].id)!;
 const{container}=render(<GalaxyBoard view={view} candidates={[]} selected={null} onSelect={()=>{}} onExplore={()=>{}}/>);
 for(const sector of view.sectors.filter(item=>item.owner)){
  const tile=[...container.querySelectorAll('.dg-tile')].find(element=>element.getAttribute('aria-label')?.startsWith(`Inspect sector ${sector.tileId},`))!;
  expect(tile.querySelector('.dg-tile-face')?.getAttribute('fill')).toMatch(/^url\(#dg-sector-owner-/);
  expect(Number(tile.querySelector('.dg-tile-face')?.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(2);
  expect(tile.querySelector('.dg-faction-symbol')).not.toBeNull();
  expect(tile.querySelector('.dg-sector-id')?.textContent).toBe(sector.tileId);
 }
});

it('marks legal movement destinations without replacing their ownership colors',()=>{
 const state=(JSON.parse(fixturesJson) as Record<string,GameState>).midgame;
 const view=getPlayerView(state,state.seats[0].id)!;
 const target=view.sectors.find(sector=>sector.owner)!;
 const{container}=render(<GalaxyBoard view={view} candidates={[]} selected={null} legalTargetIds={[target.id]} onSelect={()=>{}} onExplore={()=>{}}/>);
 const tile=screen.getByRole('button',{name:new RegExp(`^Inspect sector ${target.tileId},.*legal move destination`)});
 expect(tile.querySelector('.dg-move-target-ring')).not.toBeNull();
 expect(tile.querySelector('.dg-tile-face')?.getAttribute('fill')).toMatch(/^url\(#dg-sector-owner-/);
 expect(container.querySelectorAll('.dg-move-target-ring')).toHaveLength(1);
});

it('separates ship classes into faction cards and keeps a crowded stack bounded',()=>{
 const state=(JSON.parse(fixturesJson) as Record<string,GameState>).midgame;
 const view=getPlayerView(state,state.seats[0].id)!;
 const sectorId=view.sectors[0].id,owner=view.seats[0].id;
 view.ships=['interceptor','cruiser','dreadnought','starbase','ancient'].map((type,index)=>({id:`test-${index}`,type:type as GameState['ships'][number]['type'],owner:type==='ancient'?'ancient':owner,sectorId,damage:0,arrival:index}));
 view.ships.push({...view.ships[0],id:'second-interceptor'});
 const{container}=render(<GalaxyBoard view={view} candidates={[]} selected={null} onSelect={()=>{}} onExplore={()=>{}}/>);
 expect(container.querySelectorAll('[data-fleet-card]')).toHaveLength(3);
 expect(container.querySelector('[data-fleet-card="interceptor"]')).toHaveTextContent('×2');
 expect(container.querySelector('[data-fleet-card="cruiser"] .dg-ship-silhouette')).toHaveAttribute('aria-label','Cruiser blueprint silhouette');
 expect(screen.getByText('+2 types')).toBeInTheDocument();
 expect(container.querySelector('.dg-fleet-label')).not.toHaveTextContent('1·');
});
it('marks only recent activity and draws a noninteractive movement trail',()=>{
 const state=(JSON.parse(fixturesJson) as Record<string,GameState>).midgame;
 const view=getPlayerView(state,state.seats[0].id)!;
 const [from,to]=view.sectors;
 const{container,rerender}=render(<GalaxyBoard view={view} candidates={[]} selected={null} activity={{affectedSectorIds:[to.id],moves:[{from:from.id,to:to.id}]}} onSelect={()=>{}} onExplore={()=>{}}/>);
 expect(container.querySelectorAll('.dg-tile-activity')).toHaveLength(1);
 expect(container.querySelector('.dg-activity-move')).toHaveAttribute('pointer-events','none');
 rerender(<GalaxyBoard view={view} candidates={[]} selected={null} onSelect={()=>{}} onExplore={()=>{}}/>);
 expect(container.querySelector('.dg-tile-activity')).toBeNull();
 expect(container.querySelector('.dg-activity-move')).toBeNull();
});
