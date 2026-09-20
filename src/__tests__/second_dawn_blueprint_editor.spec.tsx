// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import BlueprintEditor from "../second-dawn-game/BlueprintEditor";
import { initialBlueprints } from "../../shared/eclipse/blueprints";
afterEach(cleanup);
it("previews a multi-slot draft and confirms only a valid blueprint", () => {
  const submit = vi.fn();
  render(
    <BlueprintEditor
      faction="terran-directorate"
      blueprint={initialBlueprints("terran-directorate")[0]}
      technologies={[]}
      storedParts={[]}
      capacity={2}
      disabled={false}
      onSubmit={submit}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Slot 4: Empty slot" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Install Hull in slot 4" }),
  );
  expect(screen.getByText("Slot 4: Empty → Hull")).toBeInTheDocument();
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Apply 1 upgrade" }));
  expect(submit).toHaveBeenCalledWith({
    type: "upgrade",
    blueprints: [
      {
        shipType: "interceptor",
        parts: [null, null, null, "hull"],
        outsideParts: [],
      },
    ],
  });
});

it("prevents relocating a previously installed ancient part", () => {
  const blueprint = initialBlueprints("terran-directorate")[0];
  blueprint.parts[3] = "shard-hull";
  render(
    <BlueprintEditor
      faction="terran-directorate"
      blueprint={blueprint}
      technologies={[]}
      storedParts={[]}
      capacity={2}
      disabled={false}
      onSubmit={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Slot 1: Ion Cannon" }));
  expect(screen.getByRole("button", { name: /Shard Hull blocked:.*cannot be relocated/ })).toBeDisabled();
});

it("allows restoring an installed Ancient part to its original slot while still blocking relocation",()=>{
 const blueprint=initialBlueprints('terran-directorate')[0];blueprint.parts[3]='shard-hull';render(<BlueprintEditor faction="terran-directorate" blueprint={blueprint} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Shard Hull'}));fireEvent.click(screen.getByRole('button',{name:'Reveal printed component in slot 4'}));
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));
 expect(screen.getByRole('button',{name:'Install Shard Hull in slot 4'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Close component picker'}));
 fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));expect(screen.getByRole('button',{name:/Shard Hull blocked:.*cannot be relocated/})).toBeDisabled();
});

it('shows selected part effects and current versus draft ship statistics', () => {
  render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={['plasma-cannon']} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Slot 1: Ion Cannon' }));
  fireEvent.click(screen.getByRole('button', { name: 'Install Plasma Cannon in slot 1' }));
  expect(screen.getByTestId('slot-effect-1').textContent).toMatch(/2 damage.*2 energy/);
  expect(screen.getByRole('columnheader', { name: 'Current' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Draft' })).toBeTruthy();
  expect(screen.getByText(/Higher initiative fires first/)).toBeTruthy();
});

it("uses a visual slot canvas and explains locked components without a native part selector", () => {
  render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints("terran-directorate")[0]} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()} />);
  expect(screen.queryByRole("combobox", { name: /Part in slot/ })).toBeNull();
  expect(screen.getByRole("group", { name: "Blueprint hardpoints" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"Slot 1: Ion Cannon"}));
  expect(screen.getByRole("dialog", {name:"Interceptor · slot 1"})).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Unavailable components \(/));
  expect(screen.getByRole("button", { name: /Plasma Cannon blocked: Research Plasma Cannon/ })).toBeDisabled();
});

it('identifies the ship silhouette and explains draft energy in the shipyard', () => {
  render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()} />);
  expect(screen.getByRole('img', { name: 'Interceptor blueprint silhouette' })).toBeTruthy();
  expect(screen.getByText('3 generated / 2 used')).toBeTruthy();
  expect(screen.getByText('1 energy available')).toBeTruthy();
});

it('shows stored Ancient copies, groups parts by function, and states the exact installation count',()=>{
 const submit=vi.fn();render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={['plasma-cannon','fusion-drive']} storedParts={['ion-disruptor']} capacity={2} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));
 expect(screen.getByRole('region',{name:'Weapons'})).toHaveTextContent('Plasma Cannon');
 expect(screen.getByRole('region',{name:'Drives'})).toHaveTextContent('Fusion Drive');
 expect(screen.getByText(/Stored Ancient copies: Ion Disruptor ×1/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Install Ion Disruptor in slot 1'}));
 expect(screen.getByRole('button',{name:'Apply 1 upgrade'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));
 expect(submit).toHaveBeenCalledTimes(1);
});

it('keeps a permanent outside-grid Ancient visible without treating it as a grid part',()=>{
 const blueprint=initialBlueprints('terran-directorate')[0];blueprint.outsideParts=['muon-source'];
 render(<BlueprintEditor faction="terran-directorate" blueprint={blueprint} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()}/>);
 expect(screen.getByRole('checkbox',{name:/Muon Source/})).toBeChecked();
 expect(screen.getByRole('checkbox',{name:/Muon Source/})).toBeDisabled();
});


it('renders Muon Source as a module inside the blueprint without consuming a hardpoint', () => {
  const blueprint = initialBlueprints('terran-directorate')[0];
  blueprint.outsideParts = ['muon-source'];
  render(<BlueprintEditor faction="terran-directorate" blueprint={blueprint} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()} />);
  const canvas = screen.getByRole('region', {name: 'Blueprint hardpoints'});
  const module = within(canvas).getByRole('group', {name: 'Muon Source outside-grid module'});
  expect(within(module).getByText(/No slot used/)).toBeInTheDocument();
  expect(within(module).getByRole('group', {name: 'Muon Source statistics'})).toBeInTheDocument();
  expect(within(canvas).getAllByRole('button', {name: /^Slot /})).toHaveLength(4);
  expect(screen.getByText('5 generated / 2 used')).toBeInTheDocument();
});

it('keeps reactor and live capabilities beside the editor title without repeating energy in the summary', () => {
  render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={['plasma-cannon']} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()} />);
  const header = screen.getByRole('heading', {name: 'Edit interceptor'}).closest('header')!;
  const summary = within(header).getByRole('group', {name: 'Blueprint totals'});
  expect(within(summary).getByRole('img', {name: /^hit points: 1/})).toBeInTheDocument();
  expect(within(summary).getByRole('img', {name: /cannon.*1 × 1/})).toBeInTheDocument();
  expect(within(summary).queryByRole('img', {name: /energy/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Slot 1: Ion Cannon'}));
  fireEvent.click(screen.getByRole('button', {name: 'Install Plasma Cannon in slot 1'}));
  expect(within(summary).getByRole('img', {name: /cannon.*1 × 2/})).toBeInTheDocument();
  expect(within(header).getByText('0 energy available')).toBeInTheDocument();
});
