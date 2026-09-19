import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ShipSilhouette from '../second-dawn-game/ShipSilhouette';
import { NeutralShipSilhouette } from '../second-dawn-game/BattleOverview';
import { AtlasArtContext } from '../second-dawn-game/atlasArtContext';

afterEach(cleanup);
describe('isolated atlas presentation', () => {
  it('preserves the production silhouette outside the review theme', () => {
    const {container}=render(<ShipSilhouette type="cruiser" faction="planta"/>);
    expect(screen.getByRole('img',{name:'Cruiser blueprint silhouette'})).toBeTruthy();
    expect(container.querySelector('[data-atlas-figurine]')).toBeNull();
  });
  it('uses a class-specific figurine without losing the accessible ship identity', () => {
    const {container}=render(<AtlasArtContext.Provider value={true}><ShipSilhouette type="cruiser" faction="planta"/></AtlasArtContext.Provider>);
    expect(screen.getByRole('img',{name:'Cruiser blueprint silhouette'})).toBeTruthy();
    expect(container.querySelector('[data-atlas-figurine="cruiser"] [data-atlas-art="figurine"]')).toBeTruthy();
  });
  it('keeps Ancient and Guardian identities while using carved figurines', () => {
    const {container}=render(<AtlasArtContext.Provider value={true}><NeutralShipSilhouette type="ancient"/><NeutralShipSilhouette type="guardian"/></AtlasArtContext.Provider>);
    expect(screen.getByRole('img',{name:'Ancient ship silhouette'})).toBeTruthy();
    expect(screen.getByRole('img',{name:'Guardian ship silhouette'})).toBeTruthy();
    expect(container.querySelectorAll('[data-atlas-figurine]')).toHaveLength(2);
  });
});
