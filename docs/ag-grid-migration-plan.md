# AG Grid Community Migration Plan

> **⚠️ PLAN MAINTENANCE REQUIRED**
>
> This plan must be kept in sync with Linear. When completing a task:
> 1. Update the task status in Linear to "Done"
> 2. Mark the corresponding task in this plan as ✅ DONE
>
> **Current Progress:** 4/40 tasks completed (POS-317 ✅, POS-318 ✅, POS-319 ✅, POS-320 ✅)

---

## Decision Summary

**Migration Path:** PrimeReact → AG Grid Community

**User Requirements:**

- ✅ Priority 1: Best developer experience
- ✅ Priority 2: Full control over code
- ✅ Hates ALL aspects of PrimeReact (API, bugs, styling, TypeScript)
- ✅ Can remove ALL PrimeReact components from project
- ✅ Unlimited time budget
- ✅ Critical: All 5 multi-select filters must work

**Why AG Grid Community:**

- Best-in-class DX with excellent TypeScript support
- Industry-proven reliability (no bugs like Tanstack experience)
- Extensive documentation and active community
- All features available in free Community edition
- Similar architecture to current wrapper pattern
- Complete control via custom filters/editors

---

## Phase 1: Project Setup & Foundation (Day 1)

### 1.1 Install Dependencies

```bash
cd positiv
pnpm add ag-grid-react ag-grid-community
```

### 1.2 Configure AG Grid Theme

**File:** `app/app.css` (or new file: `app/styles/ag-grid-theme.css`)

```css
/* Import AG Grid base styles */
@import 'ag-grid-community/styles/ag-grid.css';
@import 'ag-grid-community/styles/ag-theme-alpine.css';

/* Custom theme overrides with Tailwind */
.ag-theme-positiv {
  /* Customize colors to match your design system */
  --ag-header-background-color: theme('colors.gray.50');
  --ag-row-hover-color: theme('colors.blue.50');
  /* ... more customizations */
}
```

### 1.3 Create Base Directory Structure

```
app/components/organisms/tables/ag-grid/
├── base/
│   ├── ag-data-table.tsx          # Main wrapper component
│   ├── types.ts                    # TypeScript types/interfaces
│   ├── use-grid-state.ts           # Session storage integration
│   └── grid-config.ts              # Default grid options
├── filters/
│   ├── base-multi-select-filter.tsx     # Reusable multi-select base
│   ├── application-status-filter.tsx
│   ├── attendance-status-filter.tsx
│   ├── approved-to-attend-filter.tsx
│   ├── gender-filter.tsx
│   └── orientation-filter.tsx
├── editors/
│   ├── select-cell-editor.tsx
│   ├── checkbox-cell-editor.tsx
│   ├── number-cell-editor.tsx
│   ├── text-edit-modal-editor.tsx
│   └── text-view-modal-renderer.tsx
└── renderers/
    ├── badge-renderer.tsx
    ├── flag-badge-renderer.tsx
    ├── warning-indicator-renderer.tsx
    ├── phone-button-renderer.tsx
    └── linked-event-renderer.tsx
```

---

## Phase 2: Core Infrastructure (Days 1-2)

### 2.1 Base AG Grid Wrapper Component

**File:** `app/components/organisms/tables/ag-grid/base/ag-data-table.tsx`

**Key Features:**

- Generic types for row data
- Session storage integration via `use-grid-state.ts`
- Pagination controls
- Global filter
- Row selection
- Column pinning support
- Resizable/reorderable columns
- Loading/empty states
- Maximize/minimize toggle

**Interface:**

```typescript
interface AGDataTableProps<TData> {
  id: string;
  data: TData[];
  columnDefs: ColDef<TData>[];
  loading?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  onCellValueChanged?: (params: CellValueChangedEvent<TData>) => void;
  // ... more props
}
```

### 2.2 Session Storage Hook

**File:** `app/components/organisms/tables/ag-grid/base/use-grid-state.ts`

**Responsibilities:**

- Save/restore grid state (column widths, sort, filters)
- Versioning to invalidate stale state
- Serialize/deserialize GridState
- Handle edge cases (corrupted storage)

**Usage:**

```typescript
const { restoreState, saveState } = useGridState('participants-table', { version: 1 });
```

