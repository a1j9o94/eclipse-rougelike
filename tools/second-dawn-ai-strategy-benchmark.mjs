import { createServer } from "vite";
import { writeFileSync } from "node:fs";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { createGame } = await server.ssrLoadModule("/shared/eclipse/setup.ts");
  const { getPlayerView } = await server.ssrLoadModule(
    "/shared/eclipse/protocol.ts",
  );
  const { processGameCommand } = await server.ssrLoadModule(
    "/shared/eclipse/engine.ts",
  );
  const { chooseAiCommand } = await server.ssrLoadModule(
    "/shared/eclipse/ai.ts",
  );
  const { chooseLegacyAiCommand, evaluateLegacyAiCommand } =
    await server.ssrLoadModule("/shared/eclipse/aiLegacy.ts");
  const { legalCommands } = await server.ssrLoadModule(
    "/shared/eclipse/legal.ts",
  );
  const results = [],
    timings = [];
  const factions = [
    "terran-directorate",
    "hydran",
    "mechanema",
    "orion",
    "planta",
    "draco",
  ];
  const seeds = (process.env.AI_SEEDS ?? "131,257").split(",").map(Number);
  const counts = (process.env.AI_COUNTS ?? "2,3,4,5,6").split(",").map(Number);
  function play(count, seed, improvedSeat) {
    let state = createGame({
      seed,
      seats: Array.from({ length: count }, (_, i) => ({
        id: `s${i}`,
        faction: factions[(i + seed) % factions.length],
        controller: "ai",
      })),
    });
    let step = 0,
      attacks = 0,
      legacyFallbacks = 0;
    while (state.phase !== "finished" && step < 5000) {
      const actor = state.pendingDecision?.owner ?? state.activeSeatId,
        view = getPlayerView(state, actor),
        began = performance.now(),
        improved = actor === `s${improvedSeat}`;
      const choice = (improved ? chooseAiCommand : chooseLegacyAiCommand)(
        view,
        seed + step,
      );
      if (improved) timings.push(performance.now() - began);
      if (!choice) throw Error(`No choice: ${actor} ${state.phase}`);
      if (improved && choice.command.type === "move")
        attacks += choice.command.moves.filter((move) =>
          view.ships.some(
            (ship) =>
              ship.sectorId === move.path.at(-1) && ship.owner !== actor,
          ),
        ).length;
      let result = processGameCommand(state, actor, choice.command);
      if (!result.ok && !improved) {
        legacyFallbacks++;
        for (const candidate of legalCommands(view).sort(
          (a, b) =>
            evaluateLegacyAiCommand(view, b.command) -
            evaluateLegacyAiCommand(view, a.command),
        )) {
          result = processGameCommand(state, actor, candidate.command);
          if (result.ok) break;
        }
      }
      if (!result.ok)
        throw Error(
          `${improved ? "improved" : "legacy"} ${actor}: ${JSON.stringify(choice.command)}: ${result.error.message}`,
        );
      state = result.state;
      step++;
    }
    if (state.phase !== "finished")
      throw Error(`Did not finish ${count}/${seed}/${improvedSeat}`);
    return {
      scores: state.engine.scores,
      steps: step,
      attacks,
      legacyFallbacks,
    };
  }
  for (const count of counts)
    for (const seed of seeds) {
      const reference = play(count, seed, -1);
      for (const improvedSeat of [0, count - 1]) {
        const game = play(count, seed, improvedSeat),
          own = game.scores.find((s) => s.playerId === `s${improvedSeat}`),
          other = game.scores
            .filter((s) => s.playerId !== own.playerId)
            .sort(
              (a, b) => b.total - a.total || b.resourceTotal - a.resourceTotal,
            )[0];
        const previous = reference.scores.find(
            (s) => s.playerId === own.playerId,
          ),
          previousOther = Math.max(
            ...reference.scores
              .filter((s) => s.playerId !== own.playerId)
              .map((s) => s.total),
          );
        const row = {
          count,
          seed,
          improvedSeat,
          faction: factions[(improvedSeat + seed) % factions.length],
          steps: game.steps,
          legacyFallbacks: game.legacyFallbacks,
          referenceFallbacks: reference.legacyFallbacks,
          attacks: game.attacks,
          score: own.total,
          previousScore: previous.total,
          scoreDelta: own.total - previous.total,
          margin: own.total - other.total,
          previousMargin: previous.total - previousOther,
          marginDelta:
            own.total - other.total - (previous.total - previousOther),
          win:
            own.total > other.total ||
            (own.total === other.total &&
              own.resourceTotal > other.resourceTotal),
        };
        results.push(row);
        console.log(JSON.stringify(row));
      }
    }
  timings.sort((a, b) => a - b);
  const report = {
    results,
    latencyMs: {
      samples: timings.length,
      p50: timings[Math.floor(timings.length * 0.5)],
      p95: timings[Math.floor(timings.length * 0.95)],
      p99: timings[Math.floor(timings.length * 0.99)],
      max: timings.at(-1),
    },
    limitations:
      "Local paired tournament: same seed/faction/seat all-legacy reference, then one improved controller. Seeds131/257 were used in tuning; other seeds are evaluation-only. Invalid old-controller commands fall back to its next highest rated legal candidate, counted explicitly. No hosted/concurrency/cost claim.",
  };
  writeFileSync(
    process.env.AI_BENCHMARK_OUTPUT ??
      "coding_agents/logs/ai_strategy_benchmark.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report.latencyMs));
} finally {
  await server.close();
}
