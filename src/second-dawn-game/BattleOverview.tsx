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
import { useState } from "react";
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
const colors = {
  red: "#e99b9b",
  blue: "#88cde7",
  green: "#8bd4ad",
  yellow: "#efd27b",
  white: "#e3e7ed",
  black: "#bac0ce",
};
type PublicVolley = NonNullable<GameEvent["combatVolley"]>;
export function CombatPlayback({ volleys, fast = false }: { volleys: readonly PublicVolley[]; fast?: boolean }) {
  const [skipMotion, setSkipMotion] = useState(fast);
  if (!volleys.length) return null;
  return <section className={`dg-combat-playback${skipMotion ? " is-fast" : ""}`} aria-label="Recent combat impacts"><header><div><span>IMPACT LOG</span><strong>{volleys.length} resolved {volleys.length === 1 ? "volley" : "volleys"}</strong></div><button type="button" onClick={() => setSkipMotion(true)} disabled={skipMotion}>{skipMotion ? "Fast playback on" : "Skip volley animation"}</button></header>{volleys.map((volley,index)=><article className="dg-playback-volley" key={`${volley.battleId}:${volley.dice.map(die=>die.id).join(',')}:${index}`}><div className="dg-result-dice">{volley.dice.map(die=><span key={die.id} className={`is-${die.weaponColor??'unknown'}`} aria-label={`Roll ${die.face}, ${die.damage} damage`}><b>{die.face}</b><small>{die.weaponColor&&die.weaponKind?`${die.weaponColor} ${die.weaponKind}`:'weapon unavailable'}</small></span>)}</div><ul>{volley.targets.map(target=><li key={target.id}><strong>{target.id}</strong><span>{target.hpBefore} → {target.hpAfter} HP</span>{target.destroyed&&<b>Destroyed</b>}{target.excess>0&&<small>{target.excess} excess</small>}</li>)}</ul></article>)}</section>;
}
export function NeutralShipSilhouette({
  type,
}: {
  type: "ancient" | "guardian" | "gcds";
}) {
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
export default function BattleOverview({ view, recentVolleys = [], fastPlayback = false }: { view: PlayerView; recentVolleys?: readonly NonNullable<GameEvent["combatVolley"]>[]; fastPlayback?: boolean }) {
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
      <CombatPlayback volleys={recentVolleys} fast={fastPlayback} />
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
                  ? colors[getFaction(seat.faction).color]
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
                          <ShipSilhouette type={type} />
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
