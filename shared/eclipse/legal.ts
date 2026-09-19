import { researchCostForSeat, constructionCostForSeat, minorSpeciesPurchaseOptions, getMinorSpecies, hasEmptyAmbassadorSpace } from "./minorSpecies";
import { planBlueprintUpgrade } from "./upgradePlan";
import { BASE_COMPONENTS, factionHasCapability, getFaction, tradeQuote } from "./catalog";
import {
  deriveBlueprintStats,
  effectiveBlueprintParts,
  validateBlueprint,
  type ShipBlueprint,
} from "./blueprints";
import { SHIP_PARTS, type ShipPartId } from "./parts";
import {
  TECHNOLOGIES,
  type TechnologyId,
} from "./technologies";
import type { AncientShipPartId } from "./discoveries";
import {
  adjacentPosition,
  connectionBetween,
  movableShipCount,
  rotatedEdge,
  validateMovementPath,
  type HexEdge,
  type MovementShip,
} from "./geometry";
import { mapSector, movementAbilities, paidActivationCost } from "./rulesState";
import { reputationCapacity } from "./battleEngine";
import { sectorDefinition } from "./sectors";
import type {
  Action,
  Blueprint,
  DecisionChoice,
  GameCommand,
  PlayerView,
  Resource,
  Seat,
  Track,
} from "./types";
export interface LegalCommandCandidate {
  command: GameCommand;
  label: string;
  description: string;
}
const RESOURCES: Resource[] = ["money", "science", "materials"];
const TRACKS: Track[] = ["military", "grid", "nano"];
const has = (seat: Seat, id: string) =>
  Object.values(seat.technologies).some((track) => track.includes(id));
