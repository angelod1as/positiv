# Performance Upgrade Project

## Overview

This project focuses on improving application performance across multiple dimensions:
- Load times and First Contentful Paint (FCP)
- Streaming HTML with React Router defer()
- Strategic client-side calls and caching
- Database query optimization
- Route prefetching

**Goal:** Achieve measurable improvements in Core Web Vitals and overall user experience.

## Measurement Methodology

### Running Lighthouse Tests

All performance measurements must be done consistently:

1. **Environment:**
   - Use production build (`pnpm build`)
   - Test in incognito/private mode
   - Clear cache before each test
   - Use throttling: "Simulated Slow 4G, 4x CPU Slowdown"

2. **Pages to Test:**
   - Homepage (/) - Primary test page for all performance tasks

3. **Metrics to Record:**
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)
   - Speed Index
   - Overall Performance Score

4. **Process:**
   - Run Lighthouse 3 times on Homepage (/)
   - Record the median values
   - Add results to `metrics.csv`

### Adding Results to CSV

After completing each task:
1. Run the Lighthouse tests as described above (Homepage only)
2. Calculate median values for each metric
3. Add a new row to `metrics.csv` with:
   - Task ID (e.g., POS-263)
   - Task name (e.g., "Self-host Google Fonts")
   - Date of measurement
   - Page: "Homepage (/)"
   - All metric values
   - Notes about what changed and performance improvements vs baseline

## Task List

### HIGH PRIORITY

#### POS-263 - Self-host Google Fonts
**Impact:** 1-3 seconds FCP reduction
**Description:** Install fontsource packages and remove external font links to eliminate render blocking.
**Status:** ✅ Complete

#### POS-264 - Create minimal auth RPC
**Impact:** 100-300ms reduction per request
**Description:** New lightweight Supabase RPC for auth context to reduce root loader overhead.
**Status:** ✅ Complete (REVERTED - no measurable benefit)

#### POS-265 - Remove duplicate auth checks in route guards
**Impact:** 200-500ms per navigation
**Description:** Trust root loader instead of redundant guard queries.
**Status:** ✅ Complete

#### POS-266 - Remove "load all events" from admin guard
**Impact:** 300-700ms on admin pages
**Description:** Move events loading only where needed, add pagination.
**Status:** ✅ Complete

#### POS-267 - Add database indexes
**Impact:** 100-400ms on complex queries
**Description:** Create 3 strategic indexes on event_participants and event_reminders.
**Status:** ✅ Complete

### MEDIUM PRIORITY

#### POS-268 - Implement defer() for dashboard event list
**Impact:** Header renders 500-1000ms faster
**Description:** Stream events after initial paint with Suspense.
**Status:** ✅ Complete

#### POS-269 - Implement defer() for admin event participant list
**Impact:** Event details immediate, table streams 300-600ms later
**Description:** Defer participant query, create skeleton component.
**Status:** ✅ Complete

#### POS-270 - Move non-critical root loader data to client-side
**Impact:** 100-300ms on root loader
**Description:** Move news dialog, profile validation to client.
**Status:** 🔲 Todo

#### POS-271 - Optimize get_profile_with_roles RPC query
**Impact:** 50-150ms on profile queries
**Description:** Optimize aggregation, improve query plan.
**Status:** ✅ Complete

#### POS-272 - Install and configure TanStack Query
**Impact:** Foundation for client-side caching
**Description:** Setup QueryClient, provider, defaults.
**Status:** ✅ Complete (REVERTED - added complexity without clear benefit)

#### POS-273 - Implement client-side profile caching
**Impact:** 200-400ms on repeat navigation
**Description:** useProfile hook, 5-minute stale time with TanStack Query.
**Status:** ❌ Cancelled (depends on POS-272 which was reverted)

### LOW PRIORITY

#### POS-274 - Implement client-side event list caching
**Impact:** Near-instant navigation on repeats
**Description:** useEvents hooks, prefetching, optimistic updates.
**Status:** ❌ Cancelled (depends on POS-272 which was reverted)

#### POS-275 - Optimize participant query window function
**Impact:** 200-400ms on admin event pages
**Description:** Use materialized view or refactor subquery.
**Status:** ✅ Complete

#### POS-276 - Refactor getNextEvents EXISTS to JOINs
**Impact:** 100-200ms on homepage
**Description:** Convert 2 EXISTS to LEFT JOINs.
**Status:** ✅ Complete

#### POS-277 - Implement route prefetching
**Impact:** Makes navigation feel instant
**Description:** React Router 7 prefetch strategy.
**Status:** ✅ Complete

#### POS-278 - Document performance baseline (FIRST TASK)
**Impact:** Establishes tracking methodology
**Description:** Capture baseline metrics, set targets. **Run this FIRST.**
**Status:** ✅ Complete

## Completion Requirements

**CRITICAL:** Every task MUST include performance measurements before being closed.

For each task:
1. ✅ Complete the implementation
2. ✅ Run Lighthouse tests on Homepage (/) only
3. ✅ Add metrics to `metrics.csv`
4. ✅ Update task status in this README
5. ✅ Document any unexpected findings

**No task can be closed without adding Homepage measurements to the CSV.**

## Progress Tracking

- **Total Tasks:** 16
- **Completed:** 13 (including 2 reverted, 2 cancelled)
- **Cancelled:** 2 (POS-273, POS-274)
- **Todo:** 1 (POS-270)

## Additional Tasks

If issues arise during implementation, add them here:

### New Tasks
(None yet)

## Files in This Directory

- `README.md` - This file (project overview and tracking)
- `baseline.md` - POS-278 baseline measurements
- `metrics.csv` - Running log of all performance measurements

## Notes

- All measurements should be done on production builds
- Use consistent testing conditions (same machine, network, browser)
- Document any anomalies or unexpected results
- Update this README as tasks are completed
