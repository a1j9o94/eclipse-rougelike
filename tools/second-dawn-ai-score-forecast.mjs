// Run from the repository root. Training seeds were 15001–15036. This checks a separate set.
import { createServer } from 'vite';

const firstSeed = Number(process.env.AI_FIRST_SEED ?? 26001);
const games = Number(process.env.AI_GAMES ?? 12);
if (!Number.isSafeInteger(firstSeed) || firstSeed < 0 || !Number.isSafeInteger(games) || games < 1) {
  throw new RangeError('AI_FIRST_SEED and AI_GAMES must select a nonempty range of nonnegative integer seeds.');
}
const server = await createServer({ configFile: false, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const [{ createGame }, { getPlayerView }, { processGameCommand }, { chooseAiCommand }, { forecastFinalScores }, { scoreSeat }] =
    await Promise.all(['setup', 'protocol', 'engine', 'ai', 'aiEvaluation', 'rounds']
      .map(name => server.ssrLoadModule('/shared/eclipse/' + name + '.ts')));
  const factions = ['lyra', 'orion', 'eridani', 'hydran', 'draco', 'planta', 'mechanema', 'exiles'];
  const colors = ['blue', 'red', 'white', 'black', 'green', 'yellow'];
  const counts = [2, 3, 2, 4, 3, 5, 2, 3, 6];
  const lengths = [6, 10, 8, 4, 8, 6, 12, 4, 8, 10, 8];
  let observations = 0, currentVpError = 0, forecastError = 0;
  for (let game = 0; game < games; game++) {
    const seed = firstSeed + game, roundLimit = lengths[game % lengths.length];
    const seats = Array.from({ length: counts[game % counts.length] }, (_, i) => ({
      id: 's' + i, faction: factions[(game + 3 * i) % factions.length], controller: 'ai', pieceColor: colors[i],
    }));
    let state = createGame({ seed, ruleOptions: { roundLimit }, factionProfile: 'official-v1', seats });
    const samples = new Map();
    for (let step = 0; state.phase !== 'finished' && step < 3000; step++) {
      const actor = state.pendingDecision?.owner ?? state.activeSeatId;
      const view = getPlayerView(state, actor);
      // Sample each seat near the beginning and later in each pre-final round.
      if (state.round < roundLimit && view.phase === 'action' && !view.pendingDecision && !view.actionProgress) {
        const seat = view.seats.find(s => s.id === actor);
        const spent = Object.values(seat.actionDiscs).reduce((sum, discs) => sum + discs, 0);
        const key = [actor, view.round, spent < 2 ? 'early' : 'late'].join('/');
        if (!samples.has(key)) {
          samples.set(key, { actor, currentVp: scoreSeat(state, seat).total,
            forecast: forecastFinalScores(view).find(s => s.seatId === actor).expectedVp });
        }
      }
      const choice = chooseAiCommand(view, seed + step);
      if (!choice) throw new Error('No legal choice on seed ' + seed);
      const result = processGameCommand(state, actor, choice.command);
      if (!result.ok) throw new Error(result.error.message);
      state = result.state;
    }
    if (state.phase !== 'finished') throw new Error('Unfinished game on seed ' + seed);
    for (const sample of samples.values()) {
      const actual = state.engine.scores.find(s => s.playerId === sample.actor).total;
      currentVpError += Math.abs(actual - sample.currentVp);
      forecastError += Math.abs(actual - sample.forecast);
      observations++;
    }
  }
  console.log(JSON.stringify({ firstSeed, games, observations, currentVpMeanAbsoluteError: currentVpError / observations,
    forecastMeanAbsoluteError: forecastError / observations }, null, 2));
} finally {
  await server.close();
}
