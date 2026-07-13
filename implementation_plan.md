# Blindbox Record Density Plan

## Scope

- Make the record table the primary consumer of remaining desktop height.
- Replace four tall statistic cards with one compact metric strip.
- Collapse gift distribution by default while keeping it available on demand.
- Merge redundant table columns and reduce row height.
- Preserve refresh cadence, query limits, filters, and all statistic calculations.

## Affected Files

- `src/app/dashboard/blindbox/page.tsx`
- `tests/e2e/dashboard-layout.spec.ts`

## Execution Order

1. Compact the summary metrics and gift-distribution section.
2. Consolidate record columns and row presentation.
3. Update the layout assertion, review the scoped diff, then run Jest, ESLint, and build.

## Risks and Acceptance

- Distribution must remain reachable and readable after collapsing.
- Profit status must remain explicit after removing its dedicated column.
- Mobile retains natural page flow and horizontal table scrolling.
- Desktop record viewport grows without changing data or filtering behavior.

## Plan Eng Review

- Shortest path: local JSX/class changes and one boolean state; no new abstraction or dependency.
- Compatibility: all existing actions, requests, and data types remain unchanged.
- Test gap: exact visible row count depends on viewport and data; layout test checks usable record height.

---

# Board Workspace Density Plan

## Scope

- Make the desktop board use the actual remaining dashboard height.
- Consolidate the source sidebar into one panel with one primary scroll area.
- Collapse session selection into an anchored picker.
- Compact filters and source cards; add an explicit quick-add action.
- Preserve queries, filtering semantics, drag/drop, board ordering, OBS sync, and export.

## Affected Files

- `src/app/dashboard/board/page.tsx`
- `src/components/dashboard/InteractiveBoard.tsx`
- `src/components/dashboard/DraggableTransactionCard.tsx`

## Execution Order

1. Connect the page and board through a `flex-1 min-h-0` height chain.
2. Merge the sidebar sections and replace the always-open session list with an anchored picker.
3. Add a compact source-card quick action without interfering with drag gestures.
4. Review the scoped diff, then run Jest, ESLint, and the production build.

## Risks and Rollback

- Quick-add must stop pointer propagation so it cannot start a drag.
- The session picker must close after selection and remain above the source list.
- Mobile keeps natural document flow; desktop alone receives the fixed workspace behavior.
- Rollback is limited to the three affected source files.

## Acceptance Criteria

- At desktop widths, the source list fills all height left after the compact controls.
- Session history no longer permanently consumes sidebar height.
- Source records can be added with one click and can still be dragged.
- Existing filtering, refresh, bulk import, sorting, OBS sync, and export behavior remains intact.
- Jest, ESLint, and `next build` pass.

## Plan Eng Review

- Shortest path: reuse current state and components; no dependency or new abstraction.
- Coupling: presentation-only changes around existing handlers.
- Compatibility: retain mobile stacking and every existing server action/API contract.
- Test gap: layout density is visual; compile checks behavior contracts, final acceptance needs browser inspection.

---

# Remove TTS Announcement Plan

## Scope

- Remove the TTS toggle, amount threshold, and automatic speech from the highlights list.
- Delete the now-unused Web Speech API wrapper.
- Preserve highlight filtering, pinning, persistence, and rendering.

## Affected Files

- `src/components/dashboard/HighlightsList.tsx`
- `src/lib/tts.ts`

## Execution Order

1. Remove TTS-only state, effects, helpers, imports, and controls from `HighlightsList`.
2. Delete the unreferenced TTS module.
3. Confirm no TTS references remain; review the diff and run focused tests, ESLint, and build.

## Risks and Acceptance

- Existing saved settings may retain obsolete TTS keys, but loading must ignore them without migration.
- Amount filtering and pinned items must continue to persist per room.
- No speech API access or TTS control remains in the application.

## Plan Eng Review

- Shortest path: delete the single call chain; no replacement or compatibility shim.
- Compatibility: stored extra JSON keys are harmless and disappear on the next settings write.
- Test gap: no existing focused TTS tests; static search plus dashboard tests cover removal and regression.
