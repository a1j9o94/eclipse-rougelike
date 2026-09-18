import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  ChoiceCards,
  ResourceChoiceChips,
  SectorChoiceCards,
} from "../second-dawn-game/DecisionChoicePrimitives";

afterEach(cleanup);

it('moves keyboard focus and selection through enabled choices',()=>{
 const change=vi.fn();render(<ChoiceCards label="Track" value="a" onChange={change} options={[{value:'a',label:'First'},{value:'b',label:'Locked',disabled:true},{value:'c',label:'Last'}]}/>);
 const first=screen.getByRole('radio',{name:'First'}),last=screen.getByRole('radio',{name:'Last'});first.focus();fireEvent.keyDown(first,{key:'ArrowRight'});expect(change).toHaveBeenLastCalledWith('c');expect(last).toHaveFocus();fireEvent.keyDown(last,{key:'Home'});expect(change).toHaveBeenLastCalledWith('a');expect(first).toHaveFocus();
});

it("uses visible choice cards rather than a native select", () => {
  const change = vi.fn();
  render(
    <ChoiceCards
      label="Diplomatic response"
      value="accept"
      onChange={change}
      options={[
        { value: "accept", label: "Accept ambassadors", description: "Exchange population cubes." },
        { value: "decline", label: "Decline", description: "Keep your current board." },
      ]}
    />,
  );
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: /Decline/ }));
  expect(change).toHaveBeenCalledWith("decline");
});

it("shows resource decisions as recognizable resource buttons", () => {
  const change = vi.fn();
  render(
    <ResourceChoiceChips
      label="Return cube 1"
      resources={["money", "science", "materials"]}
      value="science"
      onChange={change}
    />,
  );
  expect(screen.getByRole("radio", { name: /Science/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  fireEvent.click(screen.getByRole("radio", { name: /Materials/ }));
  expect(change).toHaveBeenCalledWith("materials");
});

it("renders sector choices as cards with meaningful labels", () => {
  const change = vi.fn();
  render(
    <SectorChoiceCards
      label="Portal sector"
      value="b"
      onChange={change}
      options={[
        { value: "a", label: "Sector 222", description: "Your controlled sector" },
        { value: "b", label: "Sector 305", description: "Uncontrolled frontier" },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("radio", { name: /Sector 222/ }));
  expect(change).toHaveBeenCalledWith("a");
});
