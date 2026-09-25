import {sectorDefinition} from './sectors';
import type {GameState,SectorDrawOdds} from './types';

type Ring='inner'|'middle'|'outer';
const rings:readonly Ring[]=['inner','middle','outer'];

/** Aggregate prevalence in the pile used by the next draw, never its order or tile IDs. */
export function sectorDrawOdds(state:GameState):Record<Ring,SectorDrawOdds>{
 return Object.fromEntries(rings.map(ring=>{
  const draw=state.supplies[ring];
  const discard=state.engine?.discardedSectors[ring]??[];
  const ids=draw.length?draw:discard;
  const tiles=ids.map(id=>sectorDefinition(Number(id)));
  const count=(predicate:(tile:NonNullable<typeof tiles[number]>)=>boolean)=>tiles.filter(tile=>tile!==undefined&&predicate(tile)).length;
  return [ring,{
   source:draw.length?'draw':discard.length?'reshuffle':'exhausted',
   total:ids.length,
   science:count(tile=>tile.population.some(square=>square.resource==='science'||square.resource==='gray')),
   money:count(tile=>tile.population.some(square=>square.resource==='money'||square.resource==='gray')),
   materials:count(tile=>tile.population.some(square=>square.resource==='materials'||square.resource==='gray')),
   ancients:count(tile=>tile.ancients>0),
   artifacts:count(tile=>tile.artifacts>0),
  } satisfies SectorDrawOdds];
 })) as Record<Ring,SectorDrawOdds>;
}
