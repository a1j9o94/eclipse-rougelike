import FactionProfilePicker from './FactionProfilePicker';
import {FACTION_COLORS} from './factionColors';
import FactionSymbol from './FactionSymbol';
import AiDifficultyPicker from './AiDifficultyPicker';
import {AI_DIFFICULTY_LABELS} from '../../shared/eclipse/aiConfig';
import {useState} from 'react';
import {listFactionsForProfile,getFaction,type FactionId,type CivilizationColor,type FactionProfile} from '../../shared/eclipse/catalog';
import {isMultiplayerSettings,isMultiplayerTimerMs,MIN_MULTIPLAYER_TIMER_MS,roomCanStart,roomInvitePath,type MultiplayerRoomLobby,type MultiplayerRoomSettings} from '../../shared/eclipse/multiplayer';
import FactionPicker,{type UnavailableFactionColors} from './FactionPicker';
import './room.css';

const presets=[{label:'30 seconds',ms:30000},{label:'2 minutes',ms:120000},{label:'10 minutes',ms:600000},{label:'1 hour',ms:3600000},{label:'24 hours',ms:86400000},{label:'48 hours',ms:172800000}];
export function RoomSettingsEditor({settings,disabled,onSave,onProfileChange,saveLabel='Save room settings'}:{settings:MultiplayerRoomSettings;disabled:boolean;onSave:(settings:MultiplayerRoomSettings)=>void;saveLabel?:string;onProfileChange?:(profile:FactionProfile)=>void}){
 const [draft,setDraft]=useState(settings),[unit,setUnit]=useState(1000);
 const setCount=(key:'humanSeatCount'|'aiCount',delta:number)=>setDraft(s=>{const next={...s,[key]:s[key]+delta};if(next.humanSeatCount===1){if(next.aiCount===0)next.aiCount=1;if(!isMultiplayerTimerMs(next.timerMs))next.timerMs=MIN_MULTIPLAYER_TIMER_MS;}return next;});
 return <section className="dg-room-settings" aria-label="Room settings"><h2>Room settings</h2><FactionProfilePicker value={draft.factionProfile??"base"} disabled={disabled} onChange={factionProfile=>{setDraft(s=>({...s,factionProfile}));onProfileChange?.(factionProfile);}}/>
  <div className="dg-room-counts">{(['humanSeatCount','aiCount'] as const).map(key=><div key={key}><span>{key==='humanSeatCount'?'Human players':'AI opponents'}</span><div><button type="button" aria-label={`Fewer ${key==='humanSeatCount'?'human players':'AI opponents'}`} disabled={disabled||draft[key]<=(key==='humanSeatCount'?1:draft.humanSeatCount===1?1:0)} onClick={()=>setCount(key,-1)}>−</button><output>{draft[key]}</output><button type="button" aria-label={`More ${key==='humanSeatCount'?'human players':'AI opponents'}`} disabled={disabled||draft.humanSeatCount+draft.aiCount>=6} onClick={()=>setCount(key,1)}>+</button></div></div>)}</div>
  {draft.aiCount>0&&<AiDifficultyPicker value={draft.aiDifficulty??'normal'} disabled={disabled} onChange={aiDifficulty=>setDraft(s=>({...s,aiDifficulty}))}/>}
  {draft.humanSeatCount===1?<p className="dg-solo-wait"><strong>Wait for me</strong> · No turn timer. Your solo game waits indefinitely for your next choice.</p>:<><h3>Time per turn</h3><div className="dg-room-timer-presets" role="group" aria-label="Turn timer presets">{presets.map(p=><button key={p.ms} type="button" aria-pressed={draft.timerMs===p.ms} disabled={disabled} onClick={()=>{setDraft(s=>({...s,timerMs:p.ms}));setUnit(p.ms>=3600000?3600000:p.ms>=60000?60000:1000);}}>{p.label}</button>)}</div>
  <div className="dg-room-custom-timer"><label>Custom duration<input type="number" aria-label="Custom turn duration" value={Number.isFinite(draft.timerMs)?Number((draft.timerMs/unit).toFixed(4)):''} min={0} step="any" disabled={disabled} onChange={e=>setDraft(s=>({...s,timerMs:e.target.value===''?0:Number(e.target.value)*unit}))}/></label><div role="group" aria-label="Timer units">{[{label:'Seconds',value:1000},{label:'Minutes',value:60000},{label:'Hours',value:3600000}].map(u=><button key={u.value} type="button" aria-pressed={unit===u.value} disabled={disabled} onClick={()=>setUnit(u.value)}>{u.label}</button>)}</div></div>
  <p>30 seconds to 48 hours. If time runs out, Normal AI finishes that turn. The human keeps their seat.</p></>}
  <label className="dg-check"><input type="checkbox" checked={draft.showCombatOdds??false} disabled={disabled} onChange={e=>setDraft(s=>({...s,showCombatOdds:e.target.checked}))}/>Show estimated combat odds in movement and fleet inspection</label><p>Optional public-fleet estimates for everyone. Dice and player decisions can change the result.</p>
  <label className="dg-check"><input type="checkbox" checked={draft.warpPortals} disabled={disabled} onChange={e=>setDraft(s=>({...s,warpPortals:e.target.checked}))}/>Base-game warp portals</label>
  <label className="dg-check"><input type="checkbox" checked={draft.minorSpecies??false} disabled={disabled} onChange={e=>setDraft(s=>({...s,minorSpecies:e.target.checked}))}/>Include Minor Species</label><p>Four shared allies are available to purchase with money. Each occupies an ambassador space and grants a lasting benefit.</p>
  <button className="dg-primary" disabled={disabled||!isMultiplayerSettings(draft)} onClick={()=>onSave(draft)}>{saveLabel}</button>
 </section>;
}

