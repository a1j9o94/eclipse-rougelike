import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { addBuildItem, analyzeBuildOrder, emptyBuildOrder, placeBuildItem } from '../second-dawn-game/buildPlanning';

function fixture() {
  const state = createGame({ seed: 42, seats: [{ id: 'a', faction: 'terran-directorate', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  state.activeSeatId = 'a';
  const first = state.sectors.find(sector => sector.owner === 'a')!;
  state.sectors.push({ ...first, id: 'second-yard', tileId: '305', position: { q: first.position.q + 2, r: first.position.r }, population: [] });
  return { view: getPlayerView(state, 'a')!, first: first.id, second: 'second-yard' };
}

describe('build order planning', () => {
  it('keeps order pieces while they are independently placed and relocated', () => {
    const f = fixture();
    let draft = addBuildItem(emptyBuildOrder(), 'interceptor');
    draft = addBuildItem(draft, 'cruiser');
    draft = placeBuildItem(draft, draft.items[0].id, f.first);
    draft = placeBuildItem(draft, draft.items[1].id, f.second);
    expect(analyzeBuildOrder(f.view, draft).command.builds).toEqual([
      { component: 'interceptor', sectorId: f.first },
      { component: 'cruiser', sectorId: f.second },
    ]);
    draft = placeBuildItem(draft, draft.items[0].id, f.second);
    expect(draft.items.map(item => item.component)).toEqual(['interceptor', 'cruiser']);
    expect(analyzeBuildOrder(f.view, draft).command.builds[0].sectorId).toBe(f.second);
  });

  it('reports explicit unplaced pieces and aggregate structure conflicts', () => {
    const f = fixture();
    let draft = addBuildItem(emptyBuildOrder(), 'orbital');
    draft = addBuildItem(draft, 'orbital');
    draft = placeBuildItem(draft, draft.items[0].id, f.first);
    let analysis = analyzeBuildOrder(f.view, draft);
    expect(analysis.unplacedCount).toBe(1);
    expect(analysis.issues).toContain('Place 1 remaining piece.');
    expect(analysis.legalSectorIdsByItem[draft.items[1].id]).not.toContain(f.first);
    draft = placeBuildItem(draft, draft.items[1].id, f.first);
    analysis = analyzeBuildOrder(f.view, draft);
    expect(analysis.issues).toContain('orbital cannot be built in that sector.');
  });
});