### 2.3 TypeScript Types

**File:** `app/components/organisms/tables/ag-grid/base/types.ts`

```typescript
export interface GridState {
  version: number;
  columnState: ColumnState[];
  filterModel: any;
  sortModel: SortModelItem[];
}

export interface CustomFilterParams {
  options: Array<{ value: string; label: string }>;
  field: string;
}

// ... more types
```

---

## Phase 3: Custom Multi-Select Filter System (Days 2-4)

### 3.1 Base Multi-Select Filter Component

**File:** `app/components/organisms/tables/ag-grid/filters/base-multi-select-filter.tsx`

**Architecture:**

- Reusable React component implementing AG Grid filter interface
- Uses Radix UI Select (already in project) for dropdown
- Checkbox list for multiple selections
- "Select All" / "Clear All" buttons
- Search within filter options

**Interface:**

```typescript
interface IMultiSelectFilter extends IFilterComp {
  getModel(): string[] | null;
  setModel(model: string[] | null): void;
  doesFilterPass(params: IDoesFilterPassParams): boolean;
}
```

**Key Methods:**

```typescript
// Called by AG Grid for each row
doesFilterPass = (params: IDoesFilterPassParams) => {
  const { node, getValue } = params;
  const value = getValue();

  if (!this.selectedValues.length) return true;
  return this.selectedValues.includes(value);
};

// Save filter state
getModel = () => {
  return this.selectedValues.length ? this.selectedValues : null;
};

// Restore filter state
setModel = (model: string[] | null) => {
  this.selectedValues = model || [];
  this.updateUI();
};
```

### 3.2 Specific Filter Components

**3.2.1 Application Status Filter**
**File:** `app/components/organisms/tables/ag-grid/filters/application-status-filter.tsx`

```typescript
export const ApplicationStatusFilter = forwardRef<IMultiSelectFilter>((props, ref) => {
  const options = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return <BaseMultiSelectFilter {...props} ref={ref} options={options} />;
});
```

**3.2.2 Attendance Status Filter** (similar pattern)
**3.2.3 Approved to Attend Filter** (similar pattern)

**3.2.4 Gender Filter (Array Matching)**
**File:** `app/components/organisms/tables/ag-grid/filters/gender-filter.tsx`

```typescript
// Special handling for array fields
doesFilterPass = (params: IDoesFilterPassParams) => {
  const value = params.getValue();
  if (!Array.isArray(value)) return true;

  // Array.some() matching like current implementation
  return value.some(v => this.selectedValues.includes(v.toLowerCase()));
};
```

**3.2.5 Orientation Filter** (same array matching logic)

### 3.3 Filter Registration

**File:** `app/components/organisms/tables/ag-grid/base/grid-config.ts`

```typescript
export const frameworkComponents = {
  applicationStatusFilter: ApplicationStatusFilter,
  attendanceStatusFilter: AttendanceStatusFilter,
  approvedToAttendFilter: ApprovedToAttendFilter,
  genderFilter: GenderFilter,
  orientationFilter: OrientationFilter,
};
```

---

## Phase 4: Cell Editing System (Days 4-6)

### 4.1 Select Cell Editor

**File:** `app/components/organisms/tables/ag-grid/editors/select-cell-editor.tsx`

**Features:**

- Dropdown selection using Radix Select
- Auto-save on value change (500ms debounce)
- Optimistic update with rollback on error
- Generic type for options

**Interface:**

```typescript
interface SelectCellEditorProps<TData> extends ICellEditorParams {
  options: Array<{ value: string; label: string }>;
  onSave: (value: string, rowData: TData) => Promise<void>;
}
```

### 4.2 Checkbox Cell Editor

**File:** `app/components/organisms/tables/ag-grid/editors/checkbox-cell-editor.tsx`

**Features:**

- Toggle checkbox
- Immediate save on change
- Visual feedback during save

### 4.3 Number Cell Editor

**File:** `app/components/organisms/tables/ag-grid/editors/number-cell-editor.tsx`

**Features:**

- Number input with validation
- Debounced auto-save (500ms)
- Min/max constraints

### 4.4 Text Edit Modal Editor

**File:** `app/components/organisms/tables/ag-grid/editors/text-edit-modal-editor.tsx`

**Features:**

