import {expandedReviewFixtures} from './expandedReviewFixtures';
import {riftCombatReviewFixture} from './riftReviewFixture';
import { useState } from "react";
import { createGame } from "../../shared/eclipse/setup";
import { movableShipCount } from "../../shared/eclipse/geometry";
import { movementAbilities } from "../../shared/eclipse/rulesState";
import { legalCommands } from "../../shared/eclipse/legal";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { processGameCommand } from "../../shared/eclipse/engine";
import type { GameState, GameCommand } from "../../shared/eclipse/types";
import fixturesJson from "./reviewFixtures.json?raw";
import historyJson from "./reviewHistory.json?raw";
import {projectHistoryEntry,type PublicHistoryEntry} from "../../shared/eclipse/history";
const recordedHistory=JSON.parse(historyJson) as Record<string,PublicHistoryEntry[]>;
import SecondDawnBoard from "./SecondDawnBoard";
import { AtlasArtContext } from './atlasArtContext';
import './woodenAtlas.css';
const recordedFixtures = JSON.parse(fixturesJson) as Record<string, GameState>;
const fixtures: Record<string, GameState> = {
  ...recordedFixtures,
  ...expandedReviewFixtures(),
  'rift-combat': riftCombatReviewFixture(),
  "opening-three": createGame({
    seed: 1703,
    warpPortals: true,
    seats: recordedFixtures.opening.seats
      .slice(0, 3)
      .map((seat, index) => ({
        id: seat.id,
        faction: seat.faction,
        controller: index === 0 ? "human" : "ai",
      })),
  }),
};
const stageShortcuts = [
  {id:'opening',label:'Opening'}, {id:'midgame',label:'Round 4'}, {id:'late',label:'Round 8'},
  {id:'ragnarok-mixed-action',label:'Expanded factions'}, {id:'rift-combat',label:'Active combat'}, {id:'ancients',label:'Ancients'},
];
const positionNames: Record<string,string> = {
  'midas-extra-activation':'Midas · buy an extra Research activation',
  'faction-rho-indi':'Rho Indi · expanded opening', 'faction-magellan':'Magellan · colony ship conversion', 'faction-midas':'Midas · paid activations', 'faction-ragnarok':'Ragnarok · expanded opening', 'ragnarok-mixed-action':'Ragnarok · Build & Move action',
  opening:'Opening · six players', 'opening-three':'Opening · three players',
  'rift-combat':'Rift Cannon · shields and backfire',
  midgame:'Round 4 · developed galaxy', late:'Round 8 · final round', combat:'Active combat · allocate hits',
  ancients:'Ancients on the board', 'exploration-ancients':'Explore a sector with Ancients', 'ancient-combat':'Battle against Ancients',
  exploration:'Explore a sector', discovery:'Discovery reward', retreat:'Combat · choose retreat', scoring:'Final scoring',
};
function initialPosition(): string {
  const requested = new URLSearchParams(window.location.search).get('position');
  return requested && Object.hasOwn(fixtures,requested) ? requested : 'opening';
}
/** Recorded engine states are explicit isolated review fixtures, never guest match snapshots. */
export default function SecondDawnReview() {
  const [atlas, setAtlas] = useState(true);
  const [lastAcceptedCommand,setLastAcceptedCommand]=useState<{revision:number;type:GameCommand['type']}|undefined>();
  const [fixture, setFixture] = useState(initialPosition);
  const [state, setState] = useState(() => structuredClone(fixtures[fixture]));
  const [history,setHistory]=useState<PublicHistoryEntry[]>(()=>recordedHistory[fixture]??[]);
  const [status, setStatus] = useState(
    "Engine fixture review · isolated from guest saves.",
  );
  const selectFixture = (name:string) => {
    setFixture(name);
    setLastAcceptedCommand(undefined);
    setStatus("Engine fixture review · isolated from guest saves.");
    setState(structuredClone(fixtures[name]));
    setHistory(recordedHistory[name]??[]);
    const url=new URL(window.location.href);url.searchParams.set('position',name);window.history.replaceState(null,'',url);
  };
  const pinnedOwner =
    fixture === "pinned"
      ? state.seats.find((seat) =>
          state.ships.some(
            (ship) =>
              ship.owner === seat.id &&
              ship.type !== "starbase" &&
              movableShipCount(
                seat.id,
                ship.sectorId,
                state.ships.map((s) => ({
                  id: s.id,
                  owner: s.owner,
                  sectorId: s.sectorId,
                  kind: s.type,
                  movement: 0,
                })),
                movementAbilities(seat),
              ) === 0,
          ),
        )?.id
      : null;
  const actor =
    pinnedOwner ??
    state.pendingDecision?.owner ??
    state.activeSeatId ??
    state.seats[0].id;
  const view = getPlayerView(state, actor)!;
  return (
    <AtlasArtContext.Provider value={atlas}><div className={`dg-review${atlas ? ' atlas-review' : ''}`}>
      <div className="dg-review-bar">
        <span className="dg-preview-label">{atlas ? 'THE CAPTAIN’S ATLAS' : 'PLAYABLE PREVIEW'}</span>
        <button aria-pressed={atlas} onClick={()=>setAtlas(value=>!value)}>Wooden atlas {atlas ? 'on' : 'off'}</button>
        <nav aria-label="Preview game stages">{stageShortcuts.map(stage=><button key={stage.id} aria-pressed={fixture===stage.id} onClick={()=>selectFixture(stage.id)}>{stage.label}</button>)}</nav>
        <label>
          More positions{" "}
          <select
            aria-label="Review position"
            value={fixture}
            onChange={(e) => selectFixture(e.target.value)}
          >
            {Object.keys(fixtures).map((name) => (
              <option key={name} value={name}>
                {positionNames[name] ?? name.replaceAll("workflow-", "Action · ").replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <a href="#">Return to game</a>
      </div>
      <SecondDawnBoard
        key={fixture}
        reviewMode
        lastAcceptedCommand={lastAcceptedCommand}
        history={{entries:history,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}}
        initialSectorId={fixture==='ancients' ? state.ships.find(ship=>ship.type==='ancient')?.sectorId : undefined}
        view={view}
        candidates={legalCommands(view)}
        connected={true}
        busy={false}
        status={status}
        onSubmit={(command) => {
          const result = processGameCommand(state, actor, command);
          if (result.ok) {
            const revision=state.revision+1;
            setLastAcceptedCommand({revision,type:command.type});
            setHistory(entries=>[projectHistoryEntry({actor,request:{commandId:`review-${revision}`,expectedRevision:state.revision,command},receipt:{commandId:`review-${revision}`,revision,eventCount:result.events.length},events:result.events},state.seats,state.round,state),...entries]);
            setState({ ...result.state, revision });
            setStatus(
              "Applied to the isolated engine fixture. No guest save changed.",
            );
          } else setStatus(result.error.message);
        }}
        onMenu={() => {
          window.location.hash = "";
        }}
      />
    </div></AtlasArtContext.Provider>
  );
}
