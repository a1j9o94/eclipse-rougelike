import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { GameEvent } from '../../shared/eclipse/types';
import { CombatPlayback } from '../second-dawn-game/BattleOverview';
import CombatTurnDecision from '../second-dawn-game/CombatTurnDecision';

const volley: NonNullable<GameEvent['combatVolley']> = {
  battleId: 'b', sectorId: 's', attacker: 'a',
  dice: [
    { id: 'hit', face: 6, damage: 2, computer: 1, sourceShipId: 'cruiser-1', sourceShipType: 'cruiser', weaponKind: 'cannon', weaponColor: 'orange' },
    { id: 'miss', face: 1, damage: 1, computer: 1, sourceShipId: 'interceptor-1', sourceShipType: 'interceptor', weaponKind: 'cannon', weaponColor: 'yellow' },
  ],
  impacts: [{ dieId: 'hit', targetId: 'ancient-1', hit: true, damage: 2 }, { dieId: 'miss', targetId: 'guardian-1', hit: false, damage: 0 }],
  targets: [
    { id: 'ancient-1', shipType: 'ancient', owner: 'ancient', hpBefore: 2, hpAfter: 0, excess: 0, destroyed: true },
    { id: 'guardian-1', shipType: 'guardian', owner: 'guardian', hpBefore: 3, hpAfter: 3, excess: 0, destroyed: false },
  ],
};

it('shows which ship classes fired and the real hit or miss at each target', () => {
  render(<CombatPlayback volleys={[volley]} />);
  const scene = screen.getByRole('group', { name: 'Volley firing and impacts' });
  expect(within(scene).getByRole('img', { name: 'Cruiser blueprint silhouette' })).toBeInTheDocument();
  expect(within(scene).getByRole('img', { name: 'Interceptor blueprint silhouette' })).toBeInTheDocument();
  expect(within(scene).getByLabelText('Ancient: 1 hit, 0 misses, destroyed')).toHaveClass('is-destroyed');
  expect(within(scene).getByLabelText('Guardian: 0 hits, 1 miss, no damage')).toHaveClass('is-unharmed');
  expect(scene.querySelectorAll('[data-weapon-color="orange"]')).toHaveLength(1);
  expect(scene.querySelectorAll('[data-hit="false"]')).toHaveLength(1);
});

it('keeps destruction legible with motion disabled and adds no motion after skip', () => {
  render(<CombatPlayback volleys={[volley]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Skip volley animation' }));
  expect(screen.getByRole('group', { name: 'Volley firing and impacts' })).toHaveClass('is-still');
  expect(screen.getByLabelText('Ancient: 1 hit, 0 misses, destroyed')).toHaveTextContent('Destroyed');
});

it('does not invent ship class, damage, or weapon colors when old events lack provenance', () => {
  const legacy = { ...volley, dice: [{ id: 'hit', face: 6, damage: 2, computer: 0 }], impacts: [volley.impacts[0]], targets: [{ id: 'old', hpBefore: 2, hpAfter: 1, destroyed: false, excess: 0 }] };
  render(<CombatPlayback volleys={[legacy]} />);
  const scene = screen.getByRole('group', { name: 'Volley firing and impacts' });
  expect(within(scene).getByText('Firing fleet')).toBeInTheDocument();
  expect(within(scene).queryByRole('img', { name: /blueprint silhouette/ })).toBeNull();
  expect(scene.querySelector('[data-weapon-color]')).toBeNull();
  expect(within(scene).getByText('Damaged')).toBeInTheDocument();
});

it('keeps a human firing group idle until the player rolls and disables blocked submissions', () => {
  const submit = vi.fn();
  const decision = { id: 'turn', owner: 'a', kind: 'combat-turn' as const, battleId: 'b', shipType: 'cruiser' as const, destinationIds: [] };
  const { rerender } = render(<CombatTurnDecision decision={decision} disabled={false} onSubmit={submit} />);
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
  expect(submit).toHaveBeenCalledExactlyOnceWith({ type: 'resolve', decisionId: 'turn', choice: { kind: 'combat-turn', retreatTo: null } });
  rerender(<CombatTurnDecision decision={decision} disabled onSubmit={submit} />);
  expect(screen.getByRole('button', { name: 'Roll dice' })).toBeDisabled();
  expect(screen.getByText('Roll when you are ready, or declare a retreat.')).toBeInTheDocument();
});
