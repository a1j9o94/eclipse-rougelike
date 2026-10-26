import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const controls = {candidates: [], connected: true, busy: false, status: '', onSubmit: vi.fn(), onMenu: vi.fn()};
function fixture() {
  return createGame({seed: 6, warpPortals: false, seats: [
    {id: 'a', faction: 'hydran', controller: 'human'},
    {id: 'b', faction: 'eridani', controller: 'ai'},
    {id: 'c', faction: 'planta', controller: 'ai'},
    {id: 'd', faction: 'orion', controller: 'ai'},
  ]});
}
function strip() { return within(screen.getByRole('navigation', {name: 'Turn order'})); }
function names() { return strip().getAllByRole('button').map(button => button.querySelector('strong')!.textContent); }

it('shows turn order before opening table details and allows faction inspection', () => {
  const state = fixture(); state.activeSeatId = 'c';
  render(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  expect(names()).toEqual(['Planta', 'Orion Hegemony', 'Hydran Progress', 'Eridani Empire']);
  expect(strip().getByRole('button', {name: /Planta/})).toHaveAttribute('aria-current', 'step');
  expect(screen.queryByRole('region', {name: 'Civilization roster'})).toBeNull();
  fireEvent.click(strip().getByRole('button', {name: /Hydran Progress/}));
  expect(screen.getByRole('heading', {name: 'Hydran Progress', exact: true})).toBeVisible();
});

it('updates active turns without changing faction colors and retains passed reaction turns', () => {
  const state = fixture(); state.activeSeatId = 'c'; state.seats[0].passed = true; state.seats[3].eliminated = true;
  const ui = render(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  expect(names()).toEqual(['Planta', 'Hydran Progress', 'Eridani Empire', 'Orion Hegemony']);
  const own = strip().getByRole('button', {name: /Hydran Progress/});
  const color = own.style.getPropertyValue('--owner');
  expect(own).toHaveTextContent('Passed');
  expect(strip().getByRole('button', {name: /Orion Hegemony/})).toHaveTextContent('Out');
  const list = strip().getByRole('list');
  list.scrollLeft = 200;
  state.revision++;
  ui.rerender(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  expect(list.scrollLeft).toBe(200);
  state.activeSeatId = 'a'; state.revision++;
  ui.rerender(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  const reacting = strip().getByRole('button', {name: /Hydran Progress/});
  expect(reacting).toHaveAttribute('aria-current', 'step');
  expect(reacting).toHaveTextContent('Passed');
  expect(reacting.style.getPropertyValue('--owner')).toBe(color);
  expect(names()[0]).toBe('Hydran Progress');
  expect(list.scrollLeft).toBe(0);
});

it('respects authoritative pass-order turns rather than the physical seating order', () => {
  const state = fixture(); state.activeSeatId = 'c'; state.turnOrder = ['a', 'd', 'c', 'b'];
  render(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  expect(names()).toEqual(['Planta', 'Eridani Empire', 'Hydran Progress', 'Orion Hegemony']);
});

it('shows seat order without a false active action during combat', () => {
  const state = fixture(); state.phase = 'combat'; state.startSeatId = 'c'; state.activeSeatId = 'b';
  render(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  const seats = within(screen.getByRole('navigation', {name: 'Seat order'})).getAllByRole('button');
  expect(seats.map(button => button.querySelector('strong')!.textContent)).toEqual(['Planta', 'Orion Hegemony', 'Hydran Progress', 'Eridani Empire']);
  expect(seats.every(button => !button.hasAttribute('aria-current'))).toBe(true);
});

it('shows each civilization’s upkeep readiness without inventing a sequential action turn', () => {
  const state = fixture(); state.phase = 'upkeep'; state.engine!.upkeepDone = ['a']; state.activeSeatId = 'b';
  render(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  const seats = within(screen.getByRole('navigation', {name: 'Seat order'}));
  expect(seats.getByRole('button', {name: /Hydran Progress/})).toHaveTextContent('Ready');
  expect(seats.getByRole('button', {name: /Eridani Empire/})).toHaveTextContent('Upkeep');
  expect(seats.getAllByRole('button').every(button => !button.hasAttribute('aria-current'))).toBe(true);
});

it('keeps the same turn strip visible on phones without opening the tools menu', () => {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({matches: query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn()})));
  const state = fixture(); state.activeSeatId = 'a';
  render(<SecondDawnBoard {...controls} view={getPlayerView(state, 'a')!}/>);
  expect(screen.getByRole('navigation', {name: 'Mobile game navigation'})).toBeVisible();
  expect(screen.getByRole('navigation', {name: 'Turn order'})).toBeVisible();
  expect(strip().getAllByRole('button')).toHaveLength(4);
  expect(strip().getByRole('button', {name: /Hydran Progress/})).toHaveAttribute('aria-current', 'step');
});