export function publicBlueprint(blueprint: Blueprint): ShipBlueprint {
  return {
    shipType: blueprint.shipType,
    parts: blueprint.parts.map((id) =>
      id === null ? null : (SHIP_PARTS.find((p) => p.id === id)?.id ?? null),
    ),
    outsideParts: (blueprint.outsideParts ?? []).flatMap((id) => {
      const part = SHIP_PARTS.find((p) => p.id === id);
      return part ? [part.id] : [];
    }),
  };
}
export interface LegalCommandLimits {
  perFamilyLimit: number;
}
/** Bounded candidates are generated from the exact seat view used by humans; no hidden snapshot is reconstructed. */
export function legalCommands(
  view: PlayerView,
  limits?: LegalCommandLimits,
): LegalCommandCandidate[] {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId);
  if (
    !seat ||
    seat.eliminated ||
    view.phase === "finished" ||
    view.phase === "setup"
  )
    return [];
  const result: LegalCommandCandidate[] = [];
  const familyCounts = new Map<GameCommand["type"], number>();
  const familyLimit = limits
    ? Math.max(1, Math.min(128, Math.floor(limits.perFamilyLimit)))
    : null;
  const add = (command: GameCommand, label: string, description: string) => {
    const count = familyCounts.get(command.type) ?? 0;
    if (familyLimit === null ? result.length < 500 : count < familyLimit) {
      result.push({ command, label, description });
      familyCounts.set(command.type, count + 1);
    }
  };
  const faction = getFaction(seat.faction);
  const techs = Object.values(seat.technologies)
    .flat()
    .filter((id): id is TechnologyId => TECHNOLOGIES.some((t) => t.id === id));
  const ownShips = view.ships.filter((s) => s.owner === seat.id);
  const controlled = view.sectors.filter((s) => s.owner === seat.id);
  const occupied = (id: string) =>
    view.ships.some(
      (s) =>
        s.sectorId === id &&
        s.owner !== seat.id &&
        !(factionHasCapability(seat.faction, "ancient-coexistence") && s.type === "ancient"),
    );
  const mapped = view.sectors.map(mapSector);
  const abilities = movementAbilities(seat);
  const ships: MovementShip[] = view.ships.map((s) => ({
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
  for (const command of minorSpeciesPurchaseOptions(view)) {
    const tile = getMinorSpecies(command.minorSpeciesId);
    add(command, `Befriend ${tile.name}`, `${tile.cost} money; no action disc or activation.`);
  }
  const decision = view.pendingDecision;
  const trades = () => {
    for (const from of RESOURCES)
      for (const to of RESOURCES) {
        if (from === to) continue;
        for (let amount = 1; amount <= 16; amount++) {
          const quote = tradeQuote(seat.faction, from, to, amount);
          if (!quote || quote.input > seat.resources[from]) continue;
          add(
            { type: "trade", from, to, amount },
            `Trade ${quote.input} ${from} for ${amount} ${to}`,
            "Trade does not spend an action disc or end your turn.",
          );
        }
      }
  };
  if (
    (!decision && !view.waitingFor) ||
    [decision?.kind, view.waitingFor?.kind].some(
      (kind) => kind === "diplomacy" || kind === "diplomacy-window",
    )
  ) {
    for (const points of [...new Set(view.private.reputation)])
      add(
        { type: "discard-reputation", values: [points] },
        `Discard ${points}-point reputation`,
        "Return this reputation tile to free space for an ambassador.",
      );
  }
  if (
    faction.special?.convertColonyShipToResource &&
    seat.colonyShipsAvailable > 0 &&
    view.activeSeatId === seat.id &&
    (view.phase === "action" || view.phase === "upkeep") &&
    (!decision || decision.kind === "bankruptcy")
  )
    for (const resource of RESOURCES)
      add(
        { type: "convert-colony-ship", resource },
        `Convert colony ship to ${resource}`,
        `Flip one unused colony ship to gain 1 ${resource}.`,
      );
  if (decision) {
    if (decision.owner !== seat.id) return result;
    const resolve = (
      choice: DecisionChoice,
      label: string,
      description = "Resolve the saved decision.",
    ) =>
      add(
        { type: "resolve", decisionId: decision.id, choice },
        label,
        description,
      );
    switch (decision.kind) {
      case "exploration":
        if (decision.canDrawAnother)
          resolve(
            {
              kind: "exploration",
              tileId: null,
              rotation: 0,
              drawAnother: true,
            },
            "Draw second Draco sector",
          );
        for (const p of decision.placements)
          resolve(
            { kind: "exploration", ...p },
            `Place ${p.tileId} at ${p.rotation * 60}°`,
          );
        resolve(
          { kind: "exploration", tileId: null, rotation: 0 },
          "Discard sector",
        );
        break;
      case "discovery":
        for (const option of decision.options)
          resolve(
            { kind: "discovery", option },
            option === "keep"
              ? "Keep discovery for 2 VP"
              : "Use discovery effect",
          );
        break;
      case "ancient-part": {
        resolve(
          { kind: "ancient-part", blueprint: null },
          "Store ancient part for later",
        );
        const part = SHIP_PARTS.find((p) => p.id === decision.partId);
        if (!part) break;
        for (const original of seat.blueprints) {
          const previous = publicBlueprint(original);
          const available = [
            ...(seat.storedParts ?? []),
            ...previous.parts,
            ...previous.outsideParts,
            part.id,
          ].filter(
            (id): id is AncientShipPartId =>
              id !== null &&
              SHIP_PARTS.some(
                (p) => p.id === id && p.access.kind === "ancient",
              ),
          );
          for (
            let slot = 0;
            slot < (part.placement === "outside" ? 1 : previous.parts.length);
            slot++
          ) {
            const draft: ShipBlueprint = {
              ...previous,
              parts: [...previous.parts],
              outsideParts: [...previous.outsideParts],
            };
            if (part.placement === "outside") draft.outsideParts.push(part.id);
            else draft.parts[slot] = part.id;
            if (
              validateBlueprint(seat.faction, draft, techs, available, previous)
                .length
            )
              continue;
            resolve(
              { kind: "ancient-part", blueprint: draft },
              `Install ${part.name}: ${original.shipType}${part.placement === "grid" ? ` slot ${slot + 1}` : " outside grid"}`,
              "Free immediate installation; energy and blueprint legality checked.",
            );
          }
        }
        break;
      }
      case "control":
        if (seat.influenceOnTrack > 0)
          resolve(
            { kind: "control", accept: true },
            `Control ${decision.sectorId}`,
            "Place one influence disc.",
          );
        resolve(
          { kind: "control", accept: false },
          "Leave sector uncontrolled",
        );
        break;
      case "diplomacy-window":
        for (const offerTo of decision.eligibleSeatIds)
          for (const resource of decision.populationSources)
            resolve(
              { kind: "diplomacy-window", offerTo, resource },
              `Offer diplomacy to ${getFaction(view.seats.find((s) => s.id === offerTo)!.faction).name}`,
            );
        resolve(
          {
            kind: "diplomacy-window",
            offerTo: null,
            resource: decision.populationSources[0] ?? "money",
          },
          "Finish diplomacy",
        );
        break;
      case "diplomacy":
        for (const resource of decision.populationSources.filter(() => {
          const proposer = view.seats.find((s) => s.id === decision.proposer)!;
          return (
            hasEmptyAmbassadorSpace(seat) && hasEmptyAmbassadorSpace(proposer) &&
            reputationCapacity({
              ...seat,
              ambassadors: [...seat.ambassadors, decision.proposer],
            }) >= view.private.reputation.length &&
            reputationCapacity({
              ...proposer,
              ambassadors: [...proposer.ambassadors, seat.id],
            }) >=
              (view.hiddenTileCounts.find((h) => h.seatId === proposer.id)
                ?.reputation ?? 0)
          );
        }))
          resolve(
            { kind: "diplomacy", accept: true, resource },
            `Accept using ${resource} population`,
          );
        resolve(
          {
            kind: "diplomacy",
            accept: false,
            resource: decision.populationSources[0] ?? "money",
          },
          "Decline diplomacy",
        );
        break;
      case "combat-allocation": {
        // Each offered plan allocates every successful die. Humans may edit the individual targets in the decision panel.
        const targetOrders = [
          ...new Set(decision.dice.flatMap((d) => d.hitTargets ?? d.targets)),
        ];
        for (const preferred of targetOrders.slice(0, 8))
          resolve(
            {
              kind: "combat-allocation",
              allocations: decision.dice
                .filter((d) => d.targets.length)
                .map((d) => ({
                  dieId: d.id,
                  targetId: (d.hitTargets ?? d.targets).includes(preferred)
                    ? preferred
                    : (d.hitTargets?.[0] ?? d.targets[0]),
                })),
            },
            `Allocate hits; prioritize ${preferred}`,
          );
        if (!targetOrders.length)
          resolve(
            {
              kind: "combat-allocation",
              allocations: decision.dice
                .filter((d) => d.targets.length)
                .map((d) => ({ dieId: d.id, targetId: d.targets[0] })),
            },
            "Continue after misses",
          );
        break;
      }
      case "retreat":
        resolve({ kind: "retreat", destinationId: null }, "Stay and fight");
        for (const destinationId of decision.destinationIds)
          resolve(
            { kind: "retreat", destinationId },
            `Retreat to ${destinationId}`,
          );
        break;
      case "combat-turn":
        if (!decision.forcedRetreat)
          resolve({ kind: "combat-turn", retreatTo: null }, "Fire weapons");
        for (const retreatTo of decision.destinationIds)
          resolve(
            { kind: "combat-turn", retreatTo },
            `Declare retreat to ${retreatTo}`,
          );
        break;
      case "reputation":
        resolve({ kind: "reputation" }, "Keep best reputation automatically");
        break;
      case "bankruptcy":
        trades();
        for (const abandonSectorId of decision.abandonableSectorIds)
          resolve(
            { kind: "bankruptcy", abandonSectorId },
            `Abandon ${abandonSectorId}`,
            `Current shortfall ${decision.shortfall}. Income and upkeep will be recalculated.`,
          );
        break;
      case "population-return":
        for (const resource of decision.resources)
          resolve(
            {
              kind: "population-return",
              resources: Array.from({ length: decision.count }, () => resource),
            },
            `Return population to ${resource}`,
          );
        break;
      case "resource-reward":
        for (const resource of RESOURCES)
          resolve(
            {
              kind: "resource-reward",
              resources: Array.from({ length: decision.count }, () => resource),
            },
            `Gain ${decision.count * decision.perChoice} ${resource}`,
          );
        break;
      case "portal-placement":
        for (const sectorId of decision.sectorIds)
          resolve(
            { kind: "portal-placement", sectorId },
            `Place portal in ${sectorId}`,
          );
        break;
      case "free-technology":
        for (const technologyId of decision.technologyIds) {
          const technology = TECHNOLOGIES.find((t) => t.id === technologyId);
          if (!technology) continue;
          for (const track of TRACKS) {
            if (technology.track !== track && technology.track !== "rare")
              continue;
            if (seat.technologies[track].length < 7 && !has(seat, technologyId))
              resolve(
                { kind: "free-technology", technologyId, track },
                `Gain ${technology.name} in ${track}`,
              );
          }
        }
        break;
      case "initiative-order":
        resolve(
          { kind: "initiative-order", groupIds: decision.groupIds },
          "Use listed firing order",
        );
        if (decision.groupIds.length > 1)
          resolve(
            {
              kind: "initiative-order",
              groupIds: [...decision.groupIds].reverse(),
            },
            "Reverse tied firing order",
          );
        break;
      case "bombardment":
        resolve(
          {
            kind: "bombardment",
            squareIds: decision.squareIds.slice(0, decision.hits),
          },
          "Allocate population hits",
        );
        resolve(
          { kind: "bombardment", squareIds: [] },
          "Do not destroy population",
        );
        break;
      case "colonization":
        for (const square of decision.squares)
          for (const resource of square.resources)
            resolve(
              {
                kind: "colonization",
                placements: [
                  {
                    sectorId: square.sectorId,
                    squareId: square.squareId,
                    resource,
                  },
                ],
              },
              `Colonize ${square.sectorId} with ${resource}`,
            );
        resolve(
          { kind: "colonization", placements: [] },
          "Finish colonization",
        );
        break;
    }
    return result;
  }
  if (view.waitingFor) return result;
  trades();

  if (view.activeSeatId !== seat.id) return result;
  if (view.phase !== "action" && view.phase !== "upkeep") return result;
  const progress = view.actionProgress;
  const can = (action: Action) =>
    progress
      ? progress.owner === seat.id &&
        (progress.budgets ? (progress.budgets[action] ?? 0) > 0 : progress.action === action && progress.remaining > 0)
      : seat.influenceOnTrack > 0 &&
        (!seat.passed || ["upgrade", "build", "move"].includes(action));
  if (view.phase === "action" && progress)
    add(
      { type: "end-action" },
      "End action",
      "Finish this action and advance to the next seat.",
    );
  else if (view.phase === "action")
    add(
      { type: "pass" },
      "Pass",
      "Your first pass ends normal actions; later turns allow Build, Upgrade, or Move reactions.",
    );
  if (view.phase === "action" && progress && !progress.paidBonusUsed && progress.owner === seat.id) {
    const cost = paidActivationCost(seat, progress.action);
    if (cost !== null && seat.resources.money >= cost)
      add(
        { type: "buy-activation", action: progress.action },
        `Buy one ${progress.action} activation`,
        `Pay ${cost} money. Available once during this action.`,
      );
  }
  // Colony ships are a free operation during your turn, including after the action activations are spent.
  if (seat.colonyShipsAvailable > 0)
    for (const sector of controlled) {
      if (view.phase === "upkeep" && occupied(sector.id)) continue;
      const definition = sectorDefinition(Number(sector.tileId));
      if (!definition) continue;
      const squares = [
        ...definition.population.map((p, i) => ({
          id: `p${i}`,
          resource: p.resource,
          advanced: p.advanced,
        })),
        ...(sector.orbital
          ? [{ id: "orbital", resource: "gray" as const, advanced: false }]
          : []),
      ];
      for (const square of squares) {
        if (sector.population.some((p) => p.squareId === square.id)) continue;
        const options =
          square.id === "orbital"
            ? (["money", "science"] as Resource[])
            : square.resource === "gray"
              ? RESOURCES
              : [square.resource];
        for (const resource of options) {
          if (seat.populationTracks[resource] >= 11) continue;
          if (
            square.advanced &&
            !has(
              seat,
              {
                money: "advanced-economy",
                science: "advanced-labs",
                materials: "advanced-mining",
              }[resource],
            ) &&
            !has(seat, "metasynthesis")
          )
            continue;
          add(
            {
              type: "colonize",
              placements: [
                { sectorId: sector.id, squareId: square.id, resource },
              ],
            },
            `Colonize ${sector.tileId} · ${resource}`,
            "Use one colony ship. Increase production without an action disc.",
          );
        }
      }
    }
  if (view.phase === "upkeep") {
    add(
      { type: "finish-upkeep" },
      "Finish upkeep",
      "Collect production, pay upkeep, and resolve any shortfall.",
    );
    return result;
  }
  if (can("explore")) {
    const seen = new Set<string>();
    for (const sector of view.sectors) {
      if (
        sector.owner !== seat.id &&
        !(
          ownShips.some((s) => s.sectorId === sector.id) &&
          movableShipCount(seat.id, sector.id, ships, abilities) > 0
        )
      )
        continue;
      for (const edge of sectorDefinition(Number(sector.tileId))?.wormholes ??
        []) {
        const position = adjacentPosition(
          sector.position,
          rotatedEdge(edge, sector.rotation as HexEdge),
        );
        const distance = Math.max(
          Math.abs(position.q),
          Math.abs(position.r),
          Math.abs(position.q + position.r),
        );
        const ring =
          distance <= 1 ? "inner" : distance === 2 ? "middle" : "outer";
        if (view.supplyCounts?.[ring] === 0) continue;
        const key = `${position.q},${position.r}`;
        if (
          seen.has(key) ||
          view.sectors.some(
            (s) => s.position.q === position.q && s.position.r === position.r,
          )
        )
          continue;
        seen.add(key);
        add(
          { type: "explore", position },
          `Explore (${position.q}, ${position.r})`,
          "Use an Explore activation; the hidden draw is committed before placement.",
        );
      }
    }
  }
  if (can("research")) {
    for (const tileId of [...new Set(view.technologyMarket)]) {
      if (tileId === "warp-portal" && controlled.length === 0) continue;
      const technology = TECHNOLOGIES.find((t) => t.id === tileId);
      if (!technology) continue;
      for (const track of TRACKS) {
        const cost = researchCostForSeat(technology.id, track, seat);
        if (cost.ok && seat.resources.science >= cost.scienceCost)
          add(
            { type: "research", tileId, track },
            `Research ${technology.name} · ${track}`,
            `${cost.scienceCost} science after ${cost.discount} track discount.`,
          );
      }
    }
  }
  if (can("build"))
    for (const sector of controlled) {
      for (const component of [
        "interceptor",
        "cruiser",
        "dreadnought",
        "starbase",
        "orbital",
        "monolith",
      ] as const) {
        if (component === "starbase" && !has(seat, "starbase")) continue;
        if (
          component === "orbital" &&
          (!has(seat, "orbital") || sector.orbital)
        )
          continue;
        if (
          component === "monolith" &&
          (!has(seat, "monolith") || sector.monolith)
        )
          continue;
        if (
          component !== "orbital" &&
          component !== "monolith" &&
          ownShips.filter((s) => s.type === component).length >=
            (faction.componentSupply?.[component] ?? BASE_COMPONENTS.perColor[component])
        )
          continue;
        const cost = constructionCostForSeat(seat, component);
        if (seat.resources.materials >= cost)
          add(
            { type: "build", builds: [{ sectorId: sector.id, component }] },
            `Build ${component} at ${sector.tileId}`,
            `${cost} materials; one Build activation.`,
          );
      }
    }
  if (can("move"))
    for (const ship of ships.filter(
      (s) => s.owner === seat.id && s.movement > 0 && s.kind !== "starbase",
    )) {
      const paths: string[][] = [[]];
      const reached = new Set<string>();
      let explored = 0;
      while (paths.length && explored++ < 100) {
        const path = paths.shift()!;
        const from = mapped.find(
          (s) => s.id === (path.at(-1) ?? ship.sectorId),
        )!;
        for (const to of mapped) {
          if (
            to.id === ship.sectorId ||
            path.includes(to.id) ||
            connectionBetween(from, to, abilities.wormholeGenerator) === "none"
          )
            continue;
          const next = [...path, to.id];
          if (
            !validateMovementPath({
              player: seat.id,
              shipId: ship.id,
              path: next,
              sectors: mapped,
              ships,
              abilities,
            }).ok
          )
            continue;
          if (!reached.has(to.id)) {
            reached.add(to.id);
            add(
              { type: "move", moves: [{ shipId: ship.id, path: next }] },
              `Move ${ship.kind} to ${to.id}`,
              `${next.length} / ${ship.movement} range. Connections and pinning checked.`,
            );
          }
          if (next.length < ship.movement) paths.push(next);
        }
      }
    }
  if (can("influence")) {
    if (
      !progress?.coloniesRefreshed &&
      seat.colonyShipsAvailable < faction.colonyShips
    )
      add(
        { type: "influence", removeSectorIds: [], addSectorIds: [] },
        "Refresh colony ships",
        "Refresh up to two colony ships as an Influence action.",
      );
    for (const sector of controlled.filter(
      (s) => !progress?.influenceSectorIds?.includes(s.id),
    ))
      add(
        { type: "influence", removeSectorIds: [sector.id], addSectorIds: [] },
        `Remove control from ${sector.tileId}`,
        "Return an influence disc and resolve population returns.",
      );
    for (const from of controlled.filter(
      (s) => !progress?.influenceSectorIds?.includes(s.id),
    ))
      for (const to of view.sectors.filter(
        (s) =>
          !s.owner &&
          !occupied(s.id) &&
          !progress?.influenceSectorIds?.includes(s.id),
      )) {
        if (
          ownShips.some((s) => s.sectorId === to.id) ||
          view.sectors
            .filter(
              (s) =>
                s.owner === seat.id ||
                ownShips.some((ship) => ship.sectorId === s.id),
            )
            .some(
              (source) =>
                connectionBetween(
                  mapSector(source),
                  mapSector(to),
                  abilities.wormholeGenerator,
                ) !== "none",
            )
        )
          add(
            {
              type: "influence",
              removeSectorIds: [from.id],
              addSectorIds: [to.id],
            },
            `Transfer control: ${from.tileId} → ${to.tileId}`,
            "Return a control disc and place it using connections before the transfer; resolve any population returns.",
          );
      }
    if (seat.influenceOnTrack > (progress ? 0 : 1))
      for (const sector of view.sectors) {
        if (
          sector.owner ||
          occupied(sector.id) ||
          progress?.influenceSectorIds?.includes(sector.id)
        )
          continue;
        if (
          ownShips.some((s) => s.sectorId === sector.id) ||
          view.sectors
            .filter(
              (s) =>
                s.owner === seat.id ||
                ownShips.some((ship) => ship.sectorId === s.id),
            )
            .some(
              (from) =>
                connectionBetween(
                  mapSector(from),
                  mapSector(sector),
                  abilities.wormholeGenerator,
                ) !== "none",
            )
        )
          add(
            {
              type: "influence",
              removeSectorIds: [],
              addSectorIds: [sector.id],
            },
            `Control sector ${sector.tileId}`,
            "Place an influence disc in a connected unoccupied sector.",
          );
      }
  }
  if (can("upgrade")) {
    const ancient = [
      ...(seat.storedParts ?? []),
      ...seat.blueprints
        .flatMap((b) => [...b.parts, ...(b.outsideParts ?? [])])
        .filter((id): id is string => id !== null),
    ].filter((id): id is AncientShipPartId =>
      SHIP_PARTS.some((p) => p.id === id && p.access.kind === "ancient"),
    );
    const parts = SHIP_PARTS.filter(
      (p) =>
        p.placement === "grid" &&
        (p.access.kind === "default" ||
          (p.access.kind === "technology" &&
            techs.includes(p.access.technology)) ||
          (p.access.kind === "ancient" &&
            ancient.includes(p.id as AncientShipPartId))),
    );
    for (const original of seat.blueprints) {
      const localAncient = [
        ...(seat.storedParts ?? []),
        ...original.parts,
        ...(original.outsideParts ?? []),
      ].filter(
        (id): id is AncientShipPartId =>
          id !== null &&
          SHIP_PARTS.some((p) => p.id === id && p.access.kind === "ancient"),
      );
      const previous = publicBlueprint(original);
      for (const part of SHIP_PARTS.filter(
        (p) =>
          p.placement === "outside" &&
          (seat.storedParts ?? []).includes(p.id as AncientShipPartId),
      )) {
        const next = {
          ...previous,
          outsideParts: [...previous.outsideParts, part.id],
        };
        if (
          planBlueprintUpgrade(
            seat.faction,
            previous,
            next,
            techs,
            localAncient,
          ).ok
        )
          add(
            { type: "upgrade", blueprints: [next] },
            `${original.shipType}: install ${part.name} outside grid`,
            "Install a stored ancient part without occupying a grid slot.",
          );
      }
      const effective = effectiveBlueprintParts(seat.faction, previous);
      for (let slot = 0; slot < previous.parts.length; slot++)
        for (const part of parts) {
          if (
            effective[slot] === part.id ||
            (part.access.kind === "ancient" &&
              !localAncient.includes(part.id as AncientShipPartId))
          )
            continue;
          const next: ShipBlueprint = {
            ...previous,
            parts: [...previous.parts],
          };
          next.parts[slot] = part.id as ShipPartId;
          if (
            !planBlueprintUpgrade(
              seat.faction,
              previous,
              next,
              techs,
              localAncient,
            ).ok
          )
            continue;
          add(
            { type: "upgrade", blueprints: [next] },
            `${original.shipType}: slot ${slot + 1} → ${part.name}`,
            "Replace one ship part; blueprint energy, drive, and technology requirements checked.",
          );
        }
    }
  }
  if (view.seats.length >= 4 && !seat.traitor && hasEmptyAmbassadorSpace(seat) && seat.ambassadors.length < faction.capabilities.ambassadorSupply) {
    for (const other of view.seats) {
      if (
        reputationCapacity({
          ...seat,
          ambassadors: [...seat.ambassadors, other.id],
        }) < view.private.reputation.length ||
        reputationCapacity({
          ...other,
          ambassadors: [...other.ambassadors, seat.id],
        }) <
          (view.hiddenTileCounts.find((h) => h.seatId === other.id)
            ?.reputation ?? 0)
      )
        continue;
      if (
        other.id === seat.id ||
        other.eliminated ||
        !hasEmptyAmbassadorSpace(other) ||
        other.traitor ||
        other.ambassadors.length >= getFaction(other.faction).capabilities.ambassadorSupply ||
        seat.ambassadors.includes(other.id)
      )
        continue;
      if (
        !controlled.some((a) =>
          view.sectors.some(
            (b) =>
              b.owner === other.id &&
              connectionBetween(mapSector(a), mapSector(b)) !== "none",
          ),
        )
      )
        continue;
      if (!RESOURCES.some((r) => other.populationTracks[r] < 11)) continue;
      if (
        view.ships.some(
          (ship) =>
            (ship.owner === seat.id || ship.owner === other.id) &&
            view.sectors.some(
              (s) =>
                s.id === ship.sectorId &&
                (s.owner === (ship.owner === seat.id ? other.id : seat.id) ||
                  view.ships.some(
                    (enemy) =>
                      enemy.sectorId === s.id &&
                      enemy.owner ===
                        (ship.owner === seat.id ? other.id : seat.id),
                  )),
            ),
        )
      )
        continue;
      for (const resource of RESOURCES.filter(
        (r) => seat.populationTracks[r] < 11,
      ))
        add(
          { type: "offer-diplomacy", to: other.id, resource },
          `Offer diplomacy to ${getFaction(other.faction).name}`,
          `Exchange ambassadors using ${resource} population.`,
        );
    }
  }
  return result;
}