export interface RoomLobbyProps {
 lobby:MultiplayerRoomLobby;disabled:boolean;
 onJoin:(faction:FactionId,pieceColor?:CivilizationColor)=>void;onLeave:()=>void;onFaction:(faction:FactionId,pieceColor?:CivilizationColor)=>void;
 onReady:(ready:boolean)=>void;onSettings:(settings:MultiplayerRoomSettings)=>void;
 onStart:()=>void;onEnter:()=>void;
}
export default function RoomLobby({lobby,disabled,onJoin,onLeave,onFaction,onReady,onSettings,onStart,onEnter}:RoomLobbyProps){
 const own=lobby.seats.find(s=>s.slot===lobby.viewerSlot),waiting=lobby.status==='waiting';
 const profile=lobby.settings.factionProfile??'base',expanded=profile==='expanded-v1';
 const unavailable:UnavailableFactionColors={},unavailableFactions:Partial<Record<FactionId,string>>={};
 for(const seat of lobby.seats)if(seat.occupied&&seat.faction&&seat.slot!==lobby.viewerSlot){unavailable[seat.pieceColor??getFaction(seat.faction).color]=`Chosen by ${seat.username??`player ${seat.slot}`}`;unavailableFactions[seat.faction]=`Chosen by ${seat.username??`player ${seat.slot}`}`;}
 const options=listFactionsForProfile(profile);
 const available=options.find(f=>expanded?!unavailableFactions[f.id]:!unavailable[f.color])?.id??'terran-directorate';
 const [joiningFaction,setJoiningFaction]=useState<FactionId>(available),[copied,setCopied]=useState(false),[joiningColor,setJoiningColor]=useState<CivilizationColor>('red');
 const validJoining=options.some(f=>f.id===joiningFaction)&&(expanded?!unavailableFactions[joiningFaction]:!unavailable[getFaction(joiningFaction).color]);
 const selected=own?.faction??(validJoining?joiningFaction:available);
 const color=own?.pieceColor??(!unavailable[joiningColor]?joiningColor:(Object.keys(FACTION_COLORS) as CivilizationColor[]).find(c=>!unavailable[c])??'red');
 const invite=`${window.location.origin}${roomInvitePath(lobby.roomToken)}`;
 const canStart=roomCanStart({...lobby.settings,seats:lobby.seats});
 return <main className="dg-room dg-lobby"><div className="dg-room-inner">
  <header className="dg-room-heading"><div><p className="sd-eyebrow">ECLIPSE · SECOND DAWN</p><h1>Your game room</h1></div><a href="/">All games</a></header>
  <section className="dg-room-invite"><label>{lobby.settings.humanSeatCount===1?'Your game link':'Invite your friends'}<input aria-label="Room invitation link" readOnly value={invite} onFocus={e=>e.target.select()}/></label><button onClick={()=>{void navigator.clipboard.writeText(invite).then(()=>setCopied(true)).catch(()=>setCopied(false));}}>{copied?'Link copied':'Copy link'}</button></section>
  <section className="dg-room-agreed-rules" aria-label="Agreed room rules"><span><strong>{lobby.settings.humanSeatCount+lobby.settings.aiCount}</strong> players</span>{lobby.settings.humanSeatCount===1?<span><strong>Wait for me</strong> · No solo timer</span>:<><span><strong>{presets.find(p=>p.ms===lobby.settings.timerMs)?.label??`${lobby.settings.timerMs/1000} seconds`}</strong> per turn</span><span>Timeout → Normal AI takeover</span></>}<span>{expanded?'Expanded civilizations':'Base game factions'}</span><span>Rift Cannon expansion included</span><span>Minor Species {lobby.settings.minorSpecies?'enabled':'disabled'}</span><span>Warp portals {lobby.settings.warpPortals?'enabled':'disabled'}</span><span>Combat estimates {lobby.settings.showCombatOdds?'enabled':'disabled'}</span></section>
  <div className="dg-room-layout"><aside className="dg-room-roster"><h2>{waiting?'Gather your civilizations':'Room players'}</h2><div role="list" aria-label="Room players">{lobby.seats.map(seat=><article role="listitem" key={seat.slot} className={seat.slot===lobby.viewerSlot?'is-you':''}><span className="dg-room-seat-number" style={{color:seat.faction?FACTION_COLORS[seat.pieceColor??getFaction(seat.faction).color]:undefined}}>{seat.faction?<FactionSymbol faction={seat.faction}/>:seat.slot}</span><div><strong>{seat.username&&<span className="dg-room-username">{seat.username} · </span>}{seat.faction?getFaction(seat.faction).name:seat.occupied?'Choose faction':'Open seat'}</strong><small>{seat.slot===lobby.viewerSlot?'You · ':''}{seat.isHost?'Host · ':''}{seat.occupied?(seat.ready?'Ready':'Choosing faction'):'Waiting for a friend'}</small></div><span className={`dg-room-ready ${seat.ready?'is-ready':''}`} aria-label={seat.ready?'Ready':'Not ready'}>{seat.ready?'✓':'○'}</span></article>)}</div>
   {lobby.settings.aiCount>0&&<p>{lobby.settings.aiCount} {AI_DIFFICULTY_LABELS[lobby.settings.aiDifficulty??'normal']} AI {lobby.settings.aiCount===1?'opponent':'opponents'} · remaining factions and piece colors assigned at start</p>}
   <p className="dg-room-rule">{waiting?'Everyone chooses a faction and readies up. The host then starts the galaxy.':'This room is already playing. Existing players can return to their seats.'}</p>
   {waiting&&lobby.viewerIsHost&&<details className="dg-room-settings-disclosure"><summary>Edit room settings</summary><RoomSettingsEditor key={JSON.stringify(lobby.settings)} settings={lobby.settings} disabled={disabled} onSave={onSettings}/><p>Changing settings clears all ready states.</p></details>}
   {waiting&&own&&<button disabled={disabled} onClick={onLeave}>Leave room</button>}
  </aside><div className="dg-room-faction">{waiting?<><FactionPicker selected={selected} profile={profile} pieceColor={color} onPieceColorChange={next=>{setJoiningColor(next);if(own)onFaction(selected,next);}} unavailableFactions={unavailableFactions} unavailableColors={unavailable} disabled={disabled} onSelect={f=>{setJoiningFaction(f);if(own){if(expanded)onFaction(f,color);else onFaction(f);}}}/><p className="dg-room-rule">{own&&!own.faction?'Choose a faction to ready up. ':''}Faction or roster changes clear everyone’s ready state.</p></>:<section className="dg-room-started"><h2>{lobby.status==='finished'?'Final standings await':'The galaxy is underway'}</h2><p>{own?'Your seat and every accepted choice are saved automatically.':'Only the players who joined before the game started can open its board.'}</p></section>}</div></div>
  <footer className="dg-room-footer"><span>{waiting?`${lobby.seats.filter(s=>s.occupied&&s.ready).length} / ${lobby.settings.humanSeatCount} players ready`:'Game saved in this room'}</span>{waiting?own?<><button disabled={disabled||!own.faction} title={!own.faction?"Choose a faction before readying up.":undefined} className={own.ready?'':'dg-primary'} onClick={()=>onReady(!own.ready)}>{own.ready?'Not ready':'Ready to play'}</button>{lobby.viewerIsHost&&<button className="dg-primary" disabled={disabled||!canStart} onClick={onStart}>Start room game</button>}</>:<button className="dg-primary" disabled={disabled||!lobby.seats.some(s=>!s.occupied)||Boolean(expanded?unavailableFactions[selected]:unavailable[getFaction(selected).color])} onClick={()=>expanded?onJoin(selected,color):onJoin(selected)}>Join room</button>:own&&<button className="dg-primary" disabled={disabled} onClick={onEnter}>{lobby.status==='finished'?'View final game':'Return to game'}</button>}</footer>
 </div></main>;
}
