// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import FactionPicker from "../second-dawn-game/FactionPicker";
import { factionPresentation } from "../second-dawn-game/factionPresentation";

it("presents the paired alien and Terran sides for each physical board color and selects one directly", () => {
  const select = vi.fn();
  render(<FactionPicker selected="terran-directorate" onSelect={select} />);
  expect(screen.getByRole("region", { name: "Red civilization board" })).toBeVisible();
  expect(screen.getByRole("button", { name: /Eridani Empire.*Red board/ })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Eridani Empire.*Red board/ }));
  expect(select).toHaveBeenCalledExactlyOnceWith("eridani");
});

it("shows selected setup, technologies, and source-backed faction constraints without expanding every card", () => {
  render(<FactionPicker selected="planta" onSelect={() => {}} />);
  expect(screen.getByText("Explore activations")).toBeVisible();
  expect(screen.getByLabelText("2 Explore activations")).toBeVisible();
  expect(screen.getByText(/fewer blueprint slots/i)).toBeVisible();
  expect(screen.getByText("Starbase")).toBeVisible();
  expect(screen.getByText(/Unlocks Starbases for Build/i)).toBeVisible();
  expect(screen.queryByText("Eridani starts with two private reputation draws.")).toBeNull();
});

it("marks an unavailable board color with its reason and preserves keyboard-visible disabled semantics", () => {
  render(<FactionPicker selected="hydran" onSelect={() => {}} unavailableColors={{ blue: "Blue is already used by an AI opponent." }} />);
  const hydran = screen.getByRole("button", { name: /Hydran Progress.*Blue is already used/ });
  expect(hydran).toBeDisabled();
  expect(screen.getByText("Blue is already used by an AI opponent.")).toBeVisible();
});

it("keeps the presentation facts aligned with the actual catalog/engine exception mapping", () => {
  expect(factionPresentation("hydran").benefits).toContainEqual(expect.objectContaining({ value: "2", label: "Research activations" }));
  expect(factionPresentation("planta").benefits).toContainEqual(expect.objectContaining({ value: "2", label: "Explore activations" }));
  expect(factionPresentation("draco").constraints.join(" ")).toMatch(/choose one drawn sector or discard both/i);
  expect(factionPresentation("mechanema").benefits).toContainEqual(expect.objectContaining({ value: "3", label: "part installations" }));
  expect(factionPresentation("planta").constraints.join(" ")).toMatch(/end of combat.*occupy/i);
  expect(factionPresentation("orion").startingShip).toBe("cruiser");
  expect(factionPresentation("terran-alliance").benefits).toContainEqual(expect.objectContaining({ value: "3", label: "Move activations" }));
  expect(factionPresentation('eridani','less-random-v1').benefits).toContainEqual(expect.objectContaining({label:'public reputation draws'}));
  expect(factionPresentation('terran-directorate','less-random-v1').benefits).toContainEqual(expect.objectContaining({value:'3:2',label:'trade'}));
  expect(factionPresentation('draco','less-random-v1').constraints.join(' ')).toMatch(/three sectors/i);
});
