# Enable Minor Species in an existing room

User explicitly requested room lpyxf8ukbxezabg8zl3nx772zcgxujwcsu1x. Applied on development deployment ideal-nightingale-55 using internal-only eclipseMaintenance:enableMinorSpecies.

Read-only preparation observed round2/revision101 and97 saved checkpoints. Players continued normally during verification. The atomic apply operated on the latest round3/revision103 with99 checkpoints, preserving their newer commands. Enabled market: Diplomatic patrons, Dreadnought engineers, Reputation patrons, Monolith architects.

The room setting, snapshot version pins and all retained pre-action checkpoints were upgraded together. Existing resources, ownership, turn, revision, pending choices, RNG/decks and timers were preserved. A separate deterministic room-token seed selected four unique tiles. Undo to earlier stored positions retains the module and original four-tile market. New purchases use normal authoritative commands.

The operator endpoint is internal only, supports a no-write dry run, is idempotent, and refuses incomplete history, finished matches or a pending undo. It is intended for modest existing rooms; large journals may require a separate batched migration. No historical request/event/receipt was rewritten.

Validation: Convex integration test covers no-write preview, unchanged gameplay, checkpoint update, rejection without partial writes for missing checkpoint, and repeat invocation. Full lint/TypeScript/build pass. Readback confirmed enabled with the same market. No frontend deployment is required for this data change.