- Opens Radix Dialog on click
- Textarea for long text
- Save/Cancel buttons
- Optimistic update

### 4.5 Text View Modal Renderer

**File:** `app/components/organisms/tables/ag-grid/editors/text-view-modal-renderer.tsx`

**Features:**

- Read-only modal display
- Click to view full text
- Uses existing modal components

### 4.6 Save Handler Factory

**File:** `app/lib/helpers/create-ag-grid-save-handler.ts`

```typescript
export function createAGGridSaveHandler<TData, TValue>({
  field,
  apiEndpoint,
  invalidateQuery,
}: SaveHandlerConfig) {
  return async (value: TValue, rowData: TData) => {
    // Debouncing
    // API call
    // Optimistic update
    // Error rollback
  };
}
```

---

## Phase 5: Custom Cell Renderers (Days 6-7)

### 5.1 Badge Renderer (Veteran/Rookie)

**File:** `app/components/organisms/tables/ag-grid/renderers/badge-renderer.tsx`

```typescript
export const BadgeRenderer: React.FC<ICellRendererParams> = (params) => {
  const { value } = params;
  return <Badge variant={value === 'veteran' ? 'default' : 'secondary'}>{value}</Badge>;
};
```

### 5.2 Flag Badge Renderer with Tooltips

### 5.3 Warning Indicator Renderer

### 5.4 Phone Button with WhatsApp Links

### 5.5 Linked Event History Renderer

---

## Phase 6: Table Migration (Days 7-12)

### 6.1 Events Table Migration (Proof of Concept)

**File:** `app/components/organisms/tables/admin/events-table-ag.tsx`

**Steps:**

1. Create new file alongside existing `events-table.tsx`
2. Define column definitions with AG Grid API
3. Wire up filters (if any)
4. Test pagination, sorting
5. Compare with PrimeReact version
6. Replace PrimeReact version once verified

**Complexity:** Simple (3 columns, basic filtering)
**Estimated time:** 1 day

### 6.2 Participant Event History Migration

**File:** `app/components/organisms/tables/admin/participant-event-history-ag.tsx`

**Steps:**

1. Create column definitions for 5 columns
2. Add custom cell renderers
3. Wire up sorting
4. Test with real data
5. Replace PrimeReact version

**Complexity:** Medium (5 columns, custom renderers, sortable)
**Estimated time:** 1-2 days

### 6.3 Participants Table Migration (Most Complex)

**File:** `app/components/organisms/tables/admin/participants-table/view-event-participants-table-ag.tsx`

**Steps:**

1. Define 20+ column definitions
2. Wire up all 5 multi-select filters
3. Integrate all 5 cell editors
4. Add all custom renderers (badges, flags, phone, etc.)
5. Implement frozen columns (checkbox left, actions right)
6. Set up row selection
7. Add action buttons column
8. Test all editing workflows
9. Test all filter combinations
10. Performance test with large datasets
11. Replace PrimeReact version

**Complexity:** High (20+ columns, 5 filters, 5 editors, multiple renderers)
**Estimated time:** 4-5 days

---

## Phase 7: Testing & Quality Assurance (Days 12-15)

### 7.1 Unit Tests

**Filter Tests:**

```
app/components/organisms/tables/ag-grid/filters/__tests__/
├── base-multi-select-filter.test.tsx
├── application-status-filter.test.tsx
└── gender-filter.test.tsx (test array matching)
```

**Editor Tests:**

```
app/components/organisms/tables/ag-grid/editors/__tests__/
├── select-cell-editor.test.tsx
├── checkbox-cell-editor.test.tsx
└── text-edit-modal-editor.test.tsx
```

**Test Coverage:**

- Filter logic (doesFilterPass)
- Model get/set
- Array matching for gender/orientation
- Editor save handlers
- Optimistic updates
- Error rollback

### 7.2 Integration Tests

**Table Tests:**

```
app/components/organisms/tables/admin/__tests__/
├── events-table-ag.test.tsx
├── participant-event-history-ag.test.tsx
└── view-event-participants-table-ag.test.tsx
```

**Test Scenarios:**

- Pagination works correctly
- Sorting updates data
- Filters narrow results
- Multiple filters combine properly (AND logic)
- Cell editing saves data
- Session storage persists state
- Row selection triggers callbacks

