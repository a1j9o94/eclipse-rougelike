import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import EclipseDieFace from '../second-dawn-game/EclipseDieFace';
import {eclipseDieFace} from '../second-dawn-game/dice3d/faces';

afterEach(cleanup);

it('uses blank misses, numbered middle faces, and damage bursts on standard Eclipse dice', () => {
  for (const [color, damage] of [['yellow',1],['orange',2],['blue',3],['red',4]] as const) {
    expect(eclipseDieFace(color,1).marks).toEqual([]);
    for (const face of [2,3,4,5]) expect(eclipseDieFace(color,face).number).toBe(face);
    expect(eclipseDieFace(color,6).marks).toHaveLength(damage);
    expect(eclipseDieFace(color,6).marks.every(mark => mark.kind==='hit')).toBe(true);
    expect(eclipseDieFace(color,6).number).toBeUndefined();
  }
});

it('matches all six magenta faces including hollow backfire symbols', () => {
  expect([1,2,3,4,5,6].map(face => eclipseDieFace('magenta',face).marks.map(mark=>mark.kind))).toEqual([
    [],[],['hit'],['hit','hit'],['hit','hit','hit','backfire'],['backfire'],
  ]);
  expect(eclipseDieFace('magenta',6).label).toContain('1 self-damage');
  expect(eclipseDieFace('magenta',6).label).not.toContain('always hits');
});

it('renders symbols instead of numeric rift values and gives accessible outcomes', () => {
  const {container}=render(<><EclipseDieFace color="magenta" face={5}/><EclipseDieFace color="yellow" face={1}/></>);
  expect(screen.getByRole('img',{name:/3 damage.*1 self-damage/})).toBeInTheDocument();
  expect(screen.getByRole('img',{name:/blank.*miss/i})).toBeInTheDocument();
  expect(container.querySelectorAll('[data-mark="hit"]')).toHaveLength(3);
  expect(container.querySelectorAll('[data-mark="backfire"]')).toHaveLength(1);
  expect(container.querySelector('text')).toBeNull();
});
