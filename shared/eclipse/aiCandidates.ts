import { researchedTechnologyIds } from './technologies';
import { shipPartResearched } from './parts';
import { aiWeaponValue } from "./aiWeaponValue";
import { BASE_COMPONENTS, getFaction } from "./catalog";
import { deriveBlueprintStats, effectiveBlueprintParts } from "./blueprints";
import { fundingActionCost, fundingOptions } from "./funding";
import {
  connectionBetween,
  validateMovementPath,
  type MovementShip,
} from "./geometry";
import {
  legalCommands,
  publicBlueprint,
  type LegalCommandCandidate,
} from "./legal";
import { SHIP_PARTS } from "./parts";
import { capacity, mapSector, movementAbilities } from "./rulesState";
import { planBlueprintUpgrade } from "./upgradePlan";
import type { AncientShipPartId } from "./discoveries";
import type { TechnologyId } from "./technologies";
import type { Action, GameCommand, PlayerView } from "./types";

/** Diverse, bounded public-information plans. Their final submission still uses the ordinary rules processor. */
export function generateAiCandidates(
  view: PlayerView,
): LegalCommandCandidate[] {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId);
  const basic = legalCommands(view, { perFamilyLimit: 64 }).filter(
    (candidate) => {
      if (
        !seat ||
        view.pendingDecision?.kind !== "population-return" ||
        view.pendingDecision.destination === "graveyard" ||
        candidate.command.type !== "resolve" ||
        candidate.command.choice.kind !== "population-return"
      )
        return true;
      const counts = { money: 0, science: 0, materials: 0 };
      for (const resource of candidate.command.choice.resources)
        counts[resource]++;
      return (["money", "science", "materials"] as const).every(
        (resource) => counts[resource] <= seat.populationTracks[resource] + 1,
      );
    },
  );
  if (
    !seat ||
    seat.eliminated ||
    view.pendingDecision ||
    view.waitingFor ||
    view.phase !== "action" ||
    view.activeSeatId !== seat.id
  )
    return basic;
  const limit = (action: Action) =>
    view.actionProgress
      ? view.actionProgress.owner === seat.id &&
        (view.actionProgress.budgets ? (view.actionProgress.budgets[action] ?? 0) > 0 : view.actionProgress.action === action)
        ? view.actionProgress.budgets?.[action] ?? view.actionProgress.remaining
        : 0
      : seat.influenceOnTrack > 0 &&
          (!seat.passed || ["move", "build", "upgrade"].includes(action))
        ? capacity(seat, action)
        : 0;
  const result: LegalCommandCandidate[] = [];
  const seen = new Set<string>();
  const add = (command: GameCommand, label: string) => {
    const key = JSON.stringify(command);
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        command,
        label,
        description:
          "Coordinated plan using public information and normal action costs.",
      });
    }
  };
  const techs = researchedTechnologyIds(seat) as TechnologyId[];
  const upgradeLegal = (command: Extract<GameCommand, { type: "upgrade" }>) => {
    let installations = 0;
    for (const next of command.blueprints) {
      const prev = publicBlueprint(
        seat.blueprints.find((b) => b.shipType === next.shipType)!,
      );
      const ancient = [
        ...(seat.storedParts ?? []),
        ...prev.parts,
        ...prev.outsideParts,
      ].filter(
        (id): id is AncientShipPartId =>
          id !== null &&
          SHIP_PARTS.some((p) => p.id === id && p.access.kind === "ancient"),
      );
      const plan = planBlueprintUpgrade(
        seat.faction,
        prev,
        publicBlueprint(next),
        techs,
        ancient,
      );
      if (!plan.ok) return false;
      installations += plan.installations;
    }
    return installations <= limit("upgrade");
  };
  for (const candidate of basic)
    if (candidate.command.type !== "upgrade" || upgradeLegal(candidate.command))
      add(candidate.command, candidate.label);
  const purchase = (
    command: Extract<GameCommand, { type: "research" | "build" }>,
  ) => {
    const cost = fundingActionCost(seat, command);
    if (cost === null) return;
    const resource = command.type === "research" ? "science" : "materials";
    if (cost <= seat.resources[resource])
      add(
        command,
        command.type === "build"
          ? "Build coordinated fleet"
          : "Research technology",
      );
    else
      for (const option of fundingOptions(view, command).filter(
        (_, i, all) =>
          i === 0 || i === all.length - 1 || i === Math.floor(all.length / 2),
      ))
        add(option.command, `Convert resources and ${command.type}`);
  };
  if (limit("research") || limit("build")) {
    const fundedView = {
      ...view,
      seats: view.seats.map((s) =>
        s.id === seat.id
          ? {
              ...s,
              resources: { ...s.resources, science: 1000, materials: 1000 },
            }
          : s,
      ),
    };
    const available = legalCommands(fundedView, { perFamilyLimit: 64 });
    for (const c of available)
      if (c.command.type === "research" || c.command.type === "build")
        purchase(c.command);
    const builds = available.flatMap((c) =>
      c.command.type === "build" ? [c.command.builds[0]] : [],
    );
    if (limit("build") > 1)
      for (const first of builds) {
        const batch = [first];
        // Build ships at a shared staging sector, and never duplicate a structure.
        if (first.component === "orbital" || first.component === "monolith")
          continue;
        const deployed = view.ships.filter(
          (s) => s.owner === seat.id && s.type === first.component,
        ).length;
        for (
          let count = 2;
          count <=
          Math.min(
            limit("build"),
            (getFaction(seat.faction).componentSupply?.[first.component] ?? BASE_COMPONENTS.perColor[first.component]) - deployed,
          );
          count++
        ) {
          batch.push(first);
          purchase({ type: "build", builds: [...batch] });
        }
        for (const second of builds.filter(
          (b) =>
            b.sectorId === first.sectorId && b.component !== first.component,
        ))
          purchase({ type: "build", builds: [first, second] });
      }
  }
  if (limit("move")) {
    const sectors = view.sectors.map(mapSector),
      abilities = movementAbilities(seat);
    const fleet: MovementShip[] = view.ships.map((s) => ({
      id: s.id,
      owner: s.owner,
      sectorId: s.sectorId,
      kind: s.type,
      movement:
        s.owner === seat.id &&
        s.type !== "ancient" &&
        s.type !== "guardian" &&
        s.type !== "gcds"
          ? deriveBlueprintStats(
              seat.faction,
              publicBlueprint(
                seat.blueprints.find((b) => b.shipType === s.type)!,
              ),
            ).movement
          : 0,
    }));
    const neighbors = new Map(
      sectors.map((from) => [
        from.id,
        sectors
          .filter(
            (to) =>
              connectionBetween(from, to, abilities.wormholeGenerator) !==
              "none",
          )
          .map((to) => to.id),
      ]),
    );
    const route = (
      shipId: string,
      target: string,
      current: MovementShip[],
      activations: number,
    ): string[] | null => {
      const ship = current.find((s) => s.id === shipId)!;
      const queue: string[][] = [[]],
        visited = new Set([ship.sectorId]);
      for (let i = 0; i < queue.length; i++) {
        const path = queue[i];
        if (path.length >= ship.movement * activations) continue;
        const from = path.at(-1) ?? ship.sectorId;
        const present = current.map((s) =>
          s.id === shipId ? { ...s, sectorId: from } : s,
        );
        for (const to of neighbors.get(from) ?? []) {
          if (
            visited.has(to) ||
            !validateMovementPath({
              player: seat.id,
              shipId,
              path: [to],
              sectors,
              ships: present,
              abilities,
            }).ok
          )
            continue;
          const next = [...path, to];
          if (to === target) return next;
          visited.add(to);
          queue.push(next);
        }
      }
      return null;
    };
    const mobile = fleet.filter(
      (s) => s.owner === seat.id && s.movement > 0 && s.kind !== "starbase",
    );
    for (const target of sectors) {
      // Both strongest-first and nearest-first allow a fleet to converge from different origins.
      const orders = [
        mobile,
        [...mobile].sort(
          (a, b) => b.movement - a.movement || a.id.localeCompare(b.id),
        ),
      ];
      for (const order of orders) {
        let current = fleet;
        const moves: Extract<GameCommand, { type: "move" }>["moves"] = [];
        for (const ship of order) {
          if (ship.sectorId === target.id || moves.length >= limit("move"))
            continue;
          const path = route(
            ship.id,
            target.id,
            current,
            limit("move") - moves.length,
          );
          if (!path) continue;
          for (let offset = 0; offset < path.length; offset += ship.movement) {
            const segment = path.slice(offset, offset + ship.movement);
            moves.push({ shipId: ship.id, path: segment });
            current = current.map((s) =>
              s.id === ship.id ? { ...s, sectorId: segment.at(-1)! } : s,
            );
          }
          add(
            { type: "move", moves: [...moves] },
            `Move fleet to ${target.id}`,
          );
        }
      }
    }
  }
  if (limit("upgrade") >= 2) {
    const singles = basic.flatMap((c) =>
      c.command.type === "upgrade" && c.command.blueprints.length === 1
        ? [c.command.blueprints[0]]
        : [],
    );
    for (const original of seat.blueprints) {
      const score = (b: typeof original) => {
        const s = deriveBlueprintStats(seat.faction, publicBlueprint(b));
        return (
          s.hull +
          s.computer * 2 +
          s.shield +
          s.movement +
          s.weapons.reduce((n, w) => n + aiWeaponValue(w) * 2, 0)
        );
      };
      const previous = publicBlueprint(original);
      const effective = effectiveBlueprintParts(seat.faction, previous);
      const accessible = SHIP_PARTS.filter(
        (p) =>
          p.placement === "grid" &&
          (p.access.kind === "default" ||
            (p.access.kind === "technology" &&
              shipPartResearched(p, techs))),
      );
      const source = accessible
        .filter((p) => p.energyProduction > 3)
        .sort((a, b) => b.energyProduction - a.energyProduction)[0];
      if (source) {
        const sourceSlots = effective.flatMap((id, index) =>
          id && SHIP_PARTS.find((p) => p.id === id)!.energyProduction > 0
            ? [index]
            : [],
        );
        const consumers = accessible
          .filter((p) => p.energyConsumption > 1)
          .sort(
            (a, b) =>
              b.weapons.reduce((n, w) => n + aiWeaponValue(w), 0) +
              b.computer +
              b.movement -
              (a.weapons.reduce((n, w) => n + aiWeaponValue(w), 0) +
                a.computer +
                a.movement),
          )
          .slice(0, 4);
        for (const sourceSlot of sourceSlots)
          for (const part of consumers)
            for (let slot = 0; slot < previous.parts.length; slot++) {
              if (
                slot === sourceSlot ||
                effective[slot] === part.id ||
                effective[sourceSlot] === source.id
              )
                continue;
              const next = { ...previous, parts: [...previous.parts] };
              next.parts[sourceSlot] = source.id;
              next.parts[slot] = part.id;
              const command: Extract<GameCommand, { type: "upgrade" }> = {
                type: "upgrade",
                blueprints: [next],
              };
              if (upgradeLegal(command))
                add(command, `Power and refit ${original.shipType}`);
            }
      }
      const choices = singles
        .filter((b) => b.shipType === original.shipType)
        .sort((a, b) => score(b) - score(a))
        .slice(0, 12);
      for (let i = 0; i < choices.length; i++)
        for (let j = i + 1; j < choices.length; j++) {
          const a = choices[i],
            b = choices[j];
          const editsA = a.parts.flatMap((id, index) =>
              id !== original.parts[index] ? [index] : [],
            ),
            editsB = b.parts.flatMap((id, index) =>
              id !== original.parts[index] ? [index] : [],
            );
          if (editsA.some((slot) => editsB.includes(slot))) continue;
          const next = {
            ...original,
            parts: original.parts.map((id, slot) =>
              editsA.includes(slot)
                ? a.parts[slot]
                : editsB.includes(slot)
                  ? b.parts[slot]
                  : id,
            ),
          };
          const command: Extract<GameCommand, { type: "upgrade" }> = {
            type: "upgrade",
            blueprints: [next],
          };
          if (upgradeLegal(command)) add(command, `Refit ${original.shipType}`);
        }
    }
  }
  // Preserve representation of every family even on a densely populated late-game board.
  const families = new Map<string, LegalCommandCandidate[]>();
  for (const c of result) {
    const key =
      c.command.type === "trade-and-act"
        ? `funded-${c.command.action.type}`
        : c.command.type;
    const group = families.get(key) ?? [];
    group.push(c);
    families.set(key, group);
  }
  return [...families.values()].flatMap((group) => {
    const compound = group.filter((c) =>
      c.command.type === "move"
        ? c.command.moves.length > 1
        : c.command.type === "build"
          ? c.command.builds.length > 1
          : c.command.type === "upgrade"
            ? c.command.blueprints.some(
                (b) =>
                  b.parts.filter(
                    (id, i) =>
                      id !==
                      seat.blueprints.find(
                        (old) => old.shipType === b.shipType,
                      )!.parts[i],
                  ).length > 1,
              )
            : false,
    );
    const compoundSet = new Set(compound);
    return [
      ...group.filter((c) => !compoundSet.has(c)).slice(0, 48),
      ...compound.slice(0, 48),
    ];
  });
}
