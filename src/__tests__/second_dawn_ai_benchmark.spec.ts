import { writeFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { chooseAiCommand } from "../../shared/eclipse/ai";
import { legalCommands } from "../../shared/eclipse/legal";
import { randomInt, randomSeed } from "../../shared/eclipse/random";
import type { PlayerView, GameCommand } from "../../shared/eclipse/types";
function baseline(view: PlayerView, seed: number): GameCommand {
  const legal = legalCommands(view);
  let candidates = legal;
  if (!view.pendingDecision) {
    const colonies = legal.filter((c) => c.command.type === "colonize");
    if (colonies.length) candidates = colonies;
    else if (view.phase === "upkeep")
      candidates = legal.filter((c) => c.command.type === "finish-upkeep");
    else if (view.actionProgress)
      candidates = legal.filter((c) => c.command.type === "end-action");
    else
      candidates = legal.filter((c) =>
        ["explore", "research", "build", "move", "upgrade", "pass"].includes(
          c.command.type,
        ),
      );
  }
  if (!candidates.length) candidates = legal;
  if (!candidates.length) throw Error("Baseline has no legal candidate.");
  return candidates[randomInt(randomSeed(seed >>> 0), candidates.length).value]
    .command;
}
describe("fixed seed fair AI versus simple random legal-action baseline", () => {
  it("wins more than half of completed paired matches", () => {
    let wins = 0,
      ties = 0;
    const totals: number[] = [];
    for (const seed of [7, 29, 61, 113])
      for (const aiFirst of [true, false]) {
        let s = createGame({
          seed,
          warpPortals: true,
          seats: [
            { id: "a", faction: "terran-directorate", controller: "ai" },
            { id: "b", faction: "hydran", controller: "ai" },
          ],
        });
        const ai = aiFirst ? "a" : "b";
        let steps = 0;
        while (s.phase !== "finished" && steps < 5000) {
          const actor = s.pendingDecision?.owner ?? s.activeSeatId;
          if (!actor) throw Error("No controller.");
          const view = getPlayerView(s, actor);
          const command =
            actor === ai
              ? chooseAiCommand(view, seed + steps)!.command
              : baseline(view, seed * 10000 + steps);
          const result = processGameCommand(s, actor, command);
          if (!result.ok)
            throw Error(`${JSON.stringify(command)}: ${result.error.message}`);
          s = result.state;
          steps++;
        }
        expect(s.phase).toBe("finished");
        const scores = s.engine!.scores!;
        const own = scores.find((score) => score.playerId === ai)!,
          other = scores.find((score) => score.playerId !== ai)!;
        const margin = own.total - other.total;
        totals.push(margin);
        if (
          margin > 0 ||
          (margin === 0 && own.resourceTotal > other.resourceTotal)
        )
          wins++;
        else if (margin === 0 && own.resourceTotal === other.resourceTotal)
          ties++;
      }
    writeFileSync(
      "coding_agents/second_dawn_ai_benchmark.json",
      JSON.stringify(
        {
          seeds: [7, 29, 61, 113],
          pairedSeatSwap: true,
          matches: 8,
          wins,
          ties,
          losses: 8 - wins - ties,
          vpMargins: totals,
          baseline:
            "Uniform random legal main action; colonize when possible; finish one activation; random persisted choices",
          limitations:
            "Small fixed benchmark, not general strength certification",
        },
        null,
        2,
      ) + "\n",
    );
    expect(
      wins + ties * 0.5,
      `wins=${wins}, ties=${ties}, VP margins=${totals}`,
    ).toBeGreaterThan(4);
  }, 60000);
});