### 7.3 E2E Tests

**Update existing Playwright tests:**

```
e2e/tests/authenticated/admin-event-management.spec.ts
```

**Test Critical Workflows:**

1. Admin views participants table
2. Filters by application status
3. Edits cell value (attendance status)
4. Verifies save succeeded
5. Refreshes page
6. Verifies filter state restored

---

## Phase 8: Remove PrimeReact (Days 15-16)

### 8.1 Audit All PrimeReact Usage

```bash
# Find all PrimeReact imports
grep -r "from 'primereact" app/
```

**Components to check:**

- DataTable (tables) - MIGRATED
- Any other PrimeReact components?

### 8.2 Remove PrimeReact Dependencies

**File:** `package.json`

```bash
pnpm remove primereact primeicons
```

### 8.3 Delete Old Files

```bash
rm -rf app/components/organisms/tables/base/
rm app/components/organisms/tables/admin/events-table.tsx
rm app/components/organisms/tables/admin/participants-table/view-event-participants-table.tsx
rm app/components/pages/admin/participants/participant-event-history.tsx (old table parts)
```

### 8.4 Clean Up Helpers

**Files to review/delete:**

- `app/lib/hooks/use-table-filters.ts` (may not need)
- `app/lib/hooks/use-session-storage-filter.ts` (replaced by use-grid-state)
- `app/lib/helpers/register-filter-services.ts` (no longer needed)
- `app/lib/helpers/propMaps.ts` (filter configs - migrate to AG Grid)

### 8.5 Update Imports

Search and replace all table imports:

```typescript
// Old
import { DataTable } from '@/components/organisms/tables/base/data-table'

// New
import { AGDataTable } from '@/components/organisms/tables/ag-grid/base/ag-data-table'
```

### 8.6 CSS Cleanup

**File:** `app.css`

- Remove PrimeReact CSS imports
- Remove PrimeReact theme variables
- Remove `.maximized-table` workarounds (re-implement for AG Grid if needed)

---

## Phase 9: Polish & Optimization (Days 16-18)

### 9.1 Maximize/Minimize Feature

**File:** `app/components/organisms/tables/ag-grid/base/ag-data-table.tsx`

Add toggle button and fullscreen mode:

```typescript
const [maximized, setMaximized] = useState(false);

// Apply className conditionally
className={cn(
  'ag-theme-positiv',
  maximized && 'fixed inset-0 z-50 bg-white'
)}
```

### 9.2 Performance Optimization

**For large datasets (100+ rows):**

- Enable row virtualization (enabled by default)
- Consider pagination over infinite scroll
- Lazy load filter options if needed
- Optimize cell renderers (React.memo)

### 9.3 Accessibility

- Ensure keyboard navigation works
- Test screen reader compatibility
- Verify ARIA labels on filters/editors

### 9.4 Documentation

**File:** `app/components/organisms/tables/ag-grid/README.md`

Document:

- How to create new tables
- How to add custom filters
- How to add custom editors
- Column definition patterns
- Session storage usage

---

## Risk Mitigation

### Potential Blockers

1. **Complex filter logic not working**
   - Mitigation: Test each filter independently first
   - Fallback: Simplify to global filter + basic column filters

2. **Cell editing auto-save conflicts**
   - Mitigation: Careful debouncing implementation
   - Fallback: Manual save button if auto-save too complex

3. **Session storage version conflicts**
   - Mitigation: Version key in storage, clear on mismatch
   - Fallback: Don't persist state (minor UX degradation)

4. **Performance with 20+ columns**
   - Mitigation: AG Grid handles this well, use row virtualization
   - Fallback: Pagination, hide columns by default

5. **TypeScript type errors**
   - Mitigation: AG Grid has excellent types, use them
   - Fallback: Gradual typing, `any` only where necessary

---

## Success Criteria

### Must Have

- ✅ All 3 tables migrated and working
- ✅ All 5 multi-select filters functional
- ✅ All 5 cell editors working with auto-save
- ✅ Session storage persists table state
- ✅ Row selection works
- ✅ Pagination works
- ✅ Sorting works
- ✅ All tests passing (unit + integration + E2E)
- ✅ PrimeReact completely removed

### Nice to Have

