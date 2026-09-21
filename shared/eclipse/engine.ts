import { factionRulesMode } from './gameRules';
import { gameRules } from './gameRules';
import { performDevelopment } from './developments';
import { focusUpkeepDecision, upkeepSeatUnfinished } from './upkeep';
import { buyMinorSpecies } from "./minorSpeciesRules";
import { pauseAutoPass, skipPassedReactionTurns } from './autoPass';
import { FIRST_PASS_MONEY } from './passing';
import { fundingActionCost, fundingOptions } from "./funding";
import { getFaction, tradeQuote } from "./catalog";
import { tradeResources } from "./economy";
import { colonize, performAction } from "./actions";
import {
  breakAggressiveRelations,
  offerDiplomacy,
  resolveGeneralChoice,
} from "./decisions";
import { advanceCombat, resolveCombatChoice } from "./battleEngine";
import { advanceRound, finishUpkeep, resolveAftermathChoice } from "./rounds";
import {
  continuation,
  emit,
  player,
  presentNextDecision,
  requireRule,
  RuleViolation,
  upkeepBalance,
  canBuyActivation,
  paidActivationCost,
} from "./rulesState";
import type {
  GameCommand,
  GameEvent,
  GameState,
  RuleResult,
  Seat,
} from "./types";
import { getPlayerView } from "./protocol";
import { legalCommands } from "./legal";
function nextSeat(state: GameState, seat: Seat): void {
  const i = state.seats.indexOf(seat);
  for (let offset = 1; offset <= state.seats.length; offset++) {
    const next = state.seats[(i + offset) % state.seats.length];
    if (!next.eliminated) {
      state.activeSeatId = next.id;
      return;
    }
  }
  state.activeSeatId = null;
}
function finishAction(state: GameState, seat: Seat, events: GameEvent[]): void {
  const partners = [...seat.ambassadors];
  breakAggressiveRelations(state, seat);
  for (const partner of partners) {
    if (!seat.ambassadors.includes(partner)) pauseAutoPass(state, partner, events);
  }
  state.actionTurnSerial = (state.actionTurnSerial ?? 0) + 1;
  continuation(state).action = null;
  nextSeat(state, seat);
}
function advance(state: GameState, events: GameEvent[]): void {
  if (state.phase === 'upkeep') {
    advanceRound(state, events);
    presentNextDecision(state);
    return;
  }
  if (presentNextDecision(state)) return;
  const action = continuation(state).action;
  if (state.phase === "action" && action?.budgets && action.remaining > 0) {
    const view = getPlayerView(state, action.owner);
    let usable = !!view && legalCommands(view, { perFamilyLimit: 1 }).some(candidate =>
      (candidate.command.type === "move" || candidate.command.type === "build") &&
      (action.budgets?.[candidate.command.type] ?? 0) > 0,
    );
    if (!usable && view && (action.budgets.build ?? 0) > 0) {
      const fundedView = {
        ...view,
        seats: view.seats.map(seat => seat.id === action.owner
          ? { ...seat, resources: { ...seat.resources, materials: 1000 } }
          : seat),
      };
      usable = legalCommands(fundedView, { perFamilyLimit: 64 }).some(candidate =>
        candidate.command.type === "build" && fundingOptions(view, candidate.command).length > 0,
      );
    }
    if (!usable) action.remaining = 0;
  }
  if (state.phase === "action" && action?.remaining === 0 && !canBuyActivation(state, player(state, action.owner))) {
    // Resolve all committed draws/rewards first, then use the same boundary as
    // an explicit finish. A responding opponent never becomes the turn origin.
    finishAction(state, player(state, action.owner), events);
    if (presentNextDecision(state)) return;
  }
  skipPassedReactionTurns(state, events);
  if (state.phase === "combat") {
    if (!advanceCombat(state, events) || presentNextDecision(state)) return;
    advanceRound(state, events);
  } else if (state.phase === "cleanup")
    advanceRound(state, events);
  presentNextDecision(state);
}
/** All changes, including random draws, are committed only after the command succeeds. */
export function processGameCommand(
  input: GameState,
  actor: string,
  command: GameCommand,
): RuleResult {
  const state = structuredClone(input),
    events: GameEvent[] = [];
  try {
    const seat = player(state, actor),
      e = continuation(state);
    requireRule(
      state.phase !== "finished",
      "This game has already been scored.",
      "GAME_FINISHED",
    );
    requireRule(!seat.eliminated, "This seat has been eliminated.");
    if (state.phase === 'upkeep' && command.type !== 'set-auto-pass') {
      requireRule(upkeepSeatUnfinished(state, actor) || command.type === 'resolve', 'You have already completed upkeep.');
      focusUpkeepDecision(state, actor);
    }
    if (command.type === "buy-minor-species") {
      buyMinorSpecies(state, seat, command, events);
    } else if (command.type === "set-auto-pass") {
      requireRule(typeof command.enabled === "boolean", "Choose whether automatic passing is enabled.", "INVALID_COMMAND");
      seat.autoPassUnlessAttacked = command.enabled;
      if (command.enabled) delete seat.autoPassPausedRound;
      emit(events, actor, command.enabled ? "Enabled auto-pass unless attacked." : "Disabled auto-pass unless attacked.");
      // Preferences never resolve choices, run combat, or advance another seat.
      if (command.enabled && state.activeSeatId === actor && seat.passed && state.phase === "action") {
        skipPassedReactionTurns(state, events);
      }
      return { ok: true, state, events };
    } else if (command.type === "trade-and-act") {
      requireRule(
        !state.pendingDecision,
        "Resolve the outstanding choice first.",
        "DECISION_PENDING",
      );
      requireRule(
        state.activeSeatId === actor || upkeepSeatUnfinished(state, actor),
        "Wait for your turn.",
        "NOT_YOUR_TURN",
      );
      requireRule(
        state.phase === "action",
        "Research and building happen during the action phase.",
      );
      requireRule(
        command.action.type === "research" || command.action.type === "build",
        "Only research and build can be funded.",
        "INVALID_COMMAND",
      );
      const cost = fundingActionCost(seat, command.action);
      const resource =
        command.action.type === "research" ? "science" : "materials";
      requireRule(cost !== null, "The action has no valid purchase cost.");
      const shortfall = cost! - seat.resources[resource];
      requireRule(
        shortfall > 0 &&
          command.trades.length > 0 &&
          command.trades.length <= 2,
        "Convert only the resources missing for this action.",
      );
      requireRule(
        new Set(command.trades.map((trade) => trade.from)).size ===
          command.trades.length &&
          command.trades.every(
            (trade) =>
              trade.to === resource &&
              trade.from !== resource &&
              Number.isSafeInteger(trade.amount) &&
              trade.amount > 0,
          ) &&
          command.trades.reduce((total, trade) => total + trade.amount, 0) ===
            shortfall,
        "Conversions must cover exactly the action shortfall using distinct source resources.",
      );
      for (const trade of command.trades) {
        const result = tradeResources(
          seat.resources,
          seat.faction,
          trade.from,
          trade.to,
          trade.amount,
          factionRulesMode(state),
        );
        requireRule(
          result.ok,
          result.ok ? "" : result.message,
          "INSUFFICIENT_RESOURCES",
        );
        seat.resources = result.resources;
        emit(
          events,
          actor,
          `${getFaction(seat.faction).name} gains ${trade.amount} ${trade.to} by trading ${tradeQuote(seat.faction, trade.from, trade.to, trade.amount, factionRulesMode(state))!.input} ${trade.from}.`,
          "resource",
        );
      }
      const result = processGameCommand(state, actor, command.action);
      return result.ok
        ? { ...result, events: [...events, ...result.events] }
        : result;
    } else if (command.type === "trade") {
      requireRule(
        !state.pendingDecision ||
          (state.pendingDecision.kind === "bankruptcy" &&
            state.pendingDecision.owner === actor),
        "Resolve the pending choice before trading.",
        "DECISION_PENDING",
      );
      const result = tradeResources(
        seat.resources,
        seat.faction,
        command.from,
        command.to,
        command.amount,
        factionRulesMode(state),
      );
      requireRule(
        result.ok,
        result.ok ? "" : result.message,
        "INSUFFICIENT_RESOURCES",
      );
      seat.resources = result.resources;
      if (state.pendingDecision?.kind === "bankruptcy") {
        if (upkeepBalance(seat) >= 0) {
          state.pendingDecision = null;
          finishUpkeep(state, actor, events);
        } else state.pendingDecision.shortfall = -upkeepBalance(seat);
      }
      emit(
        events,
        actor,
        `${getFaction(seat.faction).name} trades resources.`,
        "resource",
      );
    } else if (command.type === "convert-colony-ship") {
      requireRule(
        !state.pendingDecision ||
          (state.pendingDecision.kind === "bankruptcy" && state.pendingDecision.owner === actor),
        "Resolve the pending choice before converting a colony ship.",
        "DECISION_PENDING",
      );
      requireRule(state.activeSeatId === actor || upkeepSeatUnfinished(state, actor), "Wait for your turn.", "NOT_YOUR_TURN");
      requireRule(
        (state.phase === "action" || state.phase === "upkeep") &&
          !!getFaction(seat.faction).special?.convertColonyShipToResource,
        "This faction cannot convert colony ships to resources.",
      );
      requireRule(seat.colonyShipsAvailable > 0, "No unused colony ship remains.");
      seat.colonyShipsAvailable--;
      seat.resources[command.resource]++;
      if (state.pendingDecision?.kind === "bankruptcy") {
        if (upkeepBalance(seat) >= 0) {
          state.pendingDecision = null;
          finishUpkeep(state, actor, events);
        } else state.pendingDecision.shortfall = -upkeepBalance(seat);
      }
      emit(events, actor, `Converted a colony ship into 1 ${command.resource}.`, "resource");
    } else if (command.type === "discard-reputation") {
      requireRule(
        !state.pendingDecision ||
          state.pendingDecision.kind === "diplomacy-window" ||
          state.pendingDecision.kind === "diplomacy",
        "Resolve your outstanding choice first.",
        "DECISION_PENDING",
      );
      const hidden = state.privateSeats.find((s) => s.seatId === actor)!;
      requireRule(
        command.values.length > 0,
        "Choose reputation tiles to return.",
      );
      for (const value of command.values) {
        const index = hidden.reputation.indexOf(value);
        requireRule(index >= 0, "You do not own this reputation tile.");
        hidden.reputation.splice(index, 1);
        state.supplies.reputation.push(value);
        if (gameRules(state).publicReputation && state.lessRandom) {
          state.lessRandom.reputationBySeat[actor] = [...hidden.reputation];
          state.lessRandom.reputationSupply.push(value);
        }
      }
      emit(
        events,
        actor,
        "Returned reputation tiles to make room for diplomacy.",
      );
    } else if (command.type === "resolve") {
      const d = state.pendingDecision;
      requireRule(
        !!d && d.id === command.decisionId && d.owner === actor,
        "This decision belongs to another player or is no longer pending.",
        "WRONG_DECISION",
      );
      requireRule(
        d.kind === command.choice.kind,
        "Response does not match the pending choice.",
        "WRONG_DECISION",
      );
      state.pendingDecision = null;
      if (!resolveGeneralChoice(state, seat, d, command.choice)) {
        if (d.kind === "bankruptcy" || d.kind === "bombardment")
          resolveAftermathChoice(state, actor, d, command.choice, events);
        else resolveCombatChoice(state, actor, d, command.choice, events);
      }
      emit(
        events,
        actor,
        `${getFaction(seat.faction).name} resolves ${d.kind}.`,
        "decision",
      );
    } else {
      requireRule(
        !state.pendingDecision,
        "Resolve the outstanding choice first.",
        "DECISION_PENDING",
      );
      requireRule(
        state.activeSeatId === actor || upkeepSeatUnfinished(state, actor),
        "Wait for your turn.",
        "NOT_YOUR_TURN",
      );
      if (command.type === "research-development" || command.type === "quantum-research")
        performDevelopment(state, seat, command, events);
      else if (command.type === "colonize")
        colonize(state, seat, command.placements);
      else if (command.type === "buy-activation") {
        const progress = e.action;
        requireRule(
          state.phase === "action" && !!progress && progress.owner === actor && progress.action === command.action,
          "Buy an activation for the open main action.",
        );
        requireRule(canBuyActivation(state, seat), "This paid activation is unavailable or unaffordable.");
        const cost = paidActivationCost(seat, command.action)!;
        seat.resources.money -= cost;
        progress!.paidBonusUsed = true;
        progress!.remaining++;
        emit(events, actor, `Paid ${cost} money for one additional ${command.action} activation.`, "resource");
      }
      else if (command.type === "offer-diplomacy") {
        requireRule(
          state.phase === "action",
          "Diplomacy is proposed during your action turn or the saved end-of-combat window.",
        );
        offerDiplomacy(state, seat, command.to, command.resource);
      } else if (command.type === "finish-upkeep") {
        requireRule(state.phase === "upkeep", "It is not upkeep.");
        finishUpkeep(state, actor, events);
      } else if (command.type === "end-action") {
        requireRule(
          state.phase === "action" && !!e.action && e.action.owner === actor,
          "There is no open action to finish.",
        );
        finishAction(state, seat, events);
      } else if (command.type === "pass") {
        requireRule(
          state.phase === "action" && !e.action,
          "Finish your open action before passing.",
        );
        seat.passed = true;
        state.actionTurnSerial = (state.actionTurnSerial ?? 0) + 1;
        if (state.firstPasser === null) {
          state.firstPasser = actor;
          state.startSeatId = actor;
          seat.resources.money += FIRST_PASS_MONEY;
        }
        emit(events, actor, `${getFaction(seat.faction).name} passes.`);
        if (state.seats.every((s) => s.passed || s.eliminated)) {
          state.phase = "combat";
          state.activeSeatId = null;
          e.battleSectors = [];
          e.battle = null;
          e.combatInitialized = false;
          e.aftermathDone = [];
          e.aftermath = "bombardment";
        } else nextSeat(state, seat);
      } else
        requireRule(
          performAction(state, seat, command, events),
          "Unsupported command.",
          "INVALID_COMMAND",
        );
    }
    advance(state, events);
    return { ok: true, state, events };
  } catch (error) {
    if (error instanceof RuleViolation)
      return { ok: false, error: error.detail };
    throw error;
  }
}
