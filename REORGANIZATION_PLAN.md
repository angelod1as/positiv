# Project Reorganization Plan - Status Report

## ⚠️ IMPORTANT: Working Directory Issue
This reorganization was done directly in the main branch instead of using a worktree as specified in CLAUDE.md. Future work should follow the worktree workflow.

## Completed Work (Phases 1-5 + Type Organization)

### ✅ Phase 1: Type Consolidation
- Created app/types subdirectories (database, forms, api, components, utils)
- Moved all database types from root `types/` to `app/types/database/`
- Updated tsconfig.json path mapping: `~types/*` → `./app/types/*`
- Fixed all 59 import statements across the codebase
- Removed root types directory

### ✅ Phase 2: Extract Constants
- Created `app/lib/constants/` directory
- Moved constants.ts from `app/lib/helpers/` to `app/lib/constants/`
- Updated all imports (14 files)

### ✅ Phase 3: Move Hooks
- Moved `app/hooks/` to `app/lib/hooks/`
- No import updates needed (hook wasn't being used)

### ✅ Phase 4: Homepage Components
- Created `app/components/pages/` structure
- Moved all homepage components from `pages/homepage/components/` to `components/pages/homepage/`
- Updated imports in homepage.tsx

### ✅ Phase 5: Table Consolidation
- Created `app/components/organisms/tables/` structure (base, admin, common)
- Moved data-table to `tables/base/`
- Moved admin events table to `tables/admin/events-table.tsx`
- Moved participants table to `tables/admin/participants-table/`
- Updated all related imports

### ✅ Additional Type Organization
- Created form schema exports in `app/types/forms/`:
  - auth-schemas.ts (login, forgot password, user profile schemas)
  - admin-schemas.ts (event management schemas)
  - participant-schemas.ts (participant-specific schemas)
  - index.ts (central export)
- Created component type exports in `app/types/components/index.ts`
- Created API types placeholder in `app/types/api/index.ts`

## Remaining Work (Phases 6-10)

### 🔲 Empty Directories to Fill
1. `app/components/pages/admin/` - Currently has only .gitkeep
2. `app/components/pages/events/` - Currently has only .gitkeep
3. `app/components/organisms/tables/common/` - Currently has only .gitkeep

### 🔲 Phase 6: Email Templates
- Create `app/components/email/` directory
- Move email templates from `app/lib/email/templates/` to `app/components/email/`
- Update imports in email sending logic
- Structure:
  ```
  components/email/
  ├── common/
  │   ├── button.tsx
  │   ├── footer.tsx
  │   ├── header.tsx
  │   └── wrapper.tsx
  └── templates/
      ├── application-email.tsx
      └── reminder-email.tsx
  ```

### 🔲 Phase 7: Business Logic Reorganization
- Create subdirectories in `app/business/admin/`:
  - `events/` - Event management logic
  - `participants/` - Participant management
  - `demographics/` - Demographics utilities (move from utils/)
  - `tables/` - Table-specific business logic
- Move email business logic from `app/lib/` to `app/business/email/`
- Create `app/business/common/` for shared business logic

### 🔲 Phase 8: Form Organization
- Create form subdirectories:
  ```
  components/forms/
  ├── base/        # Current form components (for remix-forms)
  ├── custom/      # Non-remix-forms components
  │   └── rules/   # Rules form using react-hook-form
  ├── admin/       # Admin-specific extensions (already exists)
  └── utils/       # Form utilities
  ```
- Move rules form components from pages to forms/custom/rules/

### 🔲 Phase 9: Documentation Reorganization
- Reorganize docs/ structure:
  ```
  docs/
  ├── architecture/
  │   ├── decisions/   # Move ADRs here
  │   └── patterns/    # Architectural patterns
  ├── guides/
  │   ├── development/
  │   └── deployment/
  └── api/
  ```

### 🔲 Phase 10: Final Cleanup
- Remove all empty .gitkeep files from directories with content
- Update CLAUDE.md with new project structure
- Clean up any empty directories
- Run final lint and test checks

### 🔲 Components to Extract to pages/ directories

#### Admin Page Components (`app/components/pages/admin/`)
From `app/pages/admin/events/view-event-page/`:
- buttons.tsx → `components/pages/admin/events/buttons.tsx`
- dates-and-times.tsx → `components/pages/admin/events/dates-and-times.tsx`
- demographics.tsx → `components/pages/admin/events/demographics.tsx`
- event-status-form.tsx → `components/pages/admin/events/event-status-form.tsx`
- general-data.tsx → `components/pages/admin/events/general-data.tsx`

From `app/pages/admin/events/view-event-participant/`:
- basic-data.tsx → `components/pages/admin/participants/basic-data.tsx`
- participant-event-history.tsx → `components/pages/admin/participants/participant-event-history.tsx`
- participant-vs-event-data.tsx → `components/pages/admin/participants/participant-vs-event-data.tsx`

#### Event Page Components (`app/components/pages/events/`)
From `app/pages/events/application/rules/`:
- rules-dialog.tsx → `components/pages/events/rules/rules-dialog.tsx`
- rules-text.tsx → `components/pages/events/rules/rules-text.tsx`

From `app/pages/events/application/rules/rules-form/`:
- multiple-select.tsx → `components/forms/custom/rules/multiple-select.tsx`
- single-select.tsx → `components/forms/custom/rules/single-select.tsx`
- rules-form-schema.tsx → `components/forms/custom/rules/rules-form-schema.tsx`
- rules-questions.tsx → `components/forms/custom/rules/rules-questions.tsx`
- shuffle-questions.ts → `components/forms/custom/rules/shuffle-questions.ts`

From `app/pages/events/application/bdsm-consent/`:
- event-bdsm-consent.tsx → `components/pages/events/bdsm-consent/event-bdsm-consent.tsx`

## Prompt for New Session

```
I need to continue the project reorganization that was started. Please read REORGANIZATION_PLAN.md to understand what has been completed and what remains to be done.

IMPORTANT: 
1. First create a worktree for this work (as specified in CLAUDE.md)
2. The completed phases (1-5) are already done - do NOT redo them
3. Start with Phase 6: Email Templates
4. Follow the plan exactly as written
5. Make atomic commits for each change
6. Run `pnpm lint` after major changes to ensure nothing breaks

The goal is to complete phases 6-10 to finish the reorganization.
```

## Git Commits Made So Far

1. `refactor(types): create app/types/database directory structure`
2. `refactor(types): move database types to app/types/database`
3. `refactor(lib): create constants directory`
4. `refactor(lib): extract constants from helpers - fix remaining imports`
5. `refactor(lib): move hooks to lib directory`
6. `refactor(components): create pages directory structure`
7. `refactor(components): move homepage components`
8. `refactor(components): create organisms/tables structure`
9. `refactor(components): move data-table to tables/base`
10. `refactor(components): move admin events table`
11. `refactor(components): move participants table`
12. `refactor(types): update all import paths to new type locations`
13. `test: update NEWS_VERSION in test to match constant`
14. `refactor(types): organize form schemas and component types`

## Verification Status
- ✅ `pnpm lint` - Passes
- ✅ `pnpm build` - Builds successfully
- ✅ `pnpm test` - All tests pass

## Notes
- The project uses React Router 7 with file-based routing
- Form components are split between remix-forms compatible and custom implementations
- The reorganization maintains the separation between UI components (shadcn) and form components (remix-forms)
- Each phase should be completed with atomic commits before moving to the next