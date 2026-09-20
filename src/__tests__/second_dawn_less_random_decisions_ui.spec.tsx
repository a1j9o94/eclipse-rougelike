import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
import type { PendingDecision } from "../../shared/eclipse/types";
import DecisionPanel from "../second-dawn-game/DecisionPanel";

afterEach(cleanup);
function view(){
 const state=createGame({seed:7,warpPortals:false,rulesMode:"less-random-v1",seats:[{id:"a",faction:"hydran",controller:"human"},{id:"b",faction:"planta",controller:"human"}]});
 state.pendingDecision=null;state.engine!.decisions=[];
 return getPlayerView(state,"a")!;
}

describe("Less Random decision controls",()=>{
 it("shows the whole colored roll beside the exact Super Joker table result",()=>{
  const decision:PendingDecision={id:"joker",owner:"a",kind:"super-joker",battleId:"battle",remaining:5,dice:[
   {id:"yellow",face:6,damage:1,computer:0,weaponColor:"yellow",weaponKind:"cannon"},
   {id:"red",face:1,damage:4,computer:0,weaponColor:"red",weaponKind:"cannon"},
  ]};
  const submit=vi.fn();render(<DecisionPanel decision={decision} view={view()} reputation={[]} disabled={false} onSubmit={submit}/>);
  expect(screen.getByRole("group",{name:"Current volley"})).toHaveTextContent("yellow · 1 damage");
  const table=screen.getByRole("group",{name:"Super Joker table result"});
  expect(table).toHaveAccessibleName("Super Joker table result");
  expect(screen.getByLabelText("yellow die 1: face 3, 1 damage")).toBeVisible();
  expect(screen.getByLabelText("red die 2: face 4, 4 damage")).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Use shown table result"}));
  expect(submit).toHaveBeenCalledWith({type:"resolve",decisionId:"joker",choice:{kind:"super-joker",action:"table"}});
 });

 it("allows only supply- and track-valid reputation steps and supports undo",()=>{
  const current=view();current.lessRandom!.reputationSupply=[2];current.lessRandom!.reputationBySeat.a=[1];
  const decision:PendingDecision={id:"rep-one",owner:"a",kind:"less-random-reputation",draws:2,capacity:2};
  render(<DecisionPanel decision={decision} view={current} reputation={[1]} disabled={false} onSubmit={vi.fn()}/>);
  expect(screen.getByRole("button",{name:"Confirm reputation"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"Add 1 VP · 1 draw"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"Upgrade 1→2 · 1"})).toBeEnabled();
  expect(screen.getByRole("button",{name:"Upgrade 2→3 · 2"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Upgrade 1→2 · 1"}));
  expect(screen.getByLabelText("Reputation draft")).toHaveTextContent("Track: 2");
  expect(screen.getByRole("button",{name:"Confirm reputation"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Add 1 VP · 1 draw"}));
  expect(screen.getByRole("button",{name:"Confirm reputation"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:"Undo last reputation step"}));
  expect(screen.getByRole("button",{name:"Upgrade 1→2 · 1"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Undo last reputation step"}));
  expect(screen.getByLabelText("Reputation draft")).toHaveTextContent("Track: 1");
  fireEvent.click(screen.getByRole("button",{name:"Upgrade 1→2 · 1"}));
  fireEvent.click(screen.getByRole("button",{name:"Reset reputation draft"}));
  expect(screen.getByLabelText("Reputation draft")).toHaveTextContent("Track: 1");
 });

 it("clears the local reputation draft when the authoritative decision changes",()=>{
  const current=view();current.lessRandom!.reputationSupply=[1,1];
  const first:PendingDecision={id:"rep-one",owner:"a",kind:"less-random-reputation",draws:2,capacity:2};
  const ui=render(<DecisionPanel decision={first} view={current} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button",{name:"Add 1 VP · 1 draw"}));
  expect(screen.getByText("1 draws left. Add a 1 VP tile, or spend draws to upgrade a tile.")).toBeVisible();
  ui.rerender(<DecisionPanel decision={{...first,id:"rep-two",owner:"b"}} view={current} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
  expect(screen.getByText("2 draws left. Add a 1 VP tile, or spend draws to upgrade a tile.")).toBeVisible();
  expect(screen.getByRole("button",{name:"Undo last reputation step"})).toBeDisabled();
 });
});
