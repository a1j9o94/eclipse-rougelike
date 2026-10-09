import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import BuildPlanner from '../second-dawn-game/BuildPlanner';
import GalaxyBoard from '../second-dawn-game/GalaxyBoard';

afterEach(cleanup);
function fixture(exiles = false) {
  const state = createGame({seed:42, factionProfile:'expanded-v2', seats:[{id:'a', faction:exiles?'exiles':'eridani', controller:'human'}, {id:'b', faction:'hydran', controller:'ai'}]});
  const view = getPlayerView(state, 'a')!;
  const sector = view.sectors.find(sector=>sector.owner==='a')!;
  return {view, sector};
}
it('shows civilian structures as separate pieces rather than a portal or house', () => {
  const {view, sector} = fixture();
  render(<BuildPlanner view={view} sectorId={sector.id} disabled={false} onClose={()=>{}} onSubmit={()=>{}}/>);
  expect(screen.getByRole('article', {name:'Orbital'}).querySelector('[data-structure="orbital"]')).toBeInTheDocument();
  expect(screen.getByRole('article', {name:'Monolith'}).querySelector('[data-structure="monolith"]')).toBeInTheDocument();
});
it('keeps the Exiles armed orbital identity in the build picker', () => {
  const {view, sector} = fixture(true);
  render(<BuildPlanner view={view} sectorId={sector.id} disabled={false} onClose={()=>{}} onSubmit={()=>{}}/>);
  const card = screen.getByRole('article', {name:'Orbital'});
  expect(within(card).getByRole('img', {name:'Orbital blueprint silhouette'})).toBeInTheDocument();
  expect(card.querySelector('[data-structure="orbital"]')).toBeNull();
});
it('uses the same three pieces on the galaxy and preserves their rule labels and draft selection', () => {
  const {view, sector} = fixture();
  sector.portalVp=2; sector.orbital=true; sector.monolith=true;
  const {container} = render(<GalaxyBoard view={view} candidates={[]} selected={sector.id} onSelect={()=>{}} onExplore={()=>{}} plannedBuilds={[{id:'monolith-draft', component:'monolith', sectorId:sector.id}]} />);
  const tile = container.querySelector(`[data-galaxy-target="sector:${sector.id}"]`)!;
  expect(tile.querySelector('[data-structure="warp-portal"]')).not.toBeNull();
  expect(tile.querySelector('[data-structure="orbital"]')).not.toBeNull();
  expect(tile.querySelector('[data-structure="monolith"]')).not.toBeNull();
  expect(screen.getByRole('img', {name:'Warp portal: connects to every other warp portal'})).toHaveTextContent('regardless of distance');
  expect(screen.getByRole('img', {name:'Monolith: 3 victory points'})).toBeInTheDocument();
  const draft = screen.getByRole('button', {name:`Relocate planned monolith 1 in sector ${sector.tileId}`});
  expect(draft.querySelector('[data-structure="monolith"]')).not.toBeNull();
});

it('shows Lyra shrine pieces and their count without changing their scoring explanation', () => {
  const {view, sector} = fixture();
  view.seats[0].faction='lyra';
  view.seats[0].shrines=[{sectorId:sector.id,planetIndex:0,row:'money',column:0},{sectorId:sector.id,planetIndex:1,row:'science',column:0}];
  render(<GalaxyBoard view={view} candidates={[]} selected={sector.id} onSelect={()=>{}} onExplore={()=>{}}/>);
  const marker=screen.getByRole('img', {name:'2 Lyra Shrines'});
  expect(marker.querySelector('[data-structure="shrine"]')).not.toBeNull();
  expect(marker).toHaveTextContent('1 VP each while Lyra controls this sector');
  expect(marker.querySelector('text')).toHaveTextContent('×2');
});
