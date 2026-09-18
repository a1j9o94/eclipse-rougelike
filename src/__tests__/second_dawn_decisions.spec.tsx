// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DecisionPanel from "../second-dawn-game/DecisionPanel";
afterEach(cleanup);
describe("persistent match decision controls", () => {
  it("keeps manual combat allocations editable until every target is chosen", () => {
    const submit = vi.fn();
    render(
      <DecisionPanel
        decision={{
          id: "battle",
          owner: "human",
          kind: "combat-allocation",
          battleId: "b1",
          dice: [
            { id: "d1", face: 6, damage: 2, targets: ["enemy1", "enemy2"] },
          ],
        }}
        onSubmit={submit}
        disabled={false}
        reputation={[]}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Confirm choice",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Target enemy2" }));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm choice" }));
    expect(submit).toHaveBeenCalledWith({
      type: "resolve",
      decisionId: "battle",
      choice: {
        kind: "combat-allocation",
        allocations: [{ dieId: "d1", targetId: "enemy2" }],
      },
    });
  });
  it("allows splitting antimatter damage across targets without overallocating", () => {
    const submit = vi.fn();
    render(
      <DecisionPanel
        decision={{
          id: "split",
          owner: "human",
          kind: "combat-allocation",
          battleId: "b1",
          dice: [
            { id: "d1", face: 6, damage: 4, targets: ["a", "b"], split: true },
          ],
        }}
        onSubmit={submit}
        disabled={false}
        reputation={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Increase damage from die 1 to a" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase damage from die 1 to a" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase damage from die 1 to b" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase damage from die 1 to b" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm choice" }));
    expect(submit).toHaveBeenCalledWith({
      type: "resolve",
      decisionId: "split",
      choice: {
        kind: "combat-allocation",
        allocations: [
          { dieId: "d1", targetId: "a", damage: 2 },
          { dieId: "d1", targetId: "b", damage: 2 },
        ],
      },
    });
  });
  it("allows selecting a retreat destination but prevents disconnected submission", () => {
    const submit = vi.fn();
    render(
      <DecisionPanel
        decision={{
          id: "ret",
          owner: "human",
          kind: "retreat",
          battleId: "b1",
          shipIds: ["i1"],
          destinationIds: ["home"],
        }}
        onSubmit={submit}
        disabled={true}
        reputation={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retreat to Sector home" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Confirm choice",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
  it("does not submit an undefined forced retreat when no legal exit remains", () => {
    render(
      <DecisionPanel
        decision={{
          id: "forced-retreat",
          owner: "human",
          kind: "combat-turn",
          battleId: "b1",
          shipType: "interceptor",
          destinationIds: [],
          forcedRetreat: true,
        }}
        onSubmit={vi.fn()}
        disabled={false}
        reputation={[]}
      />,
    );
    expect(screen.getByText(/cannot fire in this stalemate/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm choice" })).toBeDisabled();
  });
});

it("submits an editable post-combat diplomacy offer with the chosen population", () => {
  const submit = vi.fn();
  render(
    <DecisionPanel
      decision={{
        id: "window",
        owner: "human",
        kind: "diplomacy-window",
        eligibleSeatIds: ["ally"],
        populationSources: ["money", "science"],
      }}
      onSubmit={submit}
      disabled={false}
      reputation={[]}
    />,
  );
  expect(screen.queryByRole("radiogroup", { name: "Ambassador population" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: /Civilization/ }));
  fireEvent.click(screen.getByRole("radio", { name: "Science" }));
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Offer ambassadors" }));
  expect(submit).toHaveBeenCalledWith({
    type: "resolve",
    decisionId: "window",
    choice: { kind: "diplomacy-window", offerTo: "ally", resource: "science" },
  });
});

it("automatically allocates a die that cannot hit any target without asking for a meaningless choice", () => {
  const submit = vi.fn();
  render(
    <DecisionPanel
      decision={{
        id: "miss",
        owner: "human",
        kind: "combat-allocation",
        battleId: "b",
        dice: [
          { id: "d", face: 2, damage: 1, targets: ["enemy"], hitTargets: [] },
        ],
      }}
      onSubmit={submit}
      disabled={false}
      reputation={[]}
    />,
  );
  expect(screen.queryByRole("button", { name: /Target enemy/i })).toBeNull();
  expect(screen.getByText(/no hit/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm choice" }));
  expect(submit).toHaveBeenCalledWith({
    type: "resolve",
    decisionId: "miss",
    choice: {
      kind: "combat-allocation",
      allocations: [{ dieId: "d", targetId: "enemy" }],
    },
  });
});

it("uses ship cards and an editable initiative queue instead of raw combat selectors", () => {
  const submit = vi.fn();
  render(
    <DecisionPanel
      decision={{ id: "initiative", owner: "human", kind: "initiative-order", battleId: "b", groupIds: ["g1", "g2"] }}
      reputation={[]}
      disabled={false}
      onSubmit={submit}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add g2 to firing order" }));
  fireEvent.click(screen.getByRole("button", { name: "Add g1 to firing order" }));
  expect(screen.getByRole("button", { name: "Remove g2 from firing order" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Confirm choice" }));
  expect(submit).toHaveBeenCalledWith({
    type: "resolve", decisionId: "initiative", choice: { kind: "initiative-order", groupIds: ["g2", "g1"] },
  });
});

it("uses population target buttons for bombardment", () => {
  const submit = vi.fn();
  render(
    <DecisionPanel
      decision={{ id: "bomb", owner: "human", kind: "bombardment", sectorId: "222", hits: 1, squareIds: ["p0", "p1"] }}
      reputation={[]}
      disabled={false}
      onSubmit={submit}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Target population square p1" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm choice" }));
  expect(submit).toHaveBeenCalledWith({
    type: "resolve", decisionId: "bomb", choice: { kind: "bombardment", squareIds: ["p1"] },
  });
});

it("reveals the discovered reward before asking the player to take it", () => {
  render(<DecisionPanel decision={{id:"found-cache",owner:"human",kind:"discovery",tileId:"materials",options:["keep","use"],sectorId:"sector-1"}} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
  expect(screen.getByRole("heading", {name:"Materials Cache"})).toBeTruthy();
  expect(screen.getByRole("img", {name:/materials.*6|6.*materials/i})).toBeTruthy();
});
