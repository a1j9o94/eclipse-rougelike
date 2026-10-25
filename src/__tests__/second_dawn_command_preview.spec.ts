import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import { describe, it, expect } from "vitest";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
describe("cost and upkeep before confirmation", () => {
  it("shows a shortfall caused by the next action disc before the build is committed", () => {
    const s = createGame({
      seed: 4,
      warpPortals: true,
      seats: [
        { id: "a", faction: "terran-directorate", controller: "human" },
        { id: "b", faction: "hydran", controller: "ai" },
      ],
    });
    s.seats[0].influenceOnTrack = 7;
    s.seats[0].resources.money = 2;
    const before = JSON.stringify(s);
    const preview = previewCommand(getPlayerView(s, "a")!, {
      type: "build",
      builds: [{ sectorId: "221", component: "interceptor" }],
    });
    expect(preview).toMatchObject({
      upkeepBefore: 5,
      upkeepAfter: 7,
      moneyBalanceAfter: -2,
      resourcesAfter: { materials: 1 },
      influenceAfter: 6,
    });
    expect(JSON.stringify(s)).toBe(before);
  });
  it("does not charge a second disc for another activation of an open action", () => {
    const s = createGame({
      seed: 4,
      warpPortals: true,
      seats: [
        { id: "a", faction: "terran-directorate", controller: "human" },
        { id: "b", faction: "hydran", controller: "ai" },
      ],
    });
    s.engine!.action = { owner: "a", action: "build", remaining: 1 };
    const preview = previewCommand(getPlayerView(s, "a")!, {
      type: "build",
      builds: [{ sectorId: "221", component: "interceptor" }],
    });
    expect(preview.influenceAfter).toBe(s.seats[0].influenceOnTrack);
  });
});
it('warns on ending an action in a partner sector, not on passing through',()=>{
 const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.seats[0].ambassadors=['b'];
 const partner=state.sectors.find(sector=>sector.owner==='b')!;
 const destination=state.sectors.find(sector=>sector.owner==='a')!;
 const view=getPlayerView(state,'a')!;
 const through=previewCommand(view,{type:'move',moves:[{shipId:state.ships.find(ship=>ship.owner==='a')!.id,path:[partner.id,destination.id]}]});
 expect(through.betrayedPartners).toEqual([]);
 view.ships.find(ship=>ship.owner==='a')!.sectorId=partner.id;
 const preview=previewCommand(view,{type:'end-action'});
 expect(preview.betrayedPartners).toEqual(['b']);
 expect(preview.populationChoiceMayChangeIncome).toBe(true);
 expect(view.seats[0].traitor).toBe(false);
});
it.each([false,true])('matches the accepted Shrine resource and disc change, continuing=%s',continuing=>{
 const state=createGame({seed:238,seats:[{id:'a',faction:'lyra',controller:'human'},{id:'b',faction:'eridani',controller:'human'}],factionProfile:'expanded-v2'});
 state.activeSeatId='a';state.seats[0].influenceOnTrack=7;
 if(continuing)state.engine!.action={owner:'a',action:'research',remaining:0};
 const home=state.sectors.find(sector=>sector.owner==='a')!;
 const command={type:'place-shrine',sectorId:home.id,planetIndex:1,row:'science',column:0} as const;
 const preview=previewCommand(getPlayerView(state,'a')!,command),result=processGameCommand(state,'a',command);
 expect(result.ok).toBe(true);if(!result.ok)return;
 expect(preview.resourcesAfter).toEqual(result.state.seats[0].resources);expect(preview.influenceAfter).toBe(result.state.seats[0].influenceOnTrack);
});
it('includes the visible influence reward when completing the Materials Shrine row',()=>{
 const state=createGame({seed:238,seats:[{id:'a',faction:'lyra',controller:'human'},{id:'b',faction:'eridani',controller:'human'}],factionProfile:'expanded-v2'});
 state.activeSeatId='a';const seat=state.seats[0];seat.resources.materials=10;seat.influenceOnTrack=7;
 seat.shrines=[{sectorId:'prior-a',planetIndex:0,row:'materials',column:0},{sectorId:'prior-b',planetIndex:0,row:'materials',column:1}];
 const view=getPlayerView(state,'a')!,command=legalCommands(view).find(candidate=>candidate.command.type==='place-shrine'&&candidate.command.row==='materials'&&candidate.command.column===2)!.command;
 const preview=previewCommand(view,command),result=processGameCommand(state,'a',command);expect(result.ok).toBe(true);if(!result.ok)return;
 expect(preview.resourcesAfter).toEqual(result.state.seats[0].resources);expect(preview.influenceAfter).toBe(result.state.seats[0].influenceOnTrack);expect(preview.influenceAfter).toBe(7);
});
