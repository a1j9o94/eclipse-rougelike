import {useCombatVolleySounds} from './sound/useCombatVolleySounds';
import {seatColor} from './factionColors';
import { getFaction } from "../../shared/eclipse/catalog";
import {
  deriveBlueprintStats,
  neutralBlueprint,
} from "../../shared/eclipse/blueprints";
import { publicBlueprint } from "../../shared/eclipse/legal";
import type { PlayerView, Ship } from "../../shared/eclipse/types";
import ShipSilhouette from "./ShipSilhouette";
import { StatIcon, type StatIconName } from "./ShipPartStats";
import "./battleOverview.css";
import type { GameEvent } from "../../shared/eclipse/types";
import { useState, useContext } from "react";
import { AtlasArtContext } from './atlasArtContext';
import { AtlasFigurine } from './AtlasArtwork';
import DiceRoll3D from "./DiceRoll3D";
import { useDice3dEnabled } from "./presentationSettings";
const names: Record<Ship["type"], string> = {
  interceptor: "Interceptor",
  cruiser: "Cruiser",
  dreadnought: "Dreadnought",
  starbase: "Starbase",
  ancient: "Ancient",
  guardian: "Guardian",
  gcds: "GCDS",
};
const neutralNames = {
  ancient: "Ancients",
  guardian: "Guardians",
  gcds: "Galactic Center Defense System",
};
type PublicVolley = NonNullable<GameEvent["combatVolley"]>;
/** Draw only recorded firing groups and impacts; old events stay deliberately generic. */
function VolleyScene({ volley, view, knownShips, still, awaitingDice }: {
  volley: PublicVolley;
  view?: PlayerView;
  knownShips: readonly Pick<Ship, "id" | "owner" | "type">[];
  still: boolean;
  awaitingDice: boolean;
}) {
  const firingSeat = view?.seats.find(seat => seat.id === volley.attacker);
  const sourceType = (die: PublicVolley['dice'][number]) => die.sourceShipType ?? knownShips.find(ship => ship.id === die.sourceShipId)?.type ?? view?.ships.find(ship => ship.id === die.sourceShipId)?.type;
  const sourceTypes = [...new Set(volley.dice.map(sourceType))];
  const art = (type: Ship['type'], owner?: string) => type === 'ancient' || type === 'guardian' || type === 'gcds'
    ? <NeutralShipSilhouette type={type}/>
    : <ShipSilhouette type={type} faction={view?.seats.find(seat => seat.id === owner)?.faction}/>;
  return <div className={`dg-volley-scene${still ? ' is-still' : ''}${awaitingDice ? ' is-awaiting-dice' : ''}`} role="group" aria-label="Volley firing and impacts">
    <div className="dg-volley-firing">
      <small>FIRING</small>
      {sourceTypes.map(type => <div className="dg-volley-source" key={type ?? 'unknown'}>
        <span className="dg-volley-source-art">{type ? art(type, volley.attacker) : <StatIcon kind="cannon"/>}</span>
        <strong>{type ? names[type] : 'Firing fleet'}</strong>
        <small>{volley.dice.filter(die => sourceType(die) === type).length} {volley.dice.filter(die => sourceType(die) === type).length === 1 ? 'die' : 'dice'}</small>
      </div>)}
      {firingSeat && <small>{getFaction(firingSeat.faction).name}</small>}
    </div>
    <div className="dg-volley-impact-scene">
      {volley.targets.map(target => {
        const known = knownShips.find(ship => ship.id === target.id) ?? view?.ships.find(ship => ship.id === target.id);
        const type = target.shipType ?? known?.type;
        const owner = target.owner ?? known?.owner;
        const targetSeat = view?.seats.find(seat => seat.id === owner);
        const ownerLabel = targetSeat ? getFaction(targetSeat.faction).name : owner === 'ancient' || owner === 'guardian' || owner === 'gcds' ? neutralNames[owner] : undefined;
        const impacts = volley.impacts.filter(impact => impact.targetId === target.id);
        const hits = impacts.filter(impact => impact.hit).length;
        const misses = impacts.length - hits;
        const outcome = target.destroyed ? 'destroyed' : target.hpAfter < target.hpBefore ? 'damaged' : 'unharmed';
        const name = type ? names[type] : 'Ship';
        const label = `${name}: ${hits} ${hits === 1 ? 'hit' : 'hits'}, ${misses} ${misses === 1 ? 'miss' : 'misses'}, ${outcome === 'unharmed' ? 'no damage' : outcome}`;
        return <div key={target.id} className={`dg-volley-scene-target is-${outcome}`} aria-label={label}>
          <svg className="dg-volley-flight" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
            {impacts.map((impact, index) => {
              const die = volley.dice.find(candidate => candidate.id === impact.dieId);
              const y = 20 + (index % 4) * 10;
              return <path key={`${impact.dieId}:${index}`} data-weapon-color={die?.weaponColor} data-hit={impact.hit} d={impact.hit ? `M0 ${y} L100 35` : `M0 ${y} L100 ${index % 2 ? 67 : 3}`} style={{ animationDelay: `${Math.min(index, 8) * .06}s` }}/>;
            })}
          </svg>
          <span className="dg-volley-scene-target-art">{type ? art(type, target.owner ?? known?.owner) : <StatIcon kind="hull"/>}<span className="dg-volley-impact-flash" aria-hidden="true"/>{target.destroyed && <b className="dg-volley-wreck-mark" aria-hidden="true">×</b>}</span>
          <span className="dg-volley-scene-target-copy"><strong>{name}</strong>{ownerLabel && <small>{ownerLabel}</small>}<b>{target.destroyed ? 'Destroyed' : outcome === 'damaged' ? 'Damaged' : 'No damage'}</b><small>{target.hpBefore} → {target.hpAfter} HP</small></span>
        </div>;
      })}
    </div>
  </div>;
}
/** Public result cards survive the active fleet and battle being removed. */
export function CombatPlayback({ volleys, view, knownShips = [], fast = false, soundEligible = false }: {
  volleys: readonly PublicVolley[];
  view?: PlayerView;
  knownShips?: readonly Pick<Ship, "id" | "owner" | "type">[];
  fast?: boolean;
  soundEligible?: boolean;
}) {
  const [skipMotion, setSkipMotion] = useState(false);
  const [settledRoll, setSettledRoll] = useState<string | null>(null);
  const [dice3dEnabled] = useDice3dEnabled();
  const destroyedCount = new Set(volleys.flatMap(volley => volley.targets.filter(target => target.destroyed).map(target => target.id))).size;
  const isFast = fast || skipMotion;
  const opponentVolleys = volleys.filter(volley => !view || volley.attacker !== view.viewerSeatId);
  const opponentRolls = opponentVolleys.flatMap(volley => volley.dice.map(die => ({ id: die.id, face: die.face, color: die.weaponColor ?? "#bac0ce" })));
  const opponentRollId = JSON.stringify(opponentVolleys.map(volley => [volley.battleId, volley.dice.map(die => [die.id, die.face])]));
  const awaitingDice = dice3dEnabled && !isFast && opponentRolls.length > 0 && settledRoll !== opponentRollId;
  useCombatVolleySounds({volleys,eligible:soundEligible,awaitingDice,skipped:skipMotion});
  if (!volleys.length) return null;
  return (
    <section className={`dg-combat-playback${isFast ? " is-fast" : ""}`} aria-label="Recent combat impacts">
      <header>
        <div>
          <span>BATTLE RESULTS</span>
          <strong role="status" aria-atomic="true">{destroyedCount > 0 ? `${destroyedCount} ${destroyedCount === 1 ? "ship" : "ships"} destroyed` : "Volley resolved"}</strong>
        </div>
        <button type="button" onClick={() => setSkipMotion(true)} disabled={isFast}>{isFast ? "Fast playback on" : "Skip volley animation"}</button>
      </header>
      <DiceRoll3D skipped={skipMotion} rolls={opponentRolls} rollId={opponentRollId} onComplete={() => setSettledRoll(opponentRollId)} enabled={dice3dEnabled && !isFast && opponentRolls.length > 0}>
      {volleys.map((volley, index) => (
        <article className="dg-playback-volley" key={`${volley.battleId}:${volley.dice.map(die => die.id).join(",")}:${index}`}>
          <VolleyScene volley={volley} view={view} knownShips={knownShips} still={isFast} awaitingDice={awaitingDice}/>
          <div className="dg-result-dice">{volley.dice.map(die => <span key={die.id} className={`is-${die.weaponColor ?? "unknown"}`} aria-label={`Roll ${die.face}, ${die.damage} damage`}><b>{die.face}</b><small>{die.weaponColor && die.weaponKind ? `${die.weaponColor} ${die.weaponKind}` : "weapon unavailable"}</small></span>)}</div>
          <ul className="dg-impact-targets">{volley.targets.map(target => {
            const knownShip = knownShips.find(ship => ship.id === target.id) ?? view?.ships.find(ship => ship.id === target.id);
            const type = target.shipType ?? knownShip?.type;
            const owner = target.owner ?? knownShip?.owner;
            const seat = view?.seats.find(candidate => candidate.id === owner);
            const faction = seat ? getFaction(seat.faction) : undefined;
            const ownerLabel = faction?.name ?? (owner === "ancient" || owner === "guardian" || owner === "gcds" ? neutralNames[owner] : owner);
            const title = type ? names[type] : "Ship";
            const outcome = target.destroyed ? "destroyed" : target.hpAfter < target.hpBefore ? "damaged" : "unharmed";
            return <li key={target.id}>
              <div className={`dg-impact-card is-${outcome}`} role="group" aria-label={`${title} ${outcome}`} style={seat ? { borderLeftColor: seatColor(seat) } : undefined}>
                {type && <span className="dg-impact-ship-art">
                  {type === "ancient" || type === "guardian" || type === "gcds" ? <NeutralShipSilhouette type={type} /> : <ShipSilhouette type={type} faction={seat?.faction} />}
                  {target.destroyed && <svg className="dg-impact-destruction-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M16 16l32 32M48 16L16 48" /></svg>}
                </span>}
                <span className="dg-impact-copy"><strong>{title}</strong>{ownerLabel && <small>{ownerLabel}</small>}{!type && <small>{target.id}</small>}<span>{target.hpBefore} → {target.hpAfter} HP{target.excess > 0 && <small> · {target.excess} excess</small>}</span></span>
                <b className="dg-impact-outcome">{target.destroyed ? "Destroyed" : outcome === "damaged" ? "Damaged" : "No damage"}</b>
              </div>
            </li>;
          })}</ul>
        </article>
      ))}
      </DiceRoll3D>
    </section>
  );
}
export function NeutralShipSilhouette({
  type,
}: {
  type: "ancient" | "guardian" | "gcds";
}) {
  const atlas = useContext(AtlasArtContext);
  if (atlas) return <AtlasFigurine type={type} label={`${type === 'gcds' ? 'Galactic Center Defense System' : names[type]} ship silhouette`} className="dg-battle-neutral"/>;
  return (
    <svg
      className="dg-battle-neutral"
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${type === "gcds" ? "Galactic Center Defense System" : names[type]} ship silhouette`}
    >
      <circle cx="40" cy="40" r="36" className="dg-neutral-radar" />
      {type === "ancient" ? (
        <>
          <path
            d="M13 18l15 9-8 18 12 18-22-10-5-17Z M67 18l-15 9 8 18-12 18 22-10 5-17Z M40 13l12 26-12 26-12-26Z"
            className="dg-neutral-hull"
          />
          <path d="M40 27l5 12-5 12-5-12Z" className="dg-neutral-core" />
        </>
      ) : type === "guardian" ? (
        <>
          <path
            d="M40 5l12 27 23 19-8 15-27-9-27 9-8-15 23-19Z"
            className="dg-neutral-hull"
          />
          <path d="M40 20v22L18 56 M40 42l22 14" className="dg-neutral-lines" />
          <circle cx="40" cy="42" r="8" className="dg-neutral-core" />
        </>
      ) : (
        <>
          <circle cx="40" cy="40" r="25" className="dg-neutral-hull" />
          <path
            d="M35 3h10v15H35Z M35 62h10v15H35Z M3 35h15v10H3Z M62 35h15v10H62Z"
            className="dg-neutral-hull"
          />
          <circle cx="40" cy="40" r="16" className="dg-neutral-lines" />
          <circle cx="40" cy="40" r="7" className="dg-neutral-core" />
        </>
      )}
    </svg>
  );
}
function BattleStat({
  icon,
  label,
  value,
  explanation,
}: {
  icon: StatIconName;
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <span
      className="dg-battle-stat"
      role="img"
      aria-label={`${label}: ${value}`}
      title={explanation}
    >
      <StatIcon kind={icon} />
      <b>{value}</b>
    </span>
  );
}
/** Active engagement only; all stats come from the same public blueprints as combat. */
export default function BattleOverview({ view, recentVolleys = [], knownShips = [], fastPlayback = false, soundEligible = false }: { view: PlayerView; recentVolleys?: readonly NonNullable<GameEvent["combatVolley"]>[]; knownShips?: readonly Pick<Ship, "id" | "owner" | "type">[]; fastPlayback?: boolean; soundEligible?: boolean }) {
  const battle = view.battle;
  if (!battle) return null;
  const inSector = view.ships.filter((s) => s.sectorId === battle.sectorId);
  const ownerName = (id: string) => {
    const seat = view.seats.find((s) => s.id === id);
    return seat
      ? getFaction(seat.faction).name
      : id === "ancient" || id === "guardian" || id === "gcds"
        ? neutralNames[id]
        : id;
  };
  const sector = view.sectors.find((s) => s.id === battle.sectorId);
  const waiting = inSector.filter(
    (s) => s.owner !== battle.attacker && s.owner !== battle.defender,
  );
  return (
    <section className="dg-battle-overview" aria-label="Active battle overview">
      <header>
        <h2>Battle · Sector {sector?.tileId ?? battle.sectorId}</h2>
        <span>
          {battle.stage === "missiles"
            ? "Opening missile volley"
            : battle.stage === "engagement"
              ? "Cannon exchange"
              : battle.stage.replaceAll("-", " ")}{" "}
          {battle.engagement > 0 ? `· Round ${battle.engagement}` : ""}
        </span>
      </header>
      <CombatPlayback volleys={recentVolleys} view={view} knownShips={knownShips} fast={fastPlayback} soundEligible={soundEligible} />
      <div className="dg-battle-sides">
        {(
          [
            { role: "Attacker", id: battle.attacker },
            { role: "Defender", id: battle.defender },
          ] as const
        ).map((side) => {
          const seat = view.seats.find((s) => s.id === side.id),
            fleet = inSector.filter((s) => s.owner === side.id),
            types = [...new Set(fleet.map((s) => s.type))];
          return (
            <section
              className="dg-battle-side"
              key={side.role}
              aria-label={`${side.role} fleet: ${ownerName(side.id)}`}
              style={{
                borderColor: seat
                  ? seatColor(seat)
                  : "#c0a56b",
              }}
            >
              <h3>
                <small>{side.role}</small>
                {ownerName(side.id)}
                <span>
                  {fleet.length} {fleet.length === 1 ? "ship" : "ships"}
                </span>
              </h3>
              <div className="dg-battle-classes">
                {types.map((type) => {
                  const ships = fleet.filter((s) => s.type === type),
                    blueprint = seat?.blueprints.find(
                      (b) => b.shipType === type,
                    );
                  const stats =
                    type === "ancient" || type === "guardian" || type === "gcds"
                      ? neutralBlueprint(`${type}-standard`).stats
                      : seat && blueprint
                        ? deriveBlueprintStats(
                            seat.faction,
                            publicBlueprint(blueprint),
                          )
                        : null;
                  const maximum = stats ? stats.hull + 1 : 0,
                    remaining = ships.reduce(
                      (sum, ship) => sum + Math.max(0, maximum - ship.damage),
                      0,
                    );
                  return (
                    <div className="dg-battle-class" key={type}>
                      <div className="dg-battle-ship-art">
                        {type === "ancient" ||
                        type === "guardian" ||
                        type === "gcds" ? (
                          <NeutralShipSilhouette type={type} />
                        ) : (
                          <ShipSilhouette type={type} faction={seat?.faction} />
                        )}
                      </div>
                      <div className="dg-battle-class-info">
                        <strong>
                          {names[type]}
                          {ships.length > 1 ? ` ×${ships.length}` : ""}
                        </strong>
                        {stats ? (
                          <>
                            <div className="dg-battle-stats">
                              <BattleStat
                                icon="hull"
                                label="HP"
                                value={`${remaining}/${maximum * ships.length}`}
                                explanation={`Remaining/maximum hit points for these ${ships.length} ships. Each ship has ${maximum} HP before damage.`}
                              />
                              <BattleStat
                                icon="shield"
                                label="Shield"
                                value={stats.shield ? `−${stats.shield}` : "0"}
                                explanation="Subtract this shield value from enemy attack rolls."
                              />
                              <BattleStat
                                icon="computer"
                                label="Computer"
                                value={`+${stats.computer}`}
                                explanation="Add this computer bonus to attack rolls."
                              />
                              <BattleStat
                                icon="initiative"
                                label="Initiative"
                                value={String(stats.initiative)}
                                explanation="Higher initiative fires earlier. Defender wins ties."
                              />
                            </div>
                            <div className="dg-battle-weapons">
                              {stats.weapons.map((weapon, i) => (
                                <span
                                  key={i}
                                  title={`${weapon.dice} ${weapon.color} ${weapon.kind} dice per ship; each hit deals ${weapon.damage} damage.`}
                                  aria-label={`${weapon.dice} ${weapon.color} ${weapon.kind} dice, ${weapon.damage} damage per hit`}
                                  style={{
                                    color: {
                                      yellow: "#efd27b",
                                      orange: "#eeb180",
                                      blue: "#9bccef",
                                      red: "#e99b9b",
                                    }[weapon.color],
                                  }}
                                >
                                  <StatIcon kind={weapon.kind} />
                                  {weapon.dice}×{weapon.damage}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <small>Blueprint unavailable</small>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {fleet.length === 0 && (
                <p>No surviving ships in this engagement.</p>
              )}
              <details className="dg-battle-conditions">
                <summary>Individual ship condition</summary>
                {fleet.map((ship) => {
                  const bp = seat?.blueprints.find(
                      (b) => b.shipType === ship.type,
                    ),
                    stats =
                      ship.type === "ancient" ||
                      ship.type === "guardian" ||
                      ship.type === "gcds"
                        ? neutralBlueprint(`${ship.type}-standard`).stats
                        : seat && bp
                          ? deriveBlueprintStats(
                              seat.faction,
                              publicBlueprint(bp),
                            )
                          : null;
                  const ordinal =
                    view.ships
                      .filter(
                        (s) => s.owner === ship.owner && s.type === ship.type,
                      )
                      .findIndex((s) => s.id === ship.id) + 1;
                  return (
                    <p key={ship.id}>
                      {names[ship.type]} #{ordinal} ·{" "}
                      {stats
                        ? `${Math.max(0, stats.hull + 1 - ship.damage)}/${stats.hull + 1} HP`
                        : ""}{" "}
                      · {ship.damage} damage
                    </p>
                  );
                })}
              </details>
            </section>
          );
        })}
      </div>
      {waiting.length > 0 && (
        <p className="dg-battle-waiting">
          {waiting.length} other ships await their separate engagement in this
          sector.
        </p>
      )}
    </section>
  );
}
