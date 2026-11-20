// node tools/second-dawn-ai-endgame-benchmark.mjs <released-checkout>
// AI_SEEDS=837,1649 AI_MAX_NODES=600 selects the two full-budget Expert controls.
// The frozen policy plays every early round and every opposing seat. Each final
// decision uses the fixture seed and a fixed clock so CPU load cannot change play.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const reference = process.argv[2];
if (!reference) throw new Error('Supply a local checkout of the released commit as the first argument.');
const fixtures = [
  [837, ['lyra', 'eridani', 'exiles']], [1237, ['eridani', 'lyra', 'exiles']],
  [1649, ['hydran', 'lyra']], [2579, ['lyra', 'orion']],
  [3109, ['hydran', 'eridani', 'lyra', 'mechanema']], [5431, ['lyra', 'draco', 'hydran', 'planta']],
  [7331, ['lyra', 'planta']], [10037, ['eridani', 'lyra', 'hydran']],
];
const seeds = process.env.AI_SEEDS?.split(',').map(Number) ?? fixtures.map(([seed]) => seed);
if (seeds.some(seed => !fixtures.some(([id]) => id === seed))) throw new Error('AI_SEEDS must select seeds from the fixture list.');
const difficulty = process.env.AI_DIFFICULTY ?? 'expert';
const maxNodes = Number(process.env.AI_MAX_NODES ?? 24);
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
function finalPosition(rules, seed, factions) {
  // The first two fixtures use the factions' distinct printed player colors.
  const colors = ['red', 'blue', 'white', 'black'];
  let state = rules.createGame({ seed, factionProfile: 'official-v1',
    ruleOptions: { roundLimit: 8, passOrderTurnOrder: true },
    seats: factions.map((faction, i) => ({ id: 's' + i, faction, controller: 'ai',
      ...(seed === 837 || seed === 1237 ? {} : { pieceColor: colors[i] }) })) });
  for (let step = 0; state.round < 8 && state.phase !== 'finished' && step < 4200; step++) {
    const view = rules.getPlayerView(state, actorOf(state));
    state = apply(rules, state, rules.chooseAiCommand(view, seed + step).command);
  }
  if (state.round !== 8 || state.phase !== 'action') throw new Error('Failed to reach the final action phase for seed ' + seed);
  return state;
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

const baseline = await openCheckout(resolve(reference));
try {
  const candidate = await openCheckout(fileURLToPath(new URL('..', import.meta.url)));
  try {
    const results = [];
    for (const [seed, factions] of fixtures.filter(([seed]) => seeds.includes(seed))) {
      const position = finalPosition(baseline, seed, factions);
      results.push({ seed, factions,
        released: play(baseline, baseline, position, seed, false),
        candidate: play(baseline, candidate, position, seed, false),
        immediatePass: play(baseline, baseline, position, seed, true) });
    }
    console.log(JSON.stringify({ difficulty, maxNodes, results }, null, 2));
  } finally {
    await candidate.close();
  }
} finally {
  await baseline.close();
}