- ✅ Maximize/minimize toggle
- ✅ Keyboard shortcuts
- ✅ Export to CSV (AG Grid Community supports this)
- ✅ Column visibility toggle
- ✅ Saved filter presets

---

## Timeline Summary

- **Days 1-2:** Setup + Core Infrastructure
- **Days 2-4:** Custom Filters (5 components)
- **Days 4-6:** Cell Editors (5 components)
- **Days 6-7:** Cell Renderers (5 components)
- **Days 7-12:** Table Migration (3 tables)
- **Days 12-15:** Testing (unit + integration + E2E)
- **Days 15-16:** Remove PrimeReact
- **Days 16-18:** Polish & Optimization

**Total: ~18 days** (well under 30-day budget)

---

## Linear Tasks Breakdown

### Step 0: Create Linear Project

**Action:** Create a new Linear project called "AG Grid Implementation"
**Team:** Positiv (or appropriate team)
**Description:** Migration from PrimeReact DataTable to AG Grid Community with custom filters, editors, and renderers

---

### Task Naming Convention

All tasks should be prefixed with `[ag-grid]` for easy filtering and tracking.

Example: `[ag-grid] Install AG Grid and Configure Theme`

---

### Phase 1 Tasks

**Task 1: [ag-grid] Install AG Grid and Configure Theme** — POS-317 ✅ DONE

- Install ag-grid-react and ag-grid-community packages
- Configure AG Grid theme in app.css
- Create base directory structure
- **Estimate:** 2-3 hours
- **Dependencies:** None

**Task 2: [ag-grid] Create Base AG Grid Wrapper Component** — POS-318 ✅ DONE

- Build ag-data-table.tsx with generic types
- Implement pagination, sorting, row selection
- Add loading/empty states
- **Estimate:** 4-6 hours
- **Dependencies:** Task 1

**Task 3: [ag-grid] Implement Session Storage Integration** — POS-319 ✅ DONE

- Create use-grid-state.ts hook
- Add versioning for state invalidation
- Handle serialization/deserialization
- **Estimate:** 3-4 hours
- **Dependencies:** Task 2

**Task 4: [ag-grid] Create TypeScript Types and Grid Config** — POS-320 ✅ DONE

- Define GridState, CustomFilterParams types
- Create grid-config.ts with default options
- **Estimate:** 2 hours
- **Dependencies:** Task 2

---

### Phase 2 Tasks

**Task 5: [ag-grid] Build Base Multi-Select Filter Component** — POS-321

- Create base-multi-select-filter.tsx
- Implement AG Grid filter interface (getModel, setModel, doesFilterPass)
- Use Radix UI for dropdown UI
- Add "Select All" / "Clear All" functionality
- **Estimate:** 6-8 hours
- **Dependencies:** Task 4

**Task 6: [ag-grid] Create Application Status Filter** — POS-322

- Build application-status-filter.tsx using base component
- Define filter options (pending, approved, rejected)
- **Estimate:** 1-2 hours
- **Dependencies:** Task 5

**Task 7: [ag-grid] Create Attendance Status Filter** — POS-323

- Build attendance-status-filter.tsx using base component
- Define attendance status options
- **Estimate:** 1-2 hours
- **Dependencies:** Task 5

**Task 8: [ag-grid] Create Approved to Attend Filter** — POS-324

- Build approved-to-attend-filter.tsx using base component
- Define boolean options
- **Estimate:** 1-2 hours
- **Dependencies:** Task 5

**Task 9: [ag-grid] Create Gender Filter with Array Matching** — POS-325

- Build gender-filter.tsx with special array matching logic
- Implement Array.some() matching
- **Estimate:** 2-3 hours
- **Dependencies:** Task 5

**Task 10: [ag-grid] Create Orientation Filter with Array Matching** — POS-326

- Build orientation-filter.tsx with array matching
- Mirror gender filter logic
- **Estimate:** 2-3 hours
- **Dependencies:** Task 5

**Task 11: [ag-grid] Register All Filters in Grid Config** — POS-327

- Update grid-config.ts with frameworkComponents
- Test filter registration
- **Estimate:** 1 hour
- **Dependencies:** Tasks 6-10

---

### Phase 3 Tasks

**Task 12: [ag-grid] Build Select Cell Editor** — POS-328

