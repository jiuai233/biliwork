# Global Date Range Picker Plan

## Scope

- Unify date-range behavior across dashboard, live, blindbox, analytics, and ranking.
- Apply common presets in one click: today, yesterday, last 3/7/14 days, and previous rolling month.
- Hide the calendar behind an explicit custom option.
- Keep custom selection as an internal draft until the user applies it.
- Add direct start/end inputs and month jumping so custom ranges can span arbitrary months.
- Disable future dates and use compact human-readable trigger labels.
- Preserve URL query semantics and all existing data-fetch boundaries.

## Affected Files

- `src/components/dashboard/AnalyticsDateRangePicker.tsx`
- `src/components/dashboard/AnalyticsDateFilter.tsx`
- Dashboard pages already consuming these components.
- Focused component/E2E tests.

## Execution Order

1. Separate one-click presets from custom draft/apply behavior.
2. Add direct date entry and month jumping to custom mode.
3. Keep URL-backed filters applying directly from the shared picker.
4. Update focused tests for one-click presets, cancel, arbitrary custom ranges, and single-apply behavior.
5. Review scoped diff; run Jest, ESLint, Playwright, and production build.

## Risks and Acceptance

- First date click must not update page state or trigger requests.
- Cancel/outside click must discard draft selection.
- Applying a preset or completed range must update exactly once.
- Analytics/ranking retain URL parameters; other pages retain client-side requests.
- Desktop and mobile remain reachable without viewport overflow.

## Review Remediation

1. Gate board/config writes until their persisted state has finished hydrating.
2. Ignore stale blindbox responses and reset invalid gift filters.
3. Block repeated date submissions while pending; align responsive breakpoints.
4. Add Escape/focus behavior, prevent future-month navigation, and keep custom actions reachable.
5. Ignore invalid empty-canvas reorder targets.

## Plan Eng Review

- Shortest path: reuse the existing shared component and current `date-fns` dependency.
- Compatibility: retain `date`/`setDate`; add optional `onApply` for URL-backed pages.
- No new library, global store, or page-specific date implementation.

---

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
