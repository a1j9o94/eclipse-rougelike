import { useState } from "react";
import type { ReactElement } from "react";
import type { LegalCommandCandidate } from "../../shared/eclipse/legal";
import type {
  PlayerView,
  DecisionChoice,
  GameCommand,
  PendingDecision,
} from "../../shared/eclipse/types";
import ExplorationDecision from "./ExplorationDecision";
import DiscoveryDecision from "./DiscoveryDecision";
import AncientPartDecision from "./AncientPartDecision";
import EconomyDecision from "./EconomyDecision";
import CombatTurnDecision from "./CombatTurnDecision";
import ColonizationPlanner from "./ColonizationPlanner";
import {
  BombardmentTargets,
  CombatVolleyAllocator,
  InitiativeQueue,
} from "./CombatDecisionVisuals";
interface Props {
  view?: PlayerView;
  targetLabels?: Record<string, string>;
  candidates?: LegalCommandCandidate[];
  decision: PendingDecision;
  reputation: number[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
function activeNeutronBombs(view: PlayerView | undefined, decision: Extract<PendingDecision, { kind: "bombardment" }>): boolean {
  const sector = view?.sectors.find(candidate => candidate.id === decision.sectorId);
  const attacker = view?.seats.find(candidate => candidate.id === decision.owner);
  const defender = view?.seats.find(candidate => candidate.id === sector?.owner);
  const has = (seat: typeof attacker, technology: string) => seat ? Object.values(seat.technologies).some(track => track.includes(technology)) : false;
  return has(attacker, "neutron-bombs") && !has(defender, "neutron-absorber");
}
/** Local state is an editable draft only. The outstanding decision lives in the authoritative view. */
export default function DecisionPanel({
  decision,
  view,
  reputation,
  disabled,
  onSubmit,
  candidates = [],
  targetLabels = {},
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const neutronBombs = decision.kind === "bombardment" && activeNeutronBombs(view, decision);
  const [selected, setSelected] = useState<string[]>(() => neutronBombs && decision.kind === "bombardment" ? decision.squareIds.slice(0, decision.hits) : []);
  const value = (key: string, fallback = "") => values[key] ?? fallback;
  const set = (key: string, next: string) =>
    setValues((v) => ({ ...v, [key]: next }));
  const toggle = (key: string) =>
    setSelected((s) =>
      s.includes(key) ? s.filter((k) => k !== key) : [...s, key],
    );
  let choice: DecisionChoice;
  let valid = true;
  let fields: ReactElement;
  switch (decision.kind) {
    case "exploration":
      return view ? <ExplorationDecision key={decision.id} view={view} decision={decision} disabled={disabled} onSubmit={onSubmit}/> : <p role="alert">The galaxy view is needed to preview this exploration. Reconnect to restore it.</p>;
    case "discovery":
      return <DiscoveryDecision key={decision.id} view={view} decision={decision} disabled={disabled} onSubmit={onSubmit}/>;
    case "ancient-part":
      return view ? <AncientPartDecision key={decision.id} view={view} decision={decision} candidates={candidates} disabled={disabled} onSubmit={onSubmit}/> : <p role="alert">Reconnect to restore your ship blueprints for this installation.</p>;
    case "control":
    case "bankruptcy":
    case "portal-placement":
    case "free-technology":
    case "population-return":
    case "resource-reward":
    case "diplomacy":
    case "diplomacy-window":
    case "reputation":
      return <EconomyDecision decision={decision} view={view} candidates={candidates} reputation={reputation} disabled={disabled} onSubmit={onSubmit} />;
    case "combat-allocation": {
      const dice = decision.dice.filter((d) => d.targets.length);
      valid = dice.every((d) =>
        d.hitTargets?.length === 0
          ? true
          : d.split
            ? d.targets.every(
                (target) =>
                  Number.isInteger(Number(value(`${d.id}/${target}`, "0"))) &&
                  Number(value(`${d.id}/${target}`, "0")) >= 0,
              ) &&
              d.targets.reduce(
                (sum, target) => sum + Number(value(`${d.id}/${target}`, "0")),
                0,
              ) === d.damage
            : d.targets.includes(value(d.id)),
      );
      choice = {
        kind: "combat-allocation",
        allocations: dice.flatMap((d) =>
          d.hitTargets?.length === 0
            ? d.split ? [] : [
                {
                  dieId: d.id,
                  targetId: d.targets[0],
                },
              ]
            : d.split
              ? d.targets
                  .filter(
                    (target) => Number(value(`${d.id}/${target}`, "0")) > 0,
                  )
                  .map((target) => ({
                    dieId: d.id,
                    targetId: target,
                    damage: Number(value(`${d.id}/${target}`, "0")),
                  }))
              : value(d.id)
                ? [{ dieId: d.id, targetId: value(d.id) }]
                : [],
        ),
      };
      fields = <CombatVolleyAllocator view={view} decision={decision} targetLabels={targetLabels} values={values} setValue={set} />;
      break;
    }
    case "retreat":
    case "combat-turn":
      return <CombatTurnDecision key={decision.id} decision={decision} view={view} disabled={disabled} onSubmit={onSubmit}/>;
    case "bombardment":
      valid = selected.length <= decision.hits;
      choice = { kind: "bombardment", squareIds: selected };
      fields = <BombardmentTargets view={view} neutronBombs={neutronBombs} sectorId={decision.sectorId} squareIds={decision.squareIds} selected={selected} hits={decision.hits} onToggle={toggle} onSelect={setSelected} />;
      break;
    case "initiative-order":
      valid = selected.length === decision.groupIds.length;
      choice = { kind: "initiative-order", groupIds: selected };
      fields = <InitiativeQueue view={view} groupIds={decision.groupIds} selected={selected} onToggle={toggle} />;
      break;
    case "colonization":
      return view ? <ColonizationPlanner view={view} candidates={candidates} disabled={disabled} decision={decision} onSubmit={onSubmit} /> : <p role="alert">Reconnect to restore the planet board for this colonization decision.</p>;
  }
  return (
    <section className={`dg-decision ${decision.kind === "combat-allocation" ? "dg-combat-allocation" : ""}`}>
      <p className="sd-eyebrow">YOUR DECISION</p>
      <h2>{decision.kind.replaceAll("-", " ")}</h2>
      {fields}
      <button
        className="sd-primary"
        disabled={disabled || !valid}
        onClick={() =>
          onSubmit({ type: "resolve", decisionId: decision.id, choice })
        }
      >
        {decision.kind === "combat-allocation" ? "Resolve volley" : decision.kind === "bombardment" ? selected.length ? `Confirm: destroy ${selected.length} population` : "Confirm: spare population" : "Confirm choice"}
      </button>
      <p className="sd-muted">
        You may edit this choice until confirmation. Draws and rolls already
        committed cannot be undone.
      </p>
    </section>
  );
}
