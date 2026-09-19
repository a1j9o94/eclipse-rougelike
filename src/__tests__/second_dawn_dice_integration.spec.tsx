// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { GameEvent, PendingDecision } from '../../shared/eclipse/types';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import DecisionPanel from '../second-dawn-game/DecisionPanel';
import { CombatPlayback } from '../second-dawn-game/BattleOverview';
import { CombatVolleyResult } from '../second-dawn-game/CombatDecisionVisuals';

const preference = vi.hoisted(() => ({ enabled: true }));
vi.mock('../second-dawn-game/presentationSettings', () => ({ useDice3dEnabled: () => [preference.enabled, vi.fn()] }));
vi.mock('../second-dawn-game/DiceRoll3D', () => ({ default: ({ rolls, rollId, enabled, skipped, children, onComplete }: { rolls: readonly { id: string; face: number; color: string }[]; rollId: string; enabled: boolean; skipped?: boolean; children?: ReactNode; onComplete?: () => void }) => <div data-testid="dice-presentation" data-roll-id={rollId} data-enabled={String(enabled)} data-skipped={String(skipped)} data-rolls={JSON.stringify(rolls)}>{children}{onComplete&&<button onClick={onComplete}>Finish test throw</button>}</div> }));

const decision: Extract<PendingDecision, { kind: 'combat-allocation' }> = {
  id: 'saved-roll', owner: 'a', kind: 'combat-allocation', battleId: 'battle',
  dice: [{ id: 'die-12', face: 6, damage: 2, computer: 0, weaponKind: 'cannon', weaponColor: 'orange', targets: ['target'], hitTargets: ['target'] }],
};
const volley: NonNullable<GameEvent['combatVolley']> = {
  battleId: 'battle', attacker: 'computer', dice: [{ id: 'die-13', face: 1, damage: 4, computer: 0, weaponKind: 'cannon', weaponColor: 'red' }], impacts: [], targets: [],
};
afterEach(cleanup);
beforeEach(() => { preference.enabled = true; });

it('presents saved human faces and keeps target allocation usable without waiting for animation', () => {
  const submit = vi.fn();
  const { rerender } = render(<DecisionPanel decision={decision} reputation={[]} disabled={false} onSubmit={submit} />);
  const presentation = screen.getByTestId('dice-presentation');
  expect(presentation).toHaveAttribute('data-enabled', 'true');
  expect(JSON.parse(presentation.dataset.rolls!)).toEqual([{ id: 'die-12', face: 6, color: 'orange' }]);
  const rollId = presentation.dataset.rollId;
  fireEvent.click(screen.getByRole('button', { name: /Target target/ }));
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-roll-id', rollId);
  fireEvent.click(screen.getByRole('button', { name: 'Resolve volley' }));
  expect(submit).toHaveBeenCalledExactlyOnceWith({ type: 'resolve', decisionId: 'saved-roll', choice: { kind: 'combat-allocation', allocations: [{ dieId: 'die-12', targetId: 'target' }] } });
  rerender(<DecisionPanel decision={{ ...decision, dice: decision.dice.map(die => ({ ...die })) }} reputation={[]} disabled={false} onSubmit={submit} />);
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-roll-id', rollId);
});

it('honors the optional dice preference and the board motion setting for human rolls', () => {
  preference.enabled = false;
  const { rerender } = render(<DecisionPanel decision={decision} reputation={[]} disabled={false} onSubmit={vi.fn()} />);
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-enabled', 'false');
  expect(screen.getByRole('button', { name: /Die 1, roll 6/ })).toBeEnabled();
  preference.enabled = true;
  rerender(<DecisionPanel decision={decision} reputation={[]} disabled={false} motionEnabled={false} onSubmit={vi.fn()} />);
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-enabled', 'false');
});

it('shows AI public faces and skip stops the throw without hiding damage results', () => {
  render(<CombatPlayback volleys={[volley]} />);
  const presentation = screen.getByTestId('dice-presentation');
  expect(presentation).toHaveAttribute('data-enabled', 'true');
  expect(JSON.parse(presentation.dataset.rolls!)).toEqual([{ id: 'die-13', face: 1, color: 'red' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Skip volley animation' }));
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-enabled', 'false');
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-skipped','true');
  expect(screen.getByLabelText('Roll 1, 4 damage')).toBeVisible();
});

it('keeps historical volleys static instead of throwing again when browsing the log', () => {
  render(<CombatVolleyResult volley={volley} />);
  expect(screen.queryByTestId('dice-presentation')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Roll 1, 4 damage')).toBeVisible();
});

it('animates opponents public volleys while keeping your already allocated roll static', () => {
  const view = getPlayerView(createGame({ seed: 3, warpPortals: false, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'computer', faction: 'planta', controller: 'ai' }] }), 'a')!;
  const ownVolley = { ...volley, attacker: 'a', dice: [{ ...volley.dice[0], id: 'own-die' }] };
  const { rerender } = render(<CombatPlayback view={view} volleys={[ownVolley, volley]} />);
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-enabled', 'true');
  expect(JSON.parse(screen.getByTestId('dice-presentation').dataset.rolls!)).toEqual([{ id: 'die-13', face: 1, color: 'red' }]);
  preference.enabled = false;
  rerender(<CombatPlayback view={view} volleys={[ownVolley, volley]} />);
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-enabled', 'false');
  preference.enabled = true;
  rerender(<CombatPlayback view={view} volleys={[ownVolley]} />);
  expect(screen.getByTestId('dice-presentation')).toHaveAttribute('data-enabled', 'false');
});


it('starts the visible impact sequence after opponent dice settle without blocking result inspection', () => {
  render(<CombatPlayback volleys={[{...volley,targets:[{id:'victim',hpBefore:2,hpAfter:0,destroyed:true,excess:0}]}]} />);
  const scene=screen.getByRole('group',{name:'Volley firing and impacts'});
  expect(scene).toHaveClass('is-awaiting-dice');
  expect(scene).toHaveTextContent('Destroyed');
  fireEvent.click(screen.getByRole('button',{name:'Finish test throw'}));
  expect(scene).not.toHaveClass('is-awaiting-dice');
});
