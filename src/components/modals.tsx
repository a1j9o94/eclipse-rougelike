// React import not required with modern JSX transform

import { FACTIONS } from '../../shared/factions'
import { SECTORS, getBossVariants, getBossFleetFor, getOpponentFaction, ALL_PARTS, makeShip, FRAMES, getSectorSpec } from '../game'
import { getInitialCapacityForDifficulty } from '../../shared/difficulty'
import { selectOpponentIntel } from '../selectors/opponentIntel'
import type { MpBasics } from '../adapters/mpSelectors'
import { BASE_CONFIG } from '../../shared/game'
import { CompactShip } from './ui'
import { type Ship } from '../../shared/types'
import { partEffects } from '../../shared/parts'
import { type Research } from '../../shared/defaults'
import { isEnabled as tutorialEnabled, getStep as tutorialGetStep } from '../tutorial/state'

function BossFleetPreview({ sector }:{ sector:5|10 }){
  const opp = getOpponentFaction();
  if(!opp) return null;
  const spec = getBossFleetFor(opp, sector);
  const oppName = FACTIONS.find(f=>f.id===opp)?.name || String(opp);
  const ships = (spec.ships.map(bs => makeShip(
    FRAMES[bs.frame],
    bs.parts.map(pid => ALL_PARTS.find(p=>p.id===pid)!).filter(Boolean)
  )) as unknown) as Ship[];
  return (
    <div className="mt-1">
      <div className="text-[11px] opacity-80">Opponent: {oppName} — "{spec.name}"</div>
      <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
        {ships.map((sh, i)=>(<CompactShip key={i} ship={sh} side='E' active={false} />))}
      </div>
    </div>
  );
}

import { useRef, useEffect } from 'react'

export function RulesModal({ onDismiss }:{ onDismiss:()=>void }){
  const dockStart = getInitialCapacityForDifficulty('easy', BASE_CONFIG.startingFrame);
  const dockCircles = '🟢'.repeat(dockStart);
  const closeRef = useRef<HTMLButtonElement|null>(null)
  useEffect(()=>{ try { closeRef.current?.focus() } catch { /* noop */ } }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60">
      <div className="w-full max-w-lg bg-zinc-800 border border-zinc-600 rounded-2xl p-4 shadow-xl">
        <div className="text-lg font-semibold mb-2">How to Play</div>
        <div className="text-sm space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div><b>Goal.</b> Clear 10 sectors with your fleet. If every ship is destroyed, the run ends.</div>
          <div><b>Symbols.</b> ⚡ Power • 🚀 Initiative • 🎯 Aim • 🛡️ Shields • ❤️ Hull • 🎲 Weapon die • 🕳️ Rift die • ⬛ Slot</div>
          <div><b>Combat.</b> Ships act from highest 🚀 to lowest. Weapons roll 🎲; 1 misses and 6 hits. 🎯 lowers the roll needed while 🛡️ raises it.</div>
          <div><b>Outpost.</b> Between battles spend 💰 credits and 🧱 materials to buy parts, build ships, and reroll the shop. Each reroll costs more.</div>
          <div><b>Research.</b> Use 🔬 science on Military, Grid, and Nano to unlock higher-tier parts and ship upgrades.</div>
          <div><b>Ships & Power.</b> Your dock starts with {dockCircles} capacity. Ships cost 🟢 by size and each needs a ⚡ Source and a Drive. Keep power use within supply.</div>
          <div><b>Progress.</b> Winning a battle advances you to the next sector and grants rewards. Bosses await at sectors 5 and 10.</div>
        </div>
        <div className="mt-3"><button ref={closeRef} onClick={onDismiss} className="w-full px-4 py-2 rounded-xl bg-emerald-600">Let’s go</button></div>
      </div>
    </div>
  );
}

