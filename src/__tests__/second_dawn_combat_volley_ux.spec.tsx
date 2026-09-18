// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DecisionPanel from "../second-dawn-game/DecisionPanel";

afterEach(cleanup);

it("keeps one tactile die tray and assigns a selected die to a target", () => {
  const submit = vi.fn();
  render(<DecisionPanel decision={{id:"volley",owner:"a",kind:"combat-allocation",battleId:"b",dice:[
    {id:"d1",face:5,damage:1,computer:1,weaponKind:"cannon",weaponColor:"yellow",sourceShipType:"interceptor",targets:["t1","t2"],hitTargets:["t1"]},
    {id:"d2",face:6,damage:2,computer:0,weaponKind:"missile",weaponColor:"orange",sourceShipType:"cruiser",targets:["t1","t2"],hitTargets:["t1","t2"]},
  ]}} reputation={[]} disabled={false} onSubmit={submit}/>);
  expect(screen.getByRole("group", {name:"Rolled attack dice"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:/Die 1.*roll 5.*yellow cannon/i}));
  fireEvent.click(screen.getByRole("button", {name:/Target t2.*miss/i}));
  expect(screen.getByText(/5 \+ 1.*shield.*misses/i)).toBeTruthy();
  expect(screen.getByRole("button", {name:/Remove die 1 from t2/i})).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:/Die 2.*roll 6/i}));
  fireEvent.click(screen.getByRole("button", {name:/Target t1.*hit/i}));
  fireEvent.click(screen.getByRole("button", {name:"Resolve volley"}));
  expect(submit).toHaveBeenCalledWith({type:"resolve",decisionId:"volley",choice:{kind:"combat-allocation",allocations:[{dieId:"d1",targetId:"t2"},{dieId:"d2",targetId:"t1"}]}});
});

it("labels old decisions without provenance honestly", () => {
  render(<DecisionPanel decision={{id:"old",owner:"a",kind:"combat-allocation",battleId:"b",dice:[{id:"d",face:6,damage:1,targets:["t"],hitTargets:["t"]}]}} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
  expect(screen.getByText("Unknown weapon")).toBeTruthy();
});

it("counts natural-six legacy and split assignments in cumulative target previews",()=>{render(<DecisionPanel decision={{id:'mixed',owner:'a',kind:'combat-allocation',battleId:'b',dice:[{id:'normal',face:6,damage:2,targets:['t']},{id:'split',face:6,damage:4,targets:['t'],hitTargets:['t'],split:true}]}} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:/Die 1.*roll 6/}));fireEvent.click(screen.getByRole('button',{name:/Target t/}));expect(screen.getByText('2 assigned')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/Die 2.*roll 6/}));fireEvent.click(screen.getByRole('button',{name:'Increase damage from die 2 to t'}));expect(screen.getByText('3 assigned')).toBeTruthy();});

it("marks indeterminate legacy hit damage as uncertain instead of a false zero",()=>{render(<DecisionPanel decision={{id:'unknown',owner:'a',kind:'combat-allocation',battleId:'b',dice:[{id:'d',face:4,damage:2,targets:['t']}]}} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:/Target t/}));expect(screen.getByText(/\+2 uncertain/)).toBeTruthy();expect(screen.getByText(/legacy hit preview is unknown/)).toBeTruthy();});
