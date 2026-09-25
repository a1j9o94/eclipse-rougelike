// @vitest-environment jsdom
import {fireEvent,render,screen} from '@testing-library/react';
import {describe,expect,it,vi} from 'vitest';
import FactionPicker from '../second-dawn-game/FactionPicker';
import FactionSymbol from '../second-dawn-game/FactionSymbol';
import {factionPresentation} from '../second-dawn-game/factionPresentation';
import {seatColor} from '../second-dawn-game/factionColors';

describe('expanded faction choice',()=>{
 it('offers the four new civilizations independently from occupied piece colors',()=>{
  const choose=vi.fn();
  render(<FactionPicker selected="hydran" onSelect={choose} profile="expanded-v1" unavailableColors={{blue:'Taken'}}/>);
  const option=screen.getByRole('button',{name:/Wardens of Magellan/});
  expect(option).toBeEnabled();fireEvent.click(option);expect(choose).toHaveBeenCalledWith('magellan');
  expect(screen.getByRole('button',{name:/Rho Indi Syndicate/})).toBeVisible();
  expect(screen.getByRole('button',{name:/Legion of Midas/})).toBeVisible();
  expect(screen.getByRole('button',{name:/Heralds of Ragnarok/})).toBeVisible();
 });
 it('shows reserved factions and independent, labeled piece colors',()=>{
  const change=vi.fn();
  render(<FactionPicker selected="magellan" onSelect={()=>{}} profile="expanded-v1" unavailableFactions={{midas:'Chosen by Ada'}} pieceColor="red" onPieceColorChange={change} unavailableColors={{blue:'Taken by Ben'}}/>);
  expect(screen.getByRole('button',{name:/Legion of Midas.*Chosen by Ada/})).toBeDisabled();
  expect(screen.getByRole('button',{name:/Blue pieces.*Taken by Ben/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Green pieces'}));expect(change).toHaveBeenCalledWith('green');
  expect(screen.getByText(/unused colony ships/i)).toBeVisible();
 });
 it('does not show expanded factions when choosing a legacy base board',()=>{
  render(<FactionPicker selected="hydran" onSelect={()=>{}} profile="base"/>);
  expect(screen.queryByRole('button',{name:/Wardens of Magellan/})).toBeNull();
  expect(screen.getByRole('region',{name:'Blue civilization board'})).toBeVisible();
 });
 it('offers Exiles and Lyra in the new collection without changing the old collection',()=>{
  const {unmount}=render(<FactionPicker selected="hydran" onSelect={()=>{}} profile="expanded-v1"/>);
  expect(screen.queryByRole('button',{name:/Exiles/i})).toBeNull();
  expect(screen.queryByRole('button',{name:/Lyra/i})).toBeNull();
  unmount();
  render(<FactionPicker selected="hydran" onSelect={()=>{}} profile="expanded-v2"/>);
  expect(screen.getByRole('button',{name:/Exiles/i})).toBeVisible();
  expect(screen.getByRole('button',{name:/Lyra/i})).toBeVisible();
 });
 it('keeps each expanded emblem distinct and explains the mixed action',()=>{
  const paths=['rho-indi','magellan','midas','ragnarok'].map(id=>{const{container,unmount}=render(<FactionSymbol faction={id as 'magellan'}/>);const d=container.querySelector('path')?.getAttribute('d');unmount();return d;});
  expect(new Set(paths).size).toBe(4);
  expect(factionPresentation('ragnarok').benefits.map(b=>b.detail).join(' ')).toMatch(/Build.*Move|Move.*Build/);
 });
 it('uses assigned pieces and preserves old save color fallback',()=>{
  expect(seatColor({faction:'hydran',pieceColor:'red'})).toBe('#e99b9b');
  expect(seatColor({faction:'hydran'})).toBe('#88cde7');
 });
});