export function CombatPlanModal({ onClose, sector, endless, gameMode, multi }:{ onClose:()=>void, sector:number, endless:boolean, gameMode:'single'|'multiplayer', multi?: MpBasics | null }){
  const plan = endless
    ? Array.from({length:5}, (_,i)=> getSectorSpec(sector + i))
    : SECTORS;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-lg bg-zinc-800 border border-zinc-600 rounded-2xl p-4">
        <div className="text-lg font-semibold mb-2">Enemy Intel</div>
        {gameMode === 'multiplayer' ? (
          <div className="text-xs sm:text-sm space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {(() => {
              const intel = selectOpponentIntel(gameMode, multi as never)
              const fleet = intel.fleet
              const round = intel.round || 1
              const name = intel.opponentName || 'Opponent'
              const lives = intel.opponentLives ?? 0
              if (!fleet || fleet.length === 0) {
                return (
                  <div className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800">
                    <div className="font-medium">{name} — Round {round}</div>
                    <div className="text-[11px] mb-1">Lives: {lives} ❤</div>
                    <div className="opacity-80 mt-0.5">No data yet — defaults shown</div>
                  </div>
                )
              }
              return (
                <div className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800">
                  <div className="font-medium">{name} — Round {round}</div>
                  <div className="text-[11px]">Lives: {lives} ❤</div>
                  <div className="opacity-70 mb-1">{intel.source === 'last_combat' ? 'Last faced fleet' : 'Current starting fleet'}</div>
                  <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                    {fleet.map((sh, i)=>(<CompactShip key={i} ship={sh} side='E' active={false} />))}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="text-xs sm:text-sm space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {plan.map(s=> (
              <div key={s.sector} className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div>Sector {s.sector}{s.boss? ' (Boss)':''}</div>
                  {s.boss && (
                    <>
                      <div className="opacity-70 mt-0.5">Variants: {getBossVariants(s.sector).map(v=>v.label).join(', ')}</div>
                      <BossFleetPreview sector={s.sector as 5|10} />
                    </>
                  )}
                </div>
                <div className="opacity-80 text-right whitespace-nowrap">Enemy tonnage {s.enemyTonnage} • Science cap T{s.enemyScienceCap}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3"><button onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-emerald-600">Close</button></div>
      </div>
    </div>
  );
}


export function TechListModal({ onClose, research }:{ onClose:()=>void, research:Research }){
  const tracks = ['Military','Grid','Nano'] as const;
  const closeRef = useRef<HTMLButtonElement|null>(null)
  useEffect(()=>{
    if (tutorialEnabled() && tutorialGetStep()==='tech-close') {
      setTimeout(()=>{ try { closeRef.current?.focus() } catch { /* noop */ } }, 0)
    }
  },[])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 border border-zinc-600 rounded-2xl p-4">
        <div className="text-lg font-semibold mb-2">Tech List</div>
        <div className="max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm space-y-3">
          {tracks.map(t => {
            const parts = ALL_PARTS.filter(p=>p.tech_category===t && !p.rare).sort((a,b)=>a.tier-b.tier || a.cat.localeCompare(b.cat));
            return (
              <div key={t}>
                <div className="font-medium mb-1">{t}</div>
                <div className="space-y-1">
                  {parts.map(p => {
                    const unlocked = (research[t]||1) >= p.tier;
                    return (
                      <div key={p.id} className={`px-2 py-1 rounded border flex items-center justify-between ${unlocked? 'border-emerald-600/30 bg-emerald-900/20':'border-zinc-700 bg-zinc-900 opacity-70'}`}>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-[10px] opacity-70">{p.cat} • T{p.tier}{(()=>{const eff=partEffects(p).join(' • ');return eff?` • ${eff}`:'';})()}</div>
                        </div>
                        <div className="text-lg">{unlocked? '✅':'🔒'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3"><button data-tutorial="tech-close" ref={closeRef as unknown as React.Ref<HTMLButtonElement>} onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-emerald-600">Close</button></div>
      </div>
    </div>
  );
}

export function WinModal({ onRestart, onEndless }:{ onRestart:()=>void; onEndless:()=>void }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 border border-zinc-600 rounded-2xl p-6 text-center">
        <div className="text-2xl font-bold mb-2">You Win!</div>
        <div className="text-sm mb-4">Sector 10 cleared. Congratulations!</div>
        <div className="flex flex-col gap-2">
          <button onClick={onRestart} className="px-4 py-2 rounded-xl bg-emerald-600">Restart Run</button>
          <button onClick={onEndless} className="px-4 py-2 rounded-xl bg-sky-600">Endless War</button>
        </div>
      </div>
    </div>
  );
}

export function MPWinModal({ message, onClose }:{ message:string; onClose:()=>void }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 border border-zinc-600 rounded-2xl p-6 text-center">
        <div className="text-2xl font-bold mb-2">You Win!</div>
        <div className="text-sm mb-4">{message}</div>
        <div className="flex flex-col gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-emerald-600">Return to Lobby</button>
        </div>
      </div>
    </div>
  );
}

export function MatchOverModal({ winnerName, onClose }:{ winnerName: string; onClose:()=>void }){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 border border-zinc-600 rounded-2xl p-6 text-center">
        <div className="text-xl font-bold mb-2">Match Over</div>
        <div className="text-sm mb-4">Winner: <b>{winnerName}</b></div>
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-emerald-600 w-full">Return to Lobby</button>
      </div>
    </div>
  );
}

export function FactionPickModal({ current, onPick, onClose }:{ current?: string; onPick:(factionId:string)=>void; onClose:()=>void }){
  const factions = FACTIONS;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 border border-zinc-600 rounded-2xl p-4">
        <div className="text-lg font-semibold mb-2">Choose Faction</div>
        <div className="max-h-[50vh] overflow-y-auto grid grid-cols-1 gap-2">
          {factions.map((f)=> (
            <button key={f.id} onClick={()=>onPick(f.id)} className={`text-left px-3 py-2 rounded border ${current===f.id?'border-emerald-500 bg-emerald-900/20':'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}>
              <div className="font-medium">{f.name}</div>
              <div className="text-xs opacity-70">{f.description}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded bg-zinc-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}
