import { describe, expect, it } from "vitest";
import { projectHistoryEntry } from "../../shared/eclipse/history";
import type { JournalEntry } from "../../shared/eclipse/types";
const entry: JournalEntry = {
  actor: "seat-1",
  request: {
    commandId: "secret-id",
    expectedRevision: 6,
    command: {
      type: "resolve",
      decisionId: "secret-decision",
      choice: { kind: "reputation", kept: [4] },
    },
  },
  receipt: { commandId: "secret-id", revision: 7, eventCount: 2 },
  events: [
    {
      type: "combat",
      seatId: "seat-1",
      visibility: "public",
      message: "Finished selecting a reputation tile.",
    },
    {
      type: "draw",
      seatId: "seat-1",
      visibility: { seatId: "seat-1" },
      message: "Secret draw 4 and 3",
    },
  ],
};
describe("public action history", () => {
  it('counts unique moving ships and explains repeated move activations', () => {
    const repeated = projectHistoryEntry({ ...entry, request: { ...entry.request, command: { type: 'move', moves: [{ shipId: 'one-ship', path: ['middle'] }, { shipId: 'one-ship', path: ['target'] }] } }, events: [] }, [{ id: 'seat-1', faction: 'eridani' }]);
    expect(repeated.summary).toBe('Moved 1 ship · 2 activations');
    const distinct = projectHistoryEntry({ ...entry, request: { ...entry.request, command: { type: 'move', moves: [{ shipId: 'one-ship', path: ['target'] }, { shipId: 'second-ship', path: ['target'] }] } }, events: [] }, [{ id: 'seat-1', faction: 'eridani' }]);
    expect(distinct.summary).toBe('Moved 2 ships');
  });
  it("labels only the authoritative public timeout-AI event and still filters private values", () => {
    const result = projectHistoryEntry(
      {
        ...entry,
        receipt: { ...entry.receipt, eventCount: 3 },
        events: [
          ...entry.events,
          {
            type: "action",
            seatId: "seat-1",
            visibility: "public",
            message: "Normal AI completed this choice after the turn timer expired.",
          },
        ],
      },
      [{ id: "seat-1", faction: "eridani" }],
    );
    expect(result.summary).toBe("AI takeover · Selected reputation");
    expect(result.details).toContain("Normal AI completed this choice after the turn timer expired.");
    expect(JSON.stringify(result)).not.toContain("Secret draw 4 and 3");
  });

  it("keeps only public effects and redacts private choices even for the owner", () => {
    const result = projectHistoryEntry(entry, [
      { id: "seat-1", faction: "eridani" },
    ]);
    expect(result).toMatchObject({
      revision: 7,
      actorName: "Eridani Empire",
      round: null,
      summary: "Selected reputation",
    });
    expect(JSON.stringify(result)).not.toMatch(/secret|Secret|keep|\[4\]/);
    expect(result.details).toEqual(["Finished selecting a reputation tile."]);
  });
  it("uses persisted round and only infers a legacy round from public phase events", () => {
    expect(projectHistoryEntry(entry, [], 3).round).toBe(3);
    expect(
      projectHistoryEntry(
        {
          ...entry,
          events: [
            {
              type: "phase",
              seatId: null,
              visibility: "public",
              message: "Round 5: action phase.",
            },
          ],
        },
        [],
      ).round,
    ).toBe(5);
  });
});
it("names researched public technology and exposes a fixed redacted shape", () => {
  const result = projectHistoryEntry(
    {
      ...entry,
      request: {
        ...entry.request,
        command: { type: "research", tileId: "improved-hull", track: "grid" },
      },
    },
    [],
  );
  expect(result.summary).toBe("Researched Improved Hull");
  expect(Object.keys(result).sort()).toEqual([
    "actorName",
    "actorSeatId",
    "details",
    "presentation",
    "revision",
    "round",
    "summary",
  ]);
  expect(result.presentation).toEqual({ kind: 'research', technologyId: 'improved-hull' });
});
it("describes the received trade amount and public build/move destinations without internal seat IDs", () => {
  const trade = projectHistoryEntry(
    {
      ...entry,
      request: {
        ...entry.request,
        command: { type: "trade", from: "money", to: "science", amount: 2 },
      },
    },
    [],
  );
  expect(trade.summary).toBe("Gained 2 science by trading money");
  const context = {
    sectors: [{ id: "internal-sector", tileId: "222" }],
    ships: [{ id: "internal-ship", type: "cruiser" as const }],
  };
  const build = projectHistoryEntry(
    {
      ...entry,
      request: {
        ...entry.request,
        command: {
          type: "build",
          builds: [{ sectorId: "internal-sector", component: "cruiser" }],
        },
      },
    },
    [],
    1,
    context,
  );
  expect(build.details).toContain("Built cruiser in sector 222.");
  const move = projectHistoryEntry(
    {
      ...entry,
      request: {
        ...entry.request,
        command: {
          type: "move",
          moves: [{ shipId: "internal-ship", path: ["internal-sector"] }],
        },
      },
      events: [
        {
          type: "combat",
          seatId: "seat-1",
          visibility: "public",
          message: "seat-1 attacks seat-2.",
        },
      ],
    },
    [
      { id: "seat-1", faction: "eridani" },
      { id: "seat-2", faction: "planta" },
    ],
    1,
    context,
  );
  expect(move.details).toContain("Moved cruiser to sector 222.");
  expect(move.details).toContain("Eridani Empire attacks Planta.");
});

it('preserves all public volley groups in order and excludes private combat metadata',()=>{
 const first={battleId:'battle',attacker:'a',dice:[],impacts:[],targets:[]};
 const second={...first,attacker:'ancient'};
 const result=projectHistoryEntry({...entry,events:[{type:'combat',seatId:'a',visibility:'public',message:'First',combatVolley:first},{type:'combat',seatId:'ancient',visibility:'public',message:'Second',combatVolley:second},{type:'combat',seatId:'a',visibility:{seatId:'a'},message:'Secret',combatVolley:{...first,battleId:'private'}}]},[]);
 expect(result.combatVolleys).toEqual([first,second]);
 expect(result.combatVolley).toEqual(first);
 expect(JSON.stringify(result)).not.toContain('private');
});
