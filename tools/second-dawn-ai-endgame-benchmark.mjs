// node tools/second-dawn-ai-endgame-benchmark.mjs <released-checkout>
// AI_BENCHMARK_MODE=midgame compares the first two searched decisions from eight midgame positions.
// AI_SEEDS=837,1649 AI_MAX_NODES=600 selects the two full-budget Expert controls.
// The frozen policy plays every early round and every opposing seat. Each final
// decision uses the fixture seed and a fixed clock so CPU load cannot change play.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const reference = process.argv[2];
if (!reference) throw new Error('Supply a local checkout of the released commit as the first argument.');
const mode = process.env.AI_BENCHMARK_MODE ?? 'endgame';
if (!['endgame', 'midgame'].includes(mode)) throw new Error('AI_BENCHMARK_MODE must be endgame or midgame.');
const endgameFixtures = [
  [837, ['lyra', 'eridani', 'exiles']], [1237, ['eridani', 'lyra', 'exiles']],
  [1649, ['hydran', 'lyra']], [2579, ['lyra', 'orion']],
  [3109, ['hydran', 'eridani', 'lyra', 'mechanema']], [5431, ['lyra', 'draco', 'hydran', 'planta']],
  [7331, ['lyra', 'planta']], [10037, ['eridani', 'lyra', 'hydran']],
];
// Each seed supplies a Hard and an Expert focal seat, listed in that order.
const midgameFixtures = [
  [202611201, ['hydran', 'orion'], 3, [0, 1]],
  [202611213, ['lyra', 'eridani', 'planta'], 4, [2, 0]],
  [202611227, ['exiles', 'mechanema', 'draco', 'orion'], 5, [1, 3]],
  [202611239, ['planta', 'hydran', 'eridani'], 6, [2, 1]],
];
const fixtures = mode === 'midgame' ? midgameFixtures : endgameFixtures;
const seeds = process.env.AI_SEEDS?.split(',').map(Number) ?? fixtures.map(([seed]) => seed);
if (seeds.some(seed => !fixtures.some(([id]) => id === seed))) throw new Error('AI_SEEDS must select seeds from the fixture list.');
const difficulty = process.env.AI_DIFFICULTY ?? 'expert';
const maxNodes = Number(process.env.AI_MAX_NODES ?? (mode === 'midgame' ? 32 : 24));
if (!['normal', 'hard', 'expert'].includes(difficulty) || !Number.isInteger(maxNodes) || maxNodes < 0)
  throw new Error('Select a valid AI_DIFFICULTY and a nonnegative integer AI_MAX_NODES.');

