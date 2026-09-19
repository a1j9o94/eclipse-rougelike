# Optional 3D combat dice — September 18, 2026

## Player outcome

Authoritative combat dice tumble and bounce briefly over the whole game screen, then disappear into the existing result workflow. There is no separate tray, extra confirmation, or wait before allocating hits. A saved setting, reduced motion, and a Skip dice animation button let players use immediate results.

## Implementation and rules boundary

- `DiceRoll3D.tsx` creates a transparent, fixed viewport portal. It does not capture pointer input except for its skip button. Caller-provided children retain the interactive result controls; the standalone fallback renders every result as accessible pip tiles.
- `dice3d/renderer.ts` lazy loads Three.js: rounded/beveled cube meshes, merged physical pip geometry, perspective camera, directional and hemisphere lights, and a transparent shadow-catching plane. No bitmap or third-party dice artwork is used.
- Motion uses a deterministic cosmetic path with a falling arc and diminishing bounces. Quaternion endpoints put the supplied authoritative face upward. It neither rolls dice nor accesses game randomness. This is presentation animation, not a physical rules simulation.
- The throw lasts about 1.44 seconds and fades for 140 milliseconds. It is independent of the command/decision lifecycle. The result controls remain available throughout.
- Cache keys combine parent match/seat scope and the supplied roll identity. At most 256 recent throws are retained; rerenders, inspection remounts, and setting toggles do not replay an observed throw.
- Pixel ratio is capped at 1.6, shadow maps at 512 pixels, and physical display at 24 dice per throw. All authoritative results remain in the original controls or fallback; larger volleys visibly state the animation budget.
- Cancellation disposes geometries, materials, shadow maps, renderer/context, animation frames, resize listeners, and observer. WebGL2/context failures return to the original static result controls. Reduced motion and disabled settings avoid starting the renderer.

## Acceptance and tests

TDD began with missing-module failures for the new contracts, then behavioral tests verified them. Thirteen focused tests now cover all six upward endpoints at multiple yaw angles, opposite faces, deterministic settled positions, floor clearance during bouncing, narrow/wide landing bounds, immediate disabled results, child interactivity, no repeated throw, WebGL fallback, skip, setting-off cancellation, reduced motion, match scope isolation, canceled lazy imports, and results exceeding the 3D budget.

```sh
npx vitest run --maxWorkers=1 src/__tests__/second_dawn_dice3d.spec.tsx src/__tests__/second_dawn_dice3d_math.spec.ts
npx eslint src/second-dawn-game/DiceRoll3D.tsx src/second-dawn-game/dice3d src/__tests__/second_dawn_dice3d*
```

`node tools/second-dawn-dice3d-review.mjs` captured and reviewed actual Chromium combat at 1366×768 and 390×844, plus WebKit combat at 390×844. All three observed a real WebGL canvas after Roll dice, verified it clears without an extra step, and reported no page errors. Companion six-dice captures supply known results 1–6 directly to the renderer over the real board so the final geometry, pips, upward face orientation, transparency, scatter, and perspective can be inspected before clearing. The `combat-*` images exercise the actual component integration; the `six-dice-*` images are explicitly renderer verification. Final images are under `coding_agents/second_dawn_dice3d_review/`, with machine-readable results. Physical-device playtests and subjective human feedback are not claimed by these checks.

## Primary technical references

- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): WebGL2, render resources, shadow maps, disposal, context loss, pixel ratio.
- [Three.js RoundedBoxGeometry](https://threejs.org/docs/pages/RoundedBoxGeometry.html): rounded cube geometry and addon import.

## Risks and rollback

Old/blocked WebGL hardware uses the immediate static workflow. Weak GPUs may still prefer disabling 3D dice. Roll metadata and all game rules remain unchanged; disabling the visual feature fully restores the original interactive results. Match-specific replay scoping and saved preference are supplied by the parent integration.
