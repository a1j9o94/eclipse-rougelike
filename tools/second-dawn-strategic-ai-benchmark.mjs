import { createServer } from "vite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, arch } from "node:os";

const integers = (value, fallback) =>
  (value ?? fallback).split(",").map(Number);
const counts = integers(process.env.AI_COUNTS, "2,3,4,5,6");
const seeds = integers(process.env.AI_SEEDS, "401");
const difficulties = (process.env.AI_DIFFICULTIES ?? "normal,hard").split(",");
const nodeLimits = {
  normal: Number(process.env.AI_NORMAL_NODES ?? 12),
  hard: Number(process.env.AI_HARD_NODES ?? 48),
  expert: Number(process.env.AI_EXPERT_NODES ?? 120),
};
const output =
  process.env.AI_BENCHMARK_OUTPUT ??
  "coding_agents/second_dawn_strategic_ai_benchmark.json";
const opponentPolicy = process.env.AI_OPPONENT ?? "legacy";
if (!["legacy", "fast"].includes(opponentPolicy))
  throw new Error("Invalid opponent policy.");
const maxSteps = Number(process.env.AI_MAX_STEPS ?? 5000);
const matchBudgetMs = Number(process.env.AI_MATCH_BUDGET_MS ?? 180_000);
if (
  counts.some((n) => !Number.isInteger(n) || n < 2 || n > 6) ||
  seeds.some((n) => !Number.isInteger(n) || n < 0) ||
  difficulties.some((level) => !(level in nodeLimits))
)
  throw new Error("Invalid benchmark matrix.");
