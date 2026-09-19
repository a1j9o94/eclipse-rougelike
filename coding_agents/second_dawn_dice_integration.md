# Combat dice presentation integration

Outcome: human and computer combat dice visibly throw across the screen in 3D while the existing target selection and authoritative combat results remain immediately usable. The renderer adds no tray or layout space.

Acceptance criteria:

- Human allocation presents exactly the server-saved die faces and weapon colors. Selecting targets and resolving a volley never waits for an animation callback.
- Computer public volleys use the same presentation; no private AI roll state is read. A human's already allocated volley does not throw again when its result appears.
- Stable roll identities exclude editable target allocations and cloned React props. Historical log entries remain static.
- Presentation cache is scoped to the active match and viewer so another game's identically numbered dice still animate.
- The optional browser dice setting, existing global motion setting, reduced-motion preference, Skip, and WebGL fallback preserve accessible static dice/controls.
- No rules, random generator, command payload, or backend changes.

Implementation:

- `CombatVolleyAllocator` wraps its existing interactive tray in `DiceRoll3D`. Authoritative dice become `{ id, face, color }`; all tactical controls remain mounted.
- `DecisionPanel.motionEnabled` carries the board's existing motion preference to the allocator.
- `CombatPlayback` wraps existing public result faces, preserving weapon/damage labels and casualty cards. Its Skip control disables the visual throw immediately. Own volleys stay static because their original throw was shown during allocation.
- `CombatVolleyResult` in the scrollable history remains unchanged and static.
- No existing Second Dawn audio preference or playback facility was found; this slice introduces no audio.

Validation:

- Tests first: three integration expectations failed because the human/AI presentation was absent; static history test already passed.
- Focused integration tests cover exact authoritative faces, unchanged command output, immediate interaction, stable IDs on allocation/rerender, dice setting/global motion off, opponent playback, own-volley no replay, and historical results.
- Renderer-specific tests and browser review are recorded by the renderer/release owners.

Risks and rollback:

- The renderer may be unavailable on a device; existing tray/result children remain the fallback.
- Changes are presentation-only; remove the wrappers to restore the preceding visual treatment without touching saved games or combat progression.

Playtest criteria:

- Newcomer: roll, see the same face in the tray, assign a hit, and identify the damaged/destroyed ship without assistance.
- Experienced player: finish allocation immediately during the throw; turn off dice or all motion and receive the same legal outcomes without delays.

Validation result: 22 tests passed across dice integration, fleet designs, direct combat, casualty feedback, and volley allocation. `tsc --noEmit -p tsconfig.app.json` and scoped ESLint passed. Full-screen opponent dice are batched per journal result so multiple firing groups do not create overlapping full-screen canvases. Source faces, allocations, and committed command output remain unchanged.