- Create select-cell-editor.tsx with Radix Select
- Implement auto-save with 500ms debounce
- Add optimistic updates with error rollback
- **Estimate:** 4-5 hours
- **Dependencies:** Task 4

**Task 13: [ag-grid] Build Checkbox Cell Editor** — POS-329

- Create checkbox-cell-editor.tsx
- Implement immediate save on toggle
- Add visual feedback during save
- **Estimate:** 2-3 hours
- **Dependencies:** Task 4

**Task 14: [ag-grid] Build Number Cell Editor** — POS-330

- Create number-cell-editor.tsx
- Add validation and min/max constraints
- Implement debounced auto-save
- **Estimate:** 3-4 hours
- **Dependencies:** Task 4

**Task 15: [ag-grid] Build Text Edit Modal Editor** — POS-331

- Create text-edit-modal-editor.tsx using Radix Dialog
- Add textarea for long text
- Implement save/cancel actions
- **Estimate:** 4-5 hours
- **Dependencies:** Task 4

**Task 16: [ag-grid] Build Text View Modal Renderer** — POS-332

- Create text-view-modal-renderer.tsx
- Implement read-only modal display
- **Estimate:** 2-3 hours
- **Dependencies:** Task 4

**Task 17: [ag-grid] Create Save Handler Factory** — POS-333

- Build create-ag-grid-save-handler.ts
- Implement debouncing, API calls, optimistic updates
- Add error rollback logic
- **Estimate:** 3-4 hours
- **Dependencies:** Tasks 12-16

---

### Phase 4 Tasks

**Task 18: [ag-grid] Build Badge Renderer (Veteran/Rookie)** — POS-334

- Create badge-renderer.tsx
- Use existing Badge component
- **Estimate:** 1-2 hours
- **Dependencies:** Task 4

**Task 19: [ag-grid] Build Flag Badge Renderer with Tooltips** — POS-335

- Create flag-badge-renderer.tsx
- Add tooltip support
- **Estimate:** 2-3 hours
- **Dependencies:** Task 4

**Task 20: [ag-grid] Build Warning Indicator Renderer** — POS-336

- Create warning-indicator-renderer.tsx
- Style for demographics warnings
- **Estimate:** 2 hours
- **Dependencies:** Task 4

**Task 21: [ag-grid] Build Phone Button Renderer with WhatsApp** — POS-337

- Create phone-button-renderer.tsx
- Add WhatsApp link generation
- **Estimate:** 2-3 hours
- **Dependencies:** Task 4

**Task 22: [ag-grid] Build Linked Event History Renderer** — POS-338

- Create linked-event-renderer.tsx
- Implement routing links
- **Estimate:** 2 hours
- **Dependencies:** Task 4

---

### Phase 5 Tasks

**Task 23: [ag-grid] Migrate Events Table (Proof of Concept)** — POS-339

- Create events-table-ag.tsx
- Define 3 column definitions
- Wire up pagination and sorting
- Test against PrimeReact version
- **Estimate:** 4-6 hours
- **Dependencies:** Tasks 2-4, 11, 17

**Task 24: [ag-grid] Migrate Participant Event History Table** — POS-340

- Create participant-event-history-ag.tsx
- Define 5 column definitions
- Add custom cell renderers
- Test with real data
- **Estimate:** 6-8 hours
- **Dependencies:** Tasks 2-4, 11, 17-22

**Task 25: [ag-grid] Migrate Participants Table (Complex)** — POS-341

- Create view-event-participants-table-ag.tsx
- Define 20+ column definitions
- Wire up all 5 multi-select filters
- Integrate all 5 cell editors
- Add all custom renderers
- Implement frozen columns (checkbox left, actions right)
- Set up row selection
- Add action buttons column
- **Estimate:** 2-3 days
- **Dependencies:** All previous tasks

**Task 26: [ag-grid] Performance Test with Large Datasets** — POS-342

- Test participants table with 100+ rows
- Verify row virtualization
- Optimize if needed
- **Estimate:** 2-3 hours
- **Dependencies:** Task 25

---

### Phase 6 Tasks

**Task 27: [ag-grid] Write Unit Tests for Filters** — POS-343