const sourceFiles = [
  "ai.ts",
  "aiCandidates.ts",
  "aiSearch.ts",
  "aiWorld.ts",
  "aiEvaluation.ts",
  "aiConfig.ts",
  "aiSimulation.ts",
  "aiLegacy.ts",
  "aiLegacySimulation.ts",
  "legal.ts",
];
const hashes = Object.fromEntries(
  sourceFiles.map((name) => [
    name,
    createHash("sha256")
      .update(readFileSync(`shared/eclipse/${name}`))
      .digest("hex"),
  ]),
);
const summary = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (percentile) =>
    sorted.length
      ? sorted[
          Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))
        ]
      : null;
  return {
    samples: sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: sorted.at(-1) ?? null,
  };
};
const timings = Object.fromEntries(
  difficulties.map((level) => [
    level,
    { all: [], searched: [], depths: [], nodes: [] },
  ]),
);
const report = {
  startedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model,
  },
  configuration: {
    opponentPolicy,
    counts,
    seeds,
    difficulties,
    nodeLimits,
    matchBudgetMs,
    maxSteps,
    clock:
      "Fixed now() = 0: deterministic work budgets, measured external wall clock. Not production deadline behavior.",
  },
  sourceHashes: hashes,
  warmProfile: [],
  results: [],
  latencyMs: {},
  sampledPeakRssMb: 0,
  limitations: [
    "Local bounded exploratory search tournament; no hosted or concurrency/cost claim. Sampled RSS includes Vite SSR and the harness, not just the deployed planner.",
    "Seeds were selected separately from development fixtures and heuristic tuning seeds. They stop being held out if used for subsequent tuning.",
    "One strategic seat faces frozen prior heuristic AI. Prior AI uses current shared legal generation; inherited illegal choices are rejected and next highest legacy-scored legal command selected, with fallback counts recorded.",
    "Exact work caps are recorded in configuration. Runs with reduced caps test search-controlled completion, not full-strength certification; fixed clocks do not test production deadline behavior.",
    "Two or three sampled worlds and narrow beam search are approximations, not exhaustive minimax or complete hidden-state reconstruction.",
  ],
};
const update = () => {
  report.sampledPeakRssMb = Math.max(
    report.sampledPeakRssMb,
    process.memoryUsage().rss / 1024 / 1024,
  );
  report.latencyMs = Object.fromEntries(
    difficulties.map((level) => [
      level,
      {
        allCommands: summary(timings[level].all),
        searchedCommands: summary(timings[level].searched),
        completedDepth: summary(timings[level].depths),
        nodes: summary(timings[level].nodes),
      },
    ]),
  );
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
};
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
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
  const { chooseStrategicAiCommand } = await server.ssrLoadModule(
    "/shared/eclipse/aiSearch.ts",
  );
  const { chooseLegacyAiCommand, evaluateLegacyAiCommand } =
    await server.ssrLoadModule("/shared/eclipse/aiLegacy.ts");
  const { legalCommands } = await server.ssrLoadModule(
    "/shared/eclipse/legal.ts",
  );
  const factions = [
    "eridani",
    "hydran",
    "mechanema",
    "orion",
    "planta",
    "draco",
  ];
  report.configuration.factionRing = factions;
  const makeGame = (count, seed) =>
    createGame({
      seed,
      seats: Array.from({ length: count }, (_, index) => ({
        id: `s${index}`,
        faction: factions[(index + seed) % factions.length],
        controller: "ai",
      })),
    });
  const settings = (difficulty) => ({
    difficulty,
    maxNodes: nodeLimits[difficulty],
    now: () => 0,
  });
  for (const difficulty of difficulties) {
    const view = getPlayerView(makeGame(2, seeds[0]), "s0");
    chooseStrategicAiCommand(view, 9001, settings(difficulty));
    const elapsed = [];
    for (let trial = 0; trial < 5; trial++) {
      const started = performance.now();
      const result = chooseStrategicAiCommand(view, 9001, settings(difficulty));
      elapsed.push(performance.now() - started);
      if (!result) throw new Error("No warm-profile command.");
    }
    report.warmProfile.push({
      difficulty,
      fixture: "two-seat opening",
      maxNodes: nodeLimits[difficulty],
      latencyMs: summary(elapsed),
    });
  }
  update();
  for (const difficulty of difficulties)
    for (const count of counts)
      for (const seed of seeds)
        for (const searchSeat of process.env.AI_SEAT_ONLY === "first"
          ? [0]
          : [0, count - 1]) {
          let state = makeGame(count, seed),
            step = 0,
            attacks = 0,
            legacyFallbacks = 0,
            currentRound = 0;
          let researchCount = 0,
            buildCount = 0,
            bankruptcyChoices = 0,
            searchCalls = 0,
            deepest = 0;
          const started = performance.now(),
            choiceTimes = [],
            searchedTimes = [],
            faction = state.seats[searchSeat].faction;
          const row = {
            difficulty,
            count,
            seed,
            searchSeat,
            faction,
            maxNodes: nodeLimits[difficulty],
            finished: false,
            steps: 0,
            error: null,
          };
          try {
            while (state.phase !== "finished" && step < maxSteps) {
              if (performance.now() - started > matchBudgetMs)
                throw new Error("Match wall-time budget exhausted.");
              const actor = state.pendingDecision?.owner ?? state.activeSeatId;
              if (!actor) throw new Error(`No actor in ${state.phase}.`);
              const view = getPlayerView(state, actor),
                strategic = actor === `s${searchSeat}`;
              const began = performance.now();
              const choice = strategic
                ? chooseStrategicAiCommand(
                    view,
                    seed + step,
                    settings(difficulty),
                  )
                : (opponentPolicy === "fast"
                    ? chooseAiCommand
                    : chooseLegacyAiCommand)(view, seed + step);
              const elapsed = performance.now() - began;
              if (!choice)
                throw new Error(
                  `No ${strategic ? "strategic" : opponentPolicy} candidate for ${actor} in ${state.phase}.`,
                );
              if (strategic) {
                choiceTimes.push(elapsed);
                timings[difficulty].all.push(elapsed);
                if (choice.search.nodes) {
                  searchedTimes.push(elapsed);
                  timings[difficulty].searched.push(elapsed);
                  timings[difficulty].depths.push(choice.search.completedDepth);
                  timings[difficulty].nodes.push(choice.search.nodes);
                  searchCalls++;
                  deepest = Math.max(deepest, choice.search.completedDepth);
                }
                const command =
                  choice.command.type === "trade-and-act"
                    ? choice.command.action
                    : choice.command;
                if (command.type === "move")
                  attacks += command.moves.filter((move) =>
                    view.ships.some(
                      (ship) =>
                        ship.sectorId === move.path.at(-1) &&
                        ship.owner !== actor,
                    ),
                  ).length;
                if (command.type === "research") researchCount++;
                if (command.type === "build")
                  buildCount += command.builds.filter(
                    (build) =>
                      !["orbital", "monolith"].includes(build.component),
                  ).length;
                if (
                  command.type === "resolve" &&
                  command.choice.kind === "bankruptcy"
                )
                  bankruptcyChoices++;
              }
              let result = processGameCommand(state, actor, choice.command);
              if (!result.ok && !strategic && opponentPolicy === "legacy") {
                legacyFallbacks++;
                const candidates = legalCommands(view).sort(
                  (a, b) =>
                    evaluateLegacyAiCommand(view, b.command) -
                    evaluateLegacyAiCommand(view, a.command),
                );
                for (const candidate of candidates) {
                  result = processGameCommand(state, actor, candidate.command);
                  if (result.ok) break;
                }
              }
              if (!result.ok)
                throw new Error(
                  `${strategic ? "Strategic" : opponentPolicy} illegal command ${JSON.stringify(choice.command)}: ${result.error.message}`,
                );
              state = result.state;
              for (const seat of state.seats)
                if (
                  Object.values(seat.resources).some(
                    (amount) => !Number.isInteger(amount) || amount < 0,
                  )
                )
                  throw new Error("Invalid resources after accepted command.");
              step++;
              if (currentRound !== state.round) {
                currentRound = state.round;
                console.log(
                  JSON.stringify({
                    progress: true,
                    difficulty,
                    count,
                    seed,
                    searchSeat,
                    round: currentRound,
                    steps: step,
                    elapsedMs: Math.round(performance.now() - started),
                  }),
                );
                update();
              }
            }
            if (state.phase !== "finished")
              throw new Error("Command limit exhausted before scoring.");
            const scores = state.engine?.scores;
            if (
              scores?.length !== count ||
              scores.some((score) => !Number.isInteger(score.total))
            )
              throw new Error("Invalid final scoring.");
            const own = scores.find(
              (score) => score.playerId === `s${searchSeat}`,
            );
            const leader = scores
              .filter((score) => score.playerId !== own.playerId)
              .sort(
                (a, b) =>
                  b.total - a.total || b.resourceTotal - a.resourceTotal,
              )[0];
            Object.assign(row, {
              finished: true,
              score: own.total,
              margin: own.total - leader.total,
              win:
                own.total > leader.total ||
                (own.total === leader.total &&
                  own.resourceTotal > leader.resourceTotal),
              tie:
                own.total === leader.total &&
                own.resourceTotal === leader.resourceTotal,
              finalScores: scores.map((score) => ({
                seat: score.playerId,
                total: score.total,
                resourceTotal: score.resourceTotal,
              })),
            });
          } catch (error) {
            row.error = error instanceof Error ? error.message : String(error);
            row.errorStack = error instanceof Error ? error.stack : null;
          }
          Object.assign(row, {
            steps: step,
            round: state.round,
            elapsedMs: performance.now() - started,
            attacks,
            researchCount,
            buildCount,
            bankruptcyChoices,
            legacyFallbacks,
            searchCalls,
            deepestCompletedDepth: deepest,
            latencyMs: summary(choiceTimes),
            searchLatencyMs: summary(searchedTimes),
          });
          report.results.push(row);
          update();
          console.log(JSON.stringify(row));
        }
  report.finishedAt = new Date().toISOString();
  report.sourceChangedDuringRun = sourceFiles.filter(
    (name) =>
      createHash("sha256")
        .update(readFileSync(`shared/eclipse/${name}`))
        .digest("hex") !== hashes[name],
  );
  update();
  const completed = report.results.filter((row) => row.finished);
  console.log(
    JSON.stringify({
      completed: completed.length,
      attempted: report.results.length,
      wins: completed.filter((row) => row.win).length,
      output,
    }),
  );
  if (completed.length !== report.results.length) process.exitCode = 1;
} finally {
  await server.close();
}
