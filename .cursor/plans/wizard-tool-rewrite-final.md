# Wizard tool complete rewrite — final plan

Authoritative copy of the implementation spec; Cursor plan metadata lives in `~/.cursor/plans/wizard_tool_rewrite_3f56c6d6.plan.md`.

See that file for YAML todos and full detail. Summary:

- New modules under `src/pages/a1-offerte/canvas/wizard/` (worldSpace, edgeDetection, gapDetection, gapFill, collision, index).
- `getWorldVertices` matches prior `computeWorldWallSegments` transform (metre-space rotate around bbox centre, then `room.x/y + v*PX_PER_M`); **mandatory** refactor of `wallSegments.ts` to call `getWorldVertices`.
- `GapInfo` includes `direction` for `WizardWand` tooltips; remove `WizardTarget`.
- `PlattegrondCanvas` uses `wizardGaps`, `safeGapFillDistance`, `computeWizardFill`, preview via `getWorldVertices`.
- Delete `canvasWizard.ts`; update `canvasUtils` barrel.

**Executor note:** Keep existing `snapToRooms` after wizard fill if the current `PlattegrondCanvas` flow uses it (user snippet omitted it).
