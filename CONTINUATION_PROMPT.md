# DELETE THIS FILE AFTER POS-216 IS MERGED

# Continuation Prompt for POS-216: Email Marketing - Audience Segmentation

## Current Worktree Status
You are working in the worktree: `/Users/angelodias/Documents/GIT/private/positiv-project/positiv-worktrees/pos-216-segmentation`
Branch: `pos-216-email-marketing-add-audience-segmentation`

## Context
This is the implementation of POS-216: Email Marketing - Add audience segmentation capabilities (Phase 1 only).
Phase 2 advanced features have been moved to POS-221.

## What Has Been Completed

### Backend Implementation (✅ DONE)
1. **Database Migration** (`20250815_add_newsletter_segmentation.sql`)
   - Added `segment_filter` JSONB column to newsletters table
   - Added `exclude_rejected` boolean column (default: true)
   - Added `expected_recipient_count` integer column

2. **Core Segmentation Logic** (`newsletter-recipients.server.ts`)
   - Implemented all 7 Phase 1 segments:
     - All subscribers (default)
     - Veterans only (`is_veteran = true`)
     - Newbies only (`is_veteran = false`)
     - Never attended any event
     - Has attended at least one event
     - New registrations (never applied to events)
     - Applied but never attended
   - Exclude rejected participants by default (`approved_to_attend != 'rejected'`)
   - Recipient preview functionality (returns 5 sample profiles)
   - Segment count calculation

3. **Testing**
   - Comprehensive integration tests for all segments (`newsletter-recipients-segmentation.server.integration.test.ts`)
   - Unit tests for recipient preview and segment counts (`newsletter-recipients.server.test.ts`)
   - All tests passing ✅

4. **Important Discovery**
   - There's a PostgreSQL trigger that automatically sets `is_veteran = true` when `attendance_status = 'attended'`
   - This was causing test failures initially - resolved by using `attendance_status = 'pending'` in tests

## What Still Needs to Be Done

### 1. Segment Selector Component (Frontend)
Create a React component for selecting segments in the newsletter form:
```typescript
// Location: app/components/forms/admin/segment-selector.tsx
// Should include:
// - Dropdown/select for segment type
// - Checkbox for "Include rejected participants"
// - Real-time recipient count display
// - Preview of 5 sample recipients
```

### 2. Integration with Newsletter Form
Update the newsletter form to include segmentation:
```typescript
// Files to modify:
// - app/components/forms/admin/newsletter-form.tsx
// - app/pages/admin/newsletters/new.tsx
// - app/pages/admin/newsletters/edit.tsx
```

### 3. Update News Dialog
Add announcement for the new segmentation feature:
```typescript
// File: app/components/organisms/news-dialog/news.tsx
// Add to DEFAULT_NEWS_ITEMS:
{
  id: "pos-216-segmentation",
  title: "Nova funcionalidade: Segmentação de audiência para newsletters",
  content: "Agora você pode enviar newsletters para grupos específicos de participantes! Escolha entre veteranos, novatos, quem nunca participou, e mais opções.",
  isAdmin: true,
  createdAt: new Date("2025-01-15"),
  isActive: true
}
// Remember to update NEWS_VERSION in app/lib/helpers/constants.ts
```

### 4. Complete E2E Testing
Write E2E tests for the segmentation feature if needed.

## How to Continue

### Step 1: Start from where we left off
```bash
cd /Users/angelodias/Documents/GIT/private/positiv-project/positiv-worktrees/pos-216-segmentation
git status  # Check current status
pnpm lint   # Ensure everything is clean
pnpm test   # Verify all tests pass
```

### Step 2: Create Segment Selector Component (TDD approach)
1. Write failing tests first for the segment selector component
2. Implement the component to make tests pass
3. Refactor as needed

### Step 3: Integrate with Newsletter Form
1. Update the form schema to include segmentation fields
2. Add the segment selector to the form UI
3. Update form submission to include segment data

### Step 4: Final Steps
1. Update the news dialog with Phase 1 announcement
2. Run full test suite: `pnpm test && pnpm test:integration`
3. Run linter: `pnpm lint`
4. Create PR with `gh pr create`

## Key Files Reference

### Backend (Completed ✅)
- `/app/business/admin/newsletter/newsletter-recipients.server.ts` - Core segmentation logic
- `/app/business/admin/newsletter/newsletter-recipients-segmentation.server.integration.test.ts` - Integration tests
- `/app/business/admin/newsletter/newsletter-recipients.server.test.ts` - Unit tests
- `/supabase/migrations/20250815_add_newsletter_segmentation.sql` - Database migration

### Frontend (To Do)
- `/app/components/forms/admin/newsletter-form.tsx` - Newsletter form component
- `/app/pages/admin/newsletters/new.tsx` - New newsletter page
- `/app/pages/admin/newsletters/edit.tsx` - Edit newsletter page
- `/app/components/organisms/news-dialog/news.tsx` - News dialog

## Important Notes

1. **TDD is mandatory** - Write tests first, then implementation
2. **Always run `pnpm lint` before committing**
3. **Exclude rejected participants by default** - This is a key requirement
4. **Use Portuguese for user-facing text** in the news dialog
5. **The veteran trigger** - Remember that attending an event automatically makes someone a veteran

## Current Todo List Status
- ✅ Set up worktree
- ✅ Create database migration
- ✅ Implement all 7 basic segments
- ✅ Write tests for all segments
- ✅ Implement recipient preview
- ⏳ Create segment selector component
- ⏳ Integrate with newsletter form
- ⏳ Update news dialog

## Linear Ticket
POS-216: Email Marketing - Add audience segmentation capabilities

## Phase 2 (POS-221) - NOT included in this work
- Custom segments with multiple filters
- Demographic-based filtering
- Engagement-based segments
- Saved segment templates

## To Resume Work
Simply say: "Continue with POS-216 segmentation from the segment selector component"