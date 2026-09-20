import { describe, expect, it } from "vitest";
import { chooseAiCommand } from "../../shared/eclipse/ai";
import { chooseStrategicAiCommand } from "../../shared/eclipse/aiSearch";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { createGame } from "../../shared/eclipse/setup";
import { randomSeed } from "../../shared/eclipse/random";

describe("bounded Less Random AI matches", () => {
  it.each([2,3,4,5,6])("finishes a supported %i-seat match without a decision deadlock", (count) => {
    const factions = BASE_FACTIONS.filter(faction => faction.species === "alien").slice(0, count);
    let state = createGame({
      seed: 800 + count,
      warpPortals: false,
      rulesMode: "less-random-v1",
      seats: factions.map((faction, index) => ({id:`ai-${index}`,faction:faction.id,controller:"ai" as const})),
    });
    const seenDecisions = new Set<string>();
    let steps = 0;
    while (state.phase !== "finished" && steps < 10_000) {
      const actor = state.pendingDecision?.owner ?? state.activeSeatId;
      expect(actor, `missing actor at step ${steps}`).not.toBeNull();
      const view = getPlayerView(state, actor!);
      expect(view, `missing view for ${actor}`).not.toBeNull();
      const choice = chooseAiCommand(view!, 90_000 + count * 10_000 + steps);
      expect(choice, `no AI choice at step ${steps}; decision=${state.pendingDecision?.kind ?? "none"}`).not.toBeNull();
      if (state.pendingDecision) seenDecisions.add(state.pendingDecision.kind);
      const result = processGameCommand(state, actor!, choice!.command);
      expect(result.ok, result.ok ? "" : `${choice!.label}: ${result.error.message}`).toBe(true);
      if (!result.ok) break;
      state = result.state;
      steps++;
    }
    expect(state.phase, `stopped after ${steps} steps at ${state.pendingDecision?.kind ?? state.activeSeatId}`).toBe("finished");
    expect(state.engine?.scores).toHaveLength(count);
    expect(state.round).toBe(10);
    expect(state.sectors.length).toBeGreaterThan(count);
    expect(seenDecisions.size).toBeGreaterThan(0);
  }, 30_000);

  it("finishes an expanded match containing Rho Indi, Magellan, Midas, and Ragnarok", () => {
    let state = createGame({seed:1_904,warpPortals:false,rulesMode:"less-random-v1",factionProfile:"expanded-v1",seats:[
      {id:"rho",faction:"rho-indi",pieceColor:"black",controller:"ai"},
      {id:"magellan",faction:"magellan",pieceColor:"blue",controller:"ai"},
      {id:"midas",faction:"midas",pieceColor:"yellow",controller:"ai"},
      {id:"ragnarok",faction:"ragnarok",pieceColor:"red",controller:"ai"},
    ]});
    let steps=0;
    while(state.phase!=="finished"&&steps<10_000){
      const actor=state.pendingDecision?.owner??state.activeSeatId;
      expect(actor).not.toBeNull();
      const choice=chooseAiCommand(getPlayerView(state,actor!)!,190_400+steps);
      expect(choice,`no expanded AI choice at ${state.pendingDecision?.kind??state.phase}`).not.toBeNull();
      const result=processGameCommand(state,actor!,choice!.command);
      expect(result.ok,result.ok?"":result.error.message).toBe(true);
      if(!result.ok)break;
      state=result.state;steps++;
    }
    expect(state.phase,`stopped after ${steps} steps`).toBe("finished");
    expect(state.engine?.scores).toHaveLength(4);
    expect(state.sectors.length).toBeGreaterThan(4);
  },30_000);

  it("keeps Hard shallow search invariant to hidden state in a public Less Random world",()=>{
    const state=createGame({seed:2_222,warpPortals:false,rulesMode:"less-random-v1",seats:[
      {id:"a",faction:"hydran",controller:"ai"},{id:"b",faction:"planta",controller:"ai"},
    ]});
    const other=structuredClone(state);
    state.privateSeats.find(seat=>seat.seatId==="b")!.discoveriesKept=["ancient-cruiser"];
    other.privateSeats.find(seat=>seat.seatId==="b")!.discoveriesKept=["money-cache"];
    other.random=randomSeed(999);
    const options={difficulty:"hard" as const,maxNodes:8,budgetMs:1_000,now:()=>0};
    const firstView=getPlayerView(state,"a")!,secondView=getPlayerView(other,"a")!;
    expect(secondView).toEqual(firstView);
    const first=chooseStrategicAiCommand(firstView,54,options);
    const second=chooseStrategicAiCommand(secondView,54,options);
    expect(second).toEqual(first);
    expect(first?.search.samples).toBe(2);
    expect(first?.search.nodes).toBeGreaterThan(0);
  });
});
