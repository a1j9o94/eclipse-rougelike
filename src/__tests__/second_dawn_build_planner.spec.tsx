import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import BuildPlanner from "../second-dawn-game/BuildPlanner";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { processGameCommand } from "../../shared/eclipse/engine";
import type { GameCommand } from "../../shared/eclipse/types";
const fixture = () => {
  const state = createGame({
    seed: 42,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
  state.activeSeatId = "a";
  state.seats[0].resources = { money: 20, materials: 20, science: 0 };
  return {
    state,
    view: getPlayerView(state, "a")!,
    sectorId: state.sectors.find((s) => s.owner === "a")!.id,
  };
};
describe("visual build planner", () => {
  it("submits one real multi-ship order and respects the activation budget", () => {
    const f = fixture();
    const submit = vi.fn();
    render(
      <BuildPlanner
        {...f}
        disabled={false}
        onClose={() => {}}
        onSubmit={submit}
      />,
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Add interceptor" }));
    fireEvent.click(screen.getByRole("button", { name: "Add cruiser" }));
    expect(
      screen.getByRole("button", { name: "Add interceptor" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm build" }));
    expect(submit).toHaveBeenCalledTimes(1);
    const command = submit.mock.calls[0][0] as GameCommand;
    expect(command).toMatchObject({
      type: "build",
      builds: [{ component: "interceptor" }, { component: "cruiser" }],
    });
    expect(processGameCommand(f.state, "a", command).ok).toBe(true);
  });
  it("shows technology and finite supply reasons and does not submit while disconnected", () => {
    const f = fixture();
    f.view.seats[0].technologies = { military: [], grid: [], nano: [] };
    f.view.ships.push(
      ...Array.from({ length: 7 }, (_, i) => ({
        ...f.view.ships.find((s) => s.owner === "a")!,
        id: `extra-${i}`,
      })),
    );
    const submit = vi.fn();
    render(
      <BuildPlanner {...f} disabled onClose={() => {}} onSubmit={submit} />,
    );
    expect(screen.getByText("Research Starbase first.")).toBeVisible();
    expect(screen.getByText("All 8 interceptors are deployed.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Confirm build" }),
    ).toBeDisabled();
  });
  it("converts only the missing materials atomically with a preview and permits removing a draft item", () => {
    const f = fixture();
    f.state.seats[0].resources = { money: 4, science: 0, materials: 1 };
    f.view = getPlayerView(f.state, "a")!;
    const submit = vi.fn();
    render(
      <BuildPlanner
        {...f}
        disabled={false}
        onClose={() => {}}
        onSubmit={submit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add interceptor" }));
    expect(screen.getByText("Conversion required")).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Action cost preview" }),
      ).getByText(/money: 4 → 0/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Remove interceptor" }));
    expect(
      screen.getByRole("button", { name: "Confirm build" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add interceptor" }));
    fireEvent.click(screen.getByRole("button", { name: "Convert & build" }));
    const command = submit.mock.calls[0][0] as GameCommand;
    expect(command.type).toBe("trade-and-act");
    expect(processGameCommand(f.state, "a", command).ok).toBe(true);
  });
  it("chooses a controlled sector with mini hex buttons and clears the local build draft", () => {
    const f = fixture();
    const first = f.state.sectors.find((sector) => sector.id === f.sectorId)!;
    f.state.sectors.push({ ...first, id: "second-yard", tileId: "305", position: { q: first.position.q + 2, r: first.position.r }, population: [] });
    f.view = getPlayerView(f.state, "a")!;
    const submit = vi.fn();
    render(<BuildPlanner {...f} disabled={false} onClose={() => {}} onSubmit={submit} />);
    expect(screen.queryByRole("combobox", { name: "Build sector" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add interceptor" }));
    fireEvent.click(screen.getByRole("button", { name: "Build in sector 305" }));
    expect(screen.getByLabelText("Interceptor quantity")).toHaveTextContent("0");
    fireEvent.click(screen.getByRole("button", { name: "Add interceptor" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm build" }));
    expect(submit.mock.calls[0][0]).toMatchObject({ builds: [{ sectorId: "second-yard", component: "interceptor" }] });
  });
});
it("disables building for an eliminated seat", () => {
  const f = fixture();
  f.view.seats[0].eliminated = true;
  render(
    <BuildPlanner
      {...f}
      disabled={false}
      onClose={() => {}}
      onSubmit={() => {}}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Add interceptor" }),
  ).toBeDisabled();
  expect(
    screen.getByText("This civilization has been eliminated."),
  ).toBeVisible();
});
