// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import ShipPartStats from '../second-dawn-game/ShipPartStats';
afterEach(cleanup);
it('makes Gluon Computer bonuses readable visually and accessible by part name', () => {
 render(<ShipPartStats partId="gluon-computer"/>);
 const stats = screen.getByRole('group', {name:'Gluon Computer statistics'});
 expect(within(stats).getByText('+3')).toBeTruthy();
 expect(within(stats).getByText('−2')).toBeTruthy();
 expect(within(stats).getByLabelText(/computer: \+3.*attack rolls/)).toBeTruthy();
});
it('distinguishes missile timing and shield reduction in accessible descriptions', () => {
 render(<><ShipPartStats partId="plasma-missile"/><ShipPartStats partId="phase-shield"/></>);
 expect(screen.getByLabelText(/once at the start of battle/)).toBeTruthy();
 expect(screen.getByLabelText(/shield: −2.*enemy attack rolls/)).toBeTruthy();
});