- Test base-multi-select-filter logic
- Test application-status-filter
- Test gender-filter array matching
- **Estimate:** 4-6 hours
- **Dependencies:** Tasks 5-10

**Task 28: [ag-grid] Write Unit Tests for Cell Editors** — POS-344

- Test select-cell-editor save logic
- Test checkbox-cell-editor
- Test text-edit-modal-editor
- **Estimate:** 4-6 hours
- **Dependencies:** Tasks 12-16

**Task 29: [ag-grid] Write Integration Tests for Tables** — POS-345

- Test events-table-ag pagination/sorting
- Test participant-event-history-ag
- Test view-event-participants-table-ag filtering/editing
- **Estimate:** 6-8 hours
- **Dependencies:** Tasks 23-25

**Task 30: [ag-grid] Update E2E Tests for AG Grid** — POS-346

- Update admin-event-management.spec.ts
- Test critical workflows (filter + edit + refresh)
- Verify session storage persistence
- **Estimate:** 4-6 hours
- **Dependencies:** Task 25

---

### Phase 7 Tasks

**Task 31: [ag-grid] Audit and Remove All PrimeReact Imports** — POS-347

- Search codebase for all PrimeReact usage
- Document what needs to be removed
- **Estimate:** 1-2 hours
- **Dependencies:** Tasks 23-25

**Task 32: [ag-grid] Remove PrimeReact Dependencies** — POS-348

- Run pnpm remove primereact primeicons
- Test that build still works
- **Estimate:** 30 minutes
- **Dependencies:** Task 31

**Task 33: [ag-grid] Delete Old PrimeReact Table Files** — POS-349

- Remove app/components/organisms/tables/base/
- Remove old table implementations
- **Estimate:** 30 minutes
- **Dependencies:** Task 32

**Task 34: [ag-grid] Clean Up Old Helper Files** — POS-350

- Remove/replace use-table-filters.ts
- Remove use-session-storage-filter.ts
- Remove register-filter-services.ts
- Remove propMaps.ts (migrate configs)
- **Estimate:** 2-3 hours
- **Dependencies:** Task 33

**Task 35: [ag-grid] Update All Table Imports** — POS-351

- Search and replace DataTable imports
- Update to AGDataTable imports
- **Estimate:** 1-2 hours
- **Dependencies:** Task 33

**Task 36: [ag-grid] Clean Up CSS and Themes** — POS-352

- Remove PrimeReact CSS imports from app.css
- Remove PrimeReact theme variables
- Remove .maximized-table workarounds
- **Estimate:** 1-2 hours
- **Dependencies:** Task 35

---

### Phase 8 Tasks

**Task 37: [ag-grid] Implement Maximize/Minimize Toggle** — POS-353

- Add toggle button to ag-data-table.tsx
- Implement fullscreen mode
- **Estimate:** 2-3 hours
- **Dependencies:** Task 2

**Task 38: [ag-grid] Performance Optimizations** — POS-354

- Review row virtualization settings
- Optimize cell renderers with React.memo
- Test with large datasets
- **Estimate:** 3-4 hours
- **Dependencies:** Task 26

**Task 39: [ag-grid] Accessibility Audit** — POS-355

- Test keyboard navigation
- Verify screen reader compatibility
- Check ARIA labels on filters/editors
- **Estimate:** 3-4 hours
- **Dependencies:** Tasks 23-25

**Task 40: [ag-grid] Write AG Grid Documentation** — POS-356

- Create README.md for ag-grid components
- Document how to create new tables
- Document filter and editor patterns
- Document column definition patterns
- **Estimate:** 3-4 hours
- **Dependencies:** All previous tasks

---

### Task Organization Notes

**High Priority (Critical Path):**

- Tasks 1-5 (Foundation)
- Task 23 (First table migration - proof of concept)
- Task 25 (Complex table migration)
- Tasks 27-30 (Testing)
- Tasks 31-36 (PrimeReact removal)

**Can Be Parallelized:**

- Tasks 6-10 (All filter implementations after Task 5)
- Tasks 12-16 (All editor implementations after Task 4)
- Tasks 18-22 (All renderer implementations after Task 4)
- Tasks 27-28 (Filter and editor tests)

**Final Polish:**

- Tasks 37-40 (Can be done incrementally throughout or at the end)
