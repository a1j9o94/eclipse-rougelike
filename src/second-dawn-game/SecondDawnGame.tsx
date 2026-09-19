import AiDifficultyPicker from './AiDifficultyPicker';
import type { AiDifficulty } from '../../shared/eclipse/aiConfig';
import { useEffect, useRef, useState } from "react";
import {
  useAction,
  useConvex,
  useConvexConnectionState,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getFaction } from "../../shared/eclipse/catalog";
import type { FactionId, FactionProfile, CivilizationColor } from "../../shared/eclipse/catalog";
import { loadOrCreateGuestCredential } from "../second-dawn-session/guestStorage";
import { isGuestCredential } from "../../shared/eclipse/guest";
import { legalCommands } from "../../shared/eclipse/legal";
import type { GameCommand } from "../../shared/eclipse/types";
import SecondDawnBoard from "./SecondDawnBoard";
import SavedGames from "./SavedGames";
import FactionProfilePicker from "./FactionProfilePicker";
import FactionPicker from './FactionPicker';
import RoomLobby,{RoomSettingsEditor} from './RoomLobby';
import TurnClock from './TurnClock';
import PlayerAccessPanel from './PlayerAccessPanel';
import ConnectionStatus from '../second-dawn-session/ConnectionStatus';
import {switchPlayerCredential} from '../second-dawn-session/playerSession';
import {roomInvitePath,type MultiplayerRoomSettings} from '../../shared/eclipse/multiplayer';
import {useMatchHistory} from "../second-dawn-session/useMatchHistory";
import {useActivityRecap} from '../second-dawn-session/useActivityRecap';
import {useForegroundMatch} from '../second-dawn-session/useForegroundMatch';
import {useMobileLayout} from './mobileLayout';
import ActivityRecap from './ActivityRecap';
import "./game.css";
import './mobileLauncher.css';
const credentialKey = "eclipse.second-dawn.guest.v1";
const matchKey = "eclipse.second-dawn.match.v1";
const DEFAULT_ROOM_SETTINGS:MultiplayerRoomSettings={humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true,factionProfile:"expanded-v1"};
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string): void {
  localStorage.setItem(key, value);
}
export default function SecondDawnGame() {
  const client = useConvex();
  if (!client)
    return (
      <main className="dg-lobby">
        <h1>Second Dawn needs a server connection.</h1>
        <p>
          The game saves its authoritative state to Convex. Connect the
          application to its game server, then return here.
        </p>
        <a href="#second-dawn-preview">Explore the playable preview</a>
      </main>
    );
  return <ConnectedGame />;
}
function ConnectedGame() {
  const client=useConvex();
  const compact=useMobileLayout();
  const markSeen=useMutation(api.eclipseMatches.markMatchSeen);
  const [lastAcceptedCommand,setLastAcceptedCommand]=useState<{revision:number;type:GameCommand['type']}|undefined>();
  const [recapSaving,setRecapSaving]=useState(false);
  const [recapError,setRecapError]=useState<string|null>(null);
  const issueGuest = useAction(api.eclipseGuests.createGuestSession);
  const rotateRecoveryCode=useAction(api.eclipsePlayers.rotateRecoveryCode);
  const registerPlayer=useAction(api.eclipsePlayers.registerPlayer);
  const loginPlayer=useAction(api.eclipsePlayers.loginPlayer);
  const submit = useMutation(api.eclipseMatches.submitCommand);
  const retryAi = useMutation(api.eclipseMatches.retryAi);
  const createRoom = useMutation(api.eclipseRooms.createRoom);
  const joinRoom = useMutation(api.eclipseRooms.joinRoom);
  const leaveRoom = useMutation(api.eclipseRooms.leaveRoom);
  const chooseRoomFaction = useMutation(api.eclipseRooms.chooseRoomFaction);
  const updateRoomSettings = useMutation(api.eclipseRooms.updateRoomSettings);
  const setRoomReady = useMutation(api.eclipseRooms.setRoomReady);
  const startRoom = useMutation(api.eclipseRooms.startRoom);
  const retryRoomTimer = useMutation(api.eclipseRooms.retryRoomTimer);
  const [roomToken,setRoomToken]=useState(()=>{const match=window.location.pathname.match(/^\/room\/([a-zA-Z0-9_-]+)\/?$/);return match?.[1]??null;});
  const [roomOverview,setRoomOverview]=useState(false);
  const [creatingRoom,setCreatingRoom]=useState(false);
  const [clockExpired,setClockExpired]=useState(false);
  const connection = useConvexConnectionState();
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setBrowserOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  // Browser reachability is only a hint; a working game socket takes precedence.
  const connected = connection.isWebSocketConnected;
  const [credential, setCredential] = useState(() => {
    const saved = readStorage(credentialKey);
    return saved && isGuestCredential(saved) ? saved : null;
  });
  const [matchId, setMatchId] = useState<Id<"eclipseMatchesV1"> | null>(null);
  const history = useMatchHistory(credential,matchId);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [aiCount, setAiCount] = useState(2);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('normal');
  const [faction, setFaction] = useState<FactionId>("terran-directorate");
  const [factionProfile,setFactionProfile]=useState<FactionProfile>('expanded-v1');
  const [pieceColor,setPieceColor]=useState<CivilizationColor>('red');
  const chooseProfile=(profile:FactionProfile)=>{setFactionProfile(profile);if(profile==='base'&&['rho-indi','magellan','midas','ragnarok'].includes(faction))setFaction('terran-directorate');};
  const [warpPortals, setWarpPortals] = useState(true);
  const initialization = useRef<Promise<string> | null>(null);
  const lastRequest = useRef<{
    commandId: string;
    expectedRevision: number;
    command: GameCommand;
  } | null>(null);
  const guest = useQuery(
    api.eclipseGuests.getGuestSession,
    credential ? { credential } : "skip",
  );
  const matches = useQuery(
    api.eclipseMatches.listMyMatches,
    credential ? { credential } : "skip",
  );
  const view = useQuery(
    api.eclipseMatches.getMatchView,
    credential && matchId ? { credential, matchId } : "skip",
  );
  const recap=useActivityRecap(matchId&&view?`${matchId}:${view.viewerSeatId}:${credential}`:null,view);
  const recovery=useForegroundMatch({
    key:credential&&matchId?`${credential}:${matchId}`:null,
    connected,
    revision:view?.revision??0,
    refresh:()=>credential&&matchId?client.query(api.eclipseMatches.getMatchView,{credential,matchId}):Promise.resolve(null),
    onResume:boundary=>recap.resume(boundary),
  });
  async function dismissRecap(){
    const snapshot=recap.snapshot;
    if(!credential||!matchId||!snapshot||!connected||recapSaving)return;
    setRecapSaving(true);setRecapError(null);
    try{await markSeen({credential,matchId,revision:snapshot.throughRevision});recap.dismiss();}
    catch(error){setRecapError(error instanceof Error?error.message:'Could not save your activity marker.');}
    finally{setRecapSaving(false);}
  }
  const room=useQuery(api.eclipseRooms.getRoom,roomToken?{roomToken,...(credential?{credential}:{})}:'skip');
  const rooms=useQuery(api.eclipseRooms.listMyRooms,credential?{credential}:'skip');
  const profile=useQuery(api.eclipsePlayerStore.getPlayerProfile,credential?{credential}:'skip');
  function switchPlayer(next:string){switchPlayerCredential(localStorage,next);lastRequest.current=null;setMatchId(null);setRoomOverview(false);setCredential(next);setStatus('Player restored.');}
  const originalPlayer=readStorage('eclipse.second-dawn.original-player.v1');
  const previousPlayer=originalPlayer&&isGuestCredential(originalPlayer)&&originalPlayer!==credential?originalPlayer:readStorage('eclipse.second-dawn.previous-player.v1');
  const playerAccess=<PlayerAccessPanel profile={profile??null} disabled={!connected||!credential||profile===undefined||busy} onRegister={(username,pin)=>registerPlayer({credential:credential!,username,...(pin?{pin}:{})})} onLogin={async(username,secret)=>{const result=await loginPlayer({username,secret});switchPlayer(result.credential);}} onRotateRecoveryCode={()=>rotateRecoveryCode({credential:credential!})} onPreviousPlayer={previousPlayer&&isGuestCredential(previousPlayer)&&previousPlayer!==credential?()=>switchPlayer(previousPlayer):undefined}/>;
  const deadline=view?.multiplayer?.timer?.deadlineAt;
  useEffect(()=>{
    setClockExpired(deadline!==undefined&&Date.now()>=deadline);
    if(deadline===undefined)return;
    const timeout=window.setTimeout(()=>setClockExpired(true),Math.max(0,deadline-Date.now()));
    return()=>window.clearTimeout(timeout);
  },[deadline]);
  useEffect(()=>{
    if(!roomToken||!room?.matchId||room.viewerSlot===null)return;
    const id=room.matchId as Id<'eclipseMatchesV1'>;
    setMatchId(id);store(matchKey,id);
  },[roomToken,room?.matchId,room?.viewerSlot,credential]);
  function openHome(setup=false){
    // Clear the room route as well as the selected match so its subscription
    // cannot immediately reopen the finished galaxy. Saved ownership is intact.
    window.history.replaceState({},'', '/');
    setRoomToken(null);setMatchId(null);setRoomOverview(false);
    setCreating(setup);setCreatingRoom(false);setStatus('');
    lastRequest.current=null;setLastAcceptedCommand(undefined);
    setRecapError(null);recap.dismiss();
  }
  async function roomAction(action:()=>Promise<void>){
    if(!connected||!credential||busy)return;
    setBusy(true);setStatus('');
    try{await action();}catch(error){setStatus(error instanceof Error?error.message:'The room could not be updated.');}finally{setBusy(false);}
  }
  function newRoom(settings:MultiplayerRoomSettings){
    void roomAction(async()=>{const result=await createRoom({credential:credential!,settings:{...settings,factionProfile},faction,pieceColor:factionProfile==='expanded-v1'?pieceColor:undefined});window.location.assign(roomInvitePath(result.roomToken));});
  }
  useEffect(() => {
    if (credential) return;
    let active = true;
    initialization.current ??= loadOrCreateGuestCredential(localStorage, () =>
      issueGuest({}),
    );
    void initialization.current
      .then((result) => {
        if (!active) return;
        setCredential(result);
      })
      .catch((error) => {
        if (active)
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not create a guest session.",
          );
      });
    return () => {
      active = false;
    };
  }, [credential, issueGuest]);
  async function newMatch() {
    if (!credential || !connected || busy) return;
    setBusy(true);
    setStatus("Creating your galaxy…");
    try {
      const room = await createRoom({
        credential,
        faction,
        pieceColor:factionProfile==='expanded-v1'?pieceColor:undefined,
        settings:{humanSeatCount:1,aiCount,aiDifficulty,warpPortals,factionProfile,timerMs:DEFAULT_ROOM_SETTINGS.timerMs},
      });
      await setRoomReady({credential,roomToken:room.roomToken,ready:true});
      const result=await startRoom({credential,roomToken:room.roomToken});
      store(matchKey, result.matchId);
      setMatchId(result.matchId);
      setCreating(false);
      setStatus(
        "Game created. Your next accepted command saves automatically.",
      );
      window.location.assign(roomInvitePath(room.roomToken));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not create the match.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function send(command: GameCommand) {
    if (!credential || !matchId || !view || !recovery.ready || busy) return;
    setBusy(true);
    setStatus("Saving your command…");
    const prior = lastRequest.current;
    const request =
      prior && JSON.stringify(prior.command) === JSON.stringify(command)
        ? prior
        : {
            commandId: crypto.randomUUID(),
            expectedRevision: view.revision,
            command,
          };
    lastRequest.current = request;
    try {
      const result = await submit({ credential, matchId, ...request });
      if (result.ok) {
        lastRequest.current = null;
        setLastAcceptedCommand({revision:result.receipt.revision,type:command.type});
        recap.dismiss();
        setStatus(
          `Saved · revision ${result.receipt.revision}${result.duplicate ? " · recovered original confirmation" : ""}`,
        );
      } else {
        lastRequest.current = null;
        setStatus(
          `${result.error.message}${result.error.code === "STALE_REVISION" ? " The board is refreshing; review your choice again." : ""}`,
        );
      }
    } catch (error) {
      setStatus(
        `${error instanceof Error ? error.message : "Connection interrupted."} Retry the same choice to recover its original confirmation.`,
      );
    } finally {
      setBusy(false);
    }
  }
  const takeover=view?.multiplayer?.timer?.targetSeatId===view?.viewerSeatId&&(clockExpired||['timed-out','failed'].includes(view?.multiplayer?.timer?.status??''));
  if (matchId && view && !roomOverview)
    return (
      <><SecondDawnBoard
        key={`${matchId}:${view.viewerSeatId}`}
        matchId={matchId}
        lastAcceptedCommand={lastAcceptedCommand}
        recapOpen={compact&&!!recap.snapshot?.open}
        activityRecap={compact&&recap.snapshot?.open?<ActivityRecap baseline={recap.snapshot.baseline} throughRevision={recap.snapshot.throughRevision} feed={history} disabled={!recovery.ready} saving={recapSaving} error={recapError} onDismiss={()=>{void dismissRecap();}}/>:undefined}
        playerNames={view.playerNames}
        history={history}
        view={view}
        candidates={legalCommands(view)}
        connected={recovery.ready}
        busy={busy||takeover}
        status={recovery.checking?"Refreshing your saved galaxy…":status}
        onSubmit={(command) => {
          void send(command);
        }}
        onHome={()=>openHome()}
        onPlayAgain={()=>openHome(true)}
        menuLabel={roomToken?'Game room':'Game menu'}
        onMenu={() => {if(roomToken)setRoomOverview(true);else setMatchId(null);}}
        turnClock={view.multiplayer?<TurnClock timer={view.multiplayer.timer} actorName={view.multiplayer.timer?.targetSeatId===view.viewerSeatId?'You':view.seats.find(s=>s.id===view.multiplayer?.timer?.targetSeatId)?getFaction(view.seats.find(s=>s.id===view.multiplayer?.timer?.targetSeatId)!.faction).name:'Opponent'} disabled={!connected||busy} onRetry={()=>{void roomAction(async()=>{await retryRoomTimer({credential:credential!,roomToken:view.multiplayer!.roomToken});});}}/>:undefined}
        aiThinking={view.aiStatus?.status==='thinking'}
        aiTakeover={view.multiplayer?.timer?.status==='timed-out'}
        aiDifficulty={view.aiDifficulty}
        aiFailure={
          view.aiStatus?.status === "failed" ? view.aiStatus.error : null
        }
        onRetryAi={() => {
          if (credential && matchId)
            void retryAi({ credential, matchId }).catch((error) =>
              setStatus(
                error instanceof Error ? error.message : "Could not retry AI.",
              ),
            );
        }}
      />{recovery.error&&<div className="dg-foreground-warning" role="alert"><span>{recovery.error}</span><button onClick={recovery.retry}>Retry refresh</button></div>}</>
    );
  if(roomToken)return <><div className="dg-room-player-access"><ConnectionStatus connected={connected} browserOnline={browserOnline} sessionReady={Boolean(credential&&guest)} status={status}/>{playerAccess}</div>{room===undefined?<main className="dg-lobby"><p>Loading game room…</p></main>:room===null?<main className="dg-lobby"><h1>Room unavailable</h1><p>This room link is no longer available.</p><a href="/">All games</a></main>:<RoomLobby lobby={room} disabled={!connected||!credential||busy||guest===null} onJoin={(selected,color)=>{void roomAction(async()=>{await joinRoom({credential:credential!,roomToken,faction:selected,pieceColor:color});});}} onLeave={()=>{void roomAction(async()=>{await leaveRoom({credential:credential!,roomToken});window.location.assign('/');});}} onFaction={(selected,color)=>{void roomAction(async()=>{await chooseRoomFaction({credential:credential!,roomToken,faction:selected,pieceColor:color});});}} onReady={ready=>{void roomAction(async()=>{await setRoomReady({credential:credential!,roomToken,ready});});}} onSettings={settings=>{void roomAction(async()=>{await updateRoomSettings({credential:credential!,roomToken,settings});});}} onStart={()=>{void roomAction(async()=>{await startRoom({credential:credential!,roomToken});setRoomOverview(false);});}} onEnter={()=>setRoomOverview(false)}/>}</>;
  return (
    <main className="dg-lobby">
      <div className="dg-lobby-inner">
        <p className="sd-eyebrow">SECOND DAWN FOR THE GALAXY</p>
        <h1>Eclipse</h1>
        <p>
          Build an empire. Shape your fleet. Find your place among the stars.
        </p>
        <ConnectionStatus connected={connected} browserOnline={browserOnline} sessionReady={Boolean(credential&&guest)} status={status} readyMessage={profile?`Signed in as ${profile.username}. Your games are available on any device after sign-in.`:'Guest saves stay available in this browser.'}/>
        {playerAccess}
        {credential && guest === null ? (
          <div className="dg-error">
            This browser's guest credential is not recognized by this server.
            Return to the original server to recover its saves.
          </div>
        ) : matchId && view === undefined ? (
          <p>Loading your saved galaxy…</p>
        ) : matchId && view === null ? (
          <>
            <p>This guest cannot access that match.</p>
            <button onClick={() => setMatchId(null)}>Back to games</button>
          </>
        ) : creatingRoom ? (
          <section className="dg-room dg-room-creation"><h2>Create multiplayer room</h2><div className="dg-room-creation-grid"><FactionPicker selected={faction} onSelect={setFaction} disabled={busy} profile={factionProfile} pieceColor={pieceColor} onPieceColorChange={setPieceColor}/><div><RoomSettingsEditor onProfileChange={chooseProfile} settings={{...DEFAULT_ROOM_SETTINGS,factionProfile}} disabled={!connected||!credential||busy} onSave={newRoom} saveLabel="Create room"/></div></div><button onClick={()=>setCreatingRoom(false)}>Back</button></section>
        ) : creating ? (
          <section className="dg-setup">
            <h2>New game</h2><FactionProfilePicker value={factionProfile} onChange={chooseProfile} disabled={busy}/>
            <p className="dg-solo-wait">Solo · Wait for me. No turn timer; your game waits until you return.</p>
            <div className="dg-solo-setup-grid">
            <FactionPicker selected={faction} onSelect={setFaction} disabled={busy} profile={factionProfile} pieceColor={pieceColor} onPieceColorChange={setPieceColor}/>
            <aside className="dg-solo-controls">
            <label className="dg-field">
              AI opponents
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option value={n} key={n}>
                    {n} opponent{n === 1 ? "" : "s"} · {n + 1} players
                  </option>
                ))}
              </select>
            </label>
            <label className="dg-check">
              <input
                type="checkbox"
                checked={warpPortals}
                onChange={(e) => setWarpPortals(e.target.checked)}
              />
              Use base-game warp portals
            </label>
            <AiDifficultyPicker value={aiDifficulty} onChange={setAiDifficulty} disabled={busy}/>
            <button
              className="dg-primary"
              disabled={!connected || !credential || busy}
              onClick={() => {
                void newMatch();
              }}
            >
              Start game
            </button>
            <button onClick={() => setCreating(false)}>Back</button>
            </aside></div>
          </section>
        ) : (
          <>
            <button
              className="dg-primary"
              disabled={!connected || !credential}
              onClick={() => setCreating(true)}
            >
              New game
            </button>
            <button disabled={!connected||!credential} onClick={()=>setCreatingRoom(true)}>Create multiplayer room</button>
            <SavedGames matches={matches} rooms={rooms} onOpen={match=>{
              store(matchKey,match.matchId);setMatchId(match.matchId);setStatus('');
            }}/>

          </>
        )}
        <a href="#second-dawn-preview">Playable preview · sample positions</a>
      </div>
    </main>
  );
}