async function openCheckout(root) {
  const server = await createServer({ root, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
  try {
    const modules = await Promise.all(['setup', 'protocol', 'engine', 'ai', 'aiSearch'].map(
      name => server.ssrLoadModule('/shared/eclipse/' + name + '.ts')));
    return { ...Object.assign({}, ...modules), close: () => server.close() };
  } catch (error) {
    await server.close();
    throw error;
  }
}

const actorOf = state => state.pendingDecision?.owner ?? state.activeSeatId;
function apply(rules, state, command) {
  const result = rules.processGameCommand(state, actorOf(state), command);
  if (!result.ok) throw new Error(JSON.stringify(command) + ' ' + result.error.message);
  return result.state;
}
function ordinaryTurn(state, seatId) {
  return state.activeSeatId === seatId && state.phase === 'action' && !state.pendingDecision && !state.engine.action
    && !state.seats.find(seat => seat.id === seatId).passed;
}

function startingPosition(rules, seed, factions, round = 8, focalSeat) {
  // The first two fixtures use the factions' distinct printed player colors.
  const colors = ['red', 'blue', 'white', 'black'];
  let state = rules.createGame({ seed, factionProfile: 'official-v1',
    ...(focalSeat ? { warpPortals: true, riftCannons: true, randomizeStartingPositions: true } : {}),
    ruleOptions: { roundLimit: 8, passOrderTurnOrder: true },
    seats: factions.map((faction, i) => ({ id: 's' + i, faction, controller: 'ai',
      ...(seed === 837 || seed === 1237 ? {} : { pieceColor: colors[i] }) })) });
  for (let step = 0; state.phase !== 'finished' && step < 4200; step++) {
    if (state.round === round && state.phase === 'action' && (!focalSeat || ordinaryTurn(state, focalSeat))) return state;
    const view = rules.getPlayerView(state, actorOf(state));
    state = apply(rules, state, rules.chooseAiCommand(view, seed + step).command);
  }
  throw new Error('Failed to reach the target round for seed ' + seed);
}
function play(rules, policy, position, seed, stop) {
  let state = position;
  const hero = state.seats.find(seat => seat.faction === 'lyra').id;
  let influenceStarts = 0, bankruptcyReleases = 0, decisionMs = 0, decisions = 0, steps = 0;
  for (; state.phase !== 'finished' && steps < 1000; steps++) {
    const actor = actorOf(state);
    const view = rules.getPlayerView(state, actor);
    let command;
    if (actor === hero) {
      const began = performance.now();
      const canPass = state.phase === 'action' && !state.engine.action && !state.pendingDecision &&
        !state.seats.find(seat => seat.id === hero).passed;
      command = stop && canPass ? { type: 'pass' } :
        policy.chooseStrategicAiCommand(view, seed, { difficulty, maxNodes, now: () => 0 }).command;
      decisionMs += performance.now() - began;
      decisions++;
      if (command.type === 'influence' && !state.engine.action) influenceStarts++;
      if (command.type === 'resolve' && command.choice.kind === 'bankruptcy') bankruptcyReleases++;
    } else {
      command = rules.chooseAiCommand(view, seed).command;
    }
    state = apply(rules, state, command);
  }
  if (state.phase !== 'finished') throw new Error('Unfinished endgame for seed ' + seed);
  const scores = state.engine.scores;
  const own = scores.find(score => score.playerId === hero);
  return { vp: own.total, resources: own.resourceTotal,
    margin: own.total - Math.max(...scores.filter(score => score.playerId !== hero).map(score => score.total)),
    sectors: state.sectors.filter(sector => sector.owner === hero).length,
    influenceStarts, bankruptcyReleases, decisions, decisionMs: Math.round(decisionMs) };
}

// Only the two focal decisions use the policy under test. Freeze every other
// command, including those of the focal seat, and play through authoritative scoring.
function playMidgame(rules, policy, position, seed, hero, level) {
  let state = position;
  const searches = [];
  for (let step = 0; state.phase !== 'finished' && step < 4200; step++) {
    const actor = actorOf(state);
    const view = rules.getPlayerView(state, actor);
    const decisionSeed = (seed + Number(actor.slice(1)) * 389) >>> 0;
    let command;
    if (state.round < 8 && searches.length < 2 && ordinaryTurn(state, hero)) {
      const start = performance.now();
      const choice = policy.chooseStrategicAiCommand(view, decisionSeed, { difficulty: level, maxNodes, now: () => 0 });
      command = choice.command;
      if (choice.search.nodes > 0) searches.push({
        round: state.round, command, depth: choice.search.completedDepth, nodes: choice.search.nodes,
        forecast: choice.search.forecast, elapsedMs: Math.round(performance.now() - start),
      });
    } else {
      command = rules.chooseAiCommand(view, decisionSeed).command;
    }
    state = apply(rules, state, command);
  }
  if (state.phase !== 'finished') throw new Error('Unfinished midgame trial for seed ' + seed);
  const mine = state.engine.scores.find(score => score.playerId === hero);
  const opponents = state.engine.scores.filter(score => score.playerId !== hero);
  const leader = Math.max(...opponents.map(score => score.total));
  const resourceLeader = Math.max(...opponents.filter(score => score.total === leader).map(score => score.resourceTotal));
  const margin = mine.total - leader;
  let result = Math.sign(margin);
  if (result === 0) result = Math.sign(mine.resourceTotal - resourceLeader);
  return { vp: mine.total, resources: mine.resourceTotal, margin, result, searches };
}

const baseline = await openCheckout(resolve(reference));
try {
  const candidate = await openCheckout(fileURLToPath(new URL('..', import.meta.url)));
  try {
    const results = [];
    for (const [seed, factions, round, seats] of fixtures.filter(([seed]) => seeds.includes(seed))) {
      if (mode === 'midgame') {
        for (const [index, seat] of seats.entries()) {
          const hero = 's' + seat;
          const level = process.env.AI_DIFFICULTY ?? (index === 0 ? 'hard' : 'expert');
          const position = startingPosition(baseline, seed, factions, round, hero);
          results.push({ seed, factions, round, hero, difficulty: level,
            released: playMidgame(baseline, baseline, position, seed, hero, level),
            candidate: playMidgame(baseline, candidate, position, seed, hero, level) });
        }
        continue;
      }
      const position = startingPosition(baseline, seed, factions);
      results.push({ seed, factions,
        released: play(baseline, baseline, position, seed, false),
        candidate: play(baseline, candidate, position, seed, false),
        immediatePass: play(baseline, baseline, position, seed, true) });
    }
    const configuration = mode === 'midgame' ? { mode, searchedDecisions: 2 } : { difficulty };
    console.log(JSON.stringify({ ...configuration, maxNodes, results }, null, 2));
  } finally {
    await candidate.close();
  }
} finally {
  await baseline.close();
}
