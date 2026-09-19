import { describe, expect, it } from "vitest";
import { aiWeaponValue } from "../../shared/eclipse/aiWeaponValue";

describe("Rift AI weapon valuation", () => {
  it("values shield-bypassing expected damage after backfire without a computer bonus", () => {
    const rift = {
      color: "magenta",
      kind: "cannon",
      dice: 1,
      damage: 1,
    } as const;
    expect(aiWeaponValue(rift)).toBe(2);
    expect(aiWeaponValue(rift, 3)).toBe(2);
  });
  it("preserves normal damage, count and computer scaling", () => {
    expect(
      aiWeaponValue(
        { color: "orange", kind: "missile", dice: 2, damage: 2 },
        1.5,
      ),
    ).toBe(6);
  });
});
