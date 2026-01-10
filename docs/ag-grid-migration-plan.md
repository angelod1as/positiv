# AG Grid Community Migration Plan

> **Current Progress:** 26 Done / 4 Canceled / 12 Todo
>
> Last synced with Linear: 2026-01-10

---

## Decision Summary

**Migration Path:** PrimeReact → AG Grid Community

**Why AG Grid Community:**

- Best-in-class DX with excellent TypeScript support
- Industry-proven reliability
- Extensive documentation and active community
- All features available in free Community edition
- Complete control via custom filters/editors

---

## Linear Tasks Status

### Phase 1: Project Setup & Foundation

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 1 | POS-317 | Install AG Grid and Configure Theme | Done |
| 2 | POS-318 | Create Base AG Grid Wrapper Component | Done |
| 3 | POS-319 | Implement Session Storage Integration | Done |
| 4 | POS-320 | Create TypeScript Types and Grid Config | Done |

### Phase 2: Custom Multi-Select Filter System

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 5 | POS-321 | Build Base Multi-Select Filter Component | Done |
| 6 | POS-322 | Create Application Status Filter | Done |
| 7 | POS-323 | Create Attendance Status Filter | Done |
| 8 | POS-324 | Create Approved to Attend Filter | Done |
| 9 | POS-325 | Create Gender Filter with Array Matching | Done |
| 10 | POS-326 | Create Orientation Filter with Array Matching | Done |
| 11 | POS-327 | Register All Filters in Grid Config | Done |

> **Note:** Tasks 7-11 were consolidated - base filter supports both simple and array matching via `matchMode` prop.

### Phase 3: Cell Editing System

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 12 | POS-328 | Configure Native Cell Editors with Auto-Save | Done |
| 13 | POS-329 | Build Checkbox Cell Editor | Done (superseded by POS-328) |
| 14 | POS-330 | Build Number Cell Editor | Done (superseded by POS-328) |
| 15 | POS-331 | Build Text Edit Modal Editor | Done |
| 16 | POS-332 | Build Text View Modal Renderer | Canceled |
| 17 | POS-333 | Create Save Handler Factory | Done |

> **Note:** Using AG Grid's native editors instead of custom Radix components. POS-332 canceled - TruncatedTextRenderer sufficient.

### Phase 4: Custom Cell Renderers

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 18 | POS-334 | Build Badge Renderer (Veteran/Rookie) | Done |
| 19 | POS-335 | Build Flag Badge Renderer with Tooltips | Done |
| 20 | POS-336 | Build Warning Indicator Renderer | Done |
| 21 | POS-337 | Build Phone Button Renderer with WhatsApp | Done |
| 22 | POS-338 | Build Linked Event History Renderer | Done |

### Phase 5: Table Migration

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 23 | POS-339 | Migrate Events Table (Proof of Concept) | Done |
| 24 | POS-340 | Migrate Participant Event History Table | Done |
| 25 | POS-341 | Migrate Participants Table (Complex) | Done |
| 26 | POS-342 | Performance Test with Large Datasets | Canceled |
| - | POS-371 | Refactor events table to use AG Grid native filtering | Done |

### Phase 6: Testing

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 27 | POS-343 | Write Unit Tests for Filters | Todo |
| 28 | POS-344 | Write Unit Tests for Cell Editors | Todo |
| 29 | POS-345 | Write Integration Tests for Tables | Todo |
| 30 | POS-346 | Update E2E Tests for AG Grid | Todo |

### Phase 7: PrimeReact Removal

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 31 | POS-347 | Audit and Remove All PrimeReact Imports | Todo |
| 32 | POS-348 | Remove PrimeReact Dependencies | Todo |
| 33 | POS-349 | Delete Old PrimeReact Table Files | Todo |
| 34 | POS-350 | Clean Up Old Helper Files | Todo |
| 35 | POS-351 | Update All Table Imports | Todo |
| 36 | POS-352 | Clean Up CSS and Themes | Todo |

### Phase 8: Polish & Optimization

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| 37 | POS-353 | Implement Maximize/Minimize Toggle | Done |
| 38 | POS-354 | Performance Optimizations | Todo |
| 39 | POS-355 | Accessibility Audit | Canceled |
| 40 | POS-356 | Write AG Grid Documentation | Canceled |

### Additional Tasks

| Task | Linear | Title | Status |
|------|--------|-------|--------|
| - | POS-372 | Refactor Veterane & Rodizio | Todo |

---

## Directory Structure

```
app/components/organisms/tables/ag-grid/
├── base/
│   ├── ag-data-table.tsx
│   ├── ag-data-table-toolbar.tsx
│   ├── types.ts
│   ├── use-grid-state.ts
│   ├── use-auto-save.ts
│   ├── save-status-indicator.tsx
│   └── grid-config.ts
├── filters/
│   └── base-multi-select-filter.tsx
└── renderers/
    ├── action-buttons-renderer.tsx
    ├── boolean-text-renderer.tsx
    ├── flag-badge-renderer.tsx
    ├── last-attended-event-renderer.tsx
    ├── phone-button-renderer.tsx
    ├── pronouns-renderer.tsx
    ├── social-name-renderer.tsx
    ├── text-view-modal-renderer.tsx
    ├── truncated-text-renderer.tsx
    └── warning-indicator-renderer.tsx
```

---

## Key Decisions Made

1. **Native Editors over Custom**: Using AG Grid's built-in `agSelectCellEditor`, `agCheckboxCellEditor`, `agNumberCellEditor` instead of custom Radix components.

2. **Single Base Filter**: One `BaseMultiSelectFilter` component handles all filter types via `matchMode` prop (`exact` for simple fields, `array` for gender/orientation).

3. **Session Storage for Filters**: Filter state uses sessionStorage (clears when tab closes). Grid layout state uses localStorage (persists across sessions).

4. **Controlled Filter State**: Filters use controlled state pattern with parent component managing state and passing via `filterParams`.

---

## Success Criteria

### Completed
- All 3 tables migrated and working
- All multi-select filters functional
- Cell editors working with auto-save
- Session storage persists table state
- Pagination and sorting work
- Maximize/minimize toggle implemented

### Remaining
- Unit tests for filters and editors
- Integration tests for tables
- E2E test updates
- PrimeReact removal and cleanup
- Performance optimizations
