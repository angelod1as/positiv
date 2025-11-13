# Performance Baseline (POS-278)

**Task:** Document performance baseline with Lighthouse
**Date:** _[To be filled]_
**Tester:** _[To be filled]_
**Build:** Production (`pnpm build`)

## Test Environment

- **Browser:** _[e.g., Chrome 120]_
- **Device:** _[e.g., MacBook Pro M1]_
- **Network:** Simulated Slow 4G
- **CPU:** 4x Slowdown
- **Mode:** Incognito/Private

## Homepage (/)

### Run 1
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 2
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 3
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Median Values
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

---

## Dashboard (/dashboard)

### Run 1
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 2
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 3
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Median Values
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

---

## Admin Event Management (/admin/eventos)

### Run 1
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 2
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 3
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Median Values
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

---

## Event Details Page

**Event URL:** _[e.g., /evento/xyz]_

### Run 1
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 2
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Run 3
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

### Median Values
- **FCP:** _[ms]_
- **LCP:** _[ms]_
- **TTI:** _[ms]_
- **TBT:** _[ms]_
- **CLS:** _[score]_
- **Speed Index:** _[ms]_
- **Performance Score:** _[0-100]_

---

## Key Findings

_[Document any notable patterns, bottlenecks, or issues discovered during baseline testing]_

### Render-Blocking Resources
_[List any render-blocking scripts, stylesheets, or fonts]_

### Large Resources
_[Note any particularly large JS/CSS bundles or images]_

### Network Waterfalls
_[Describe any problematic request chains or sequential loading]_

### JavaScript Execution
_[Note any long tasks or excessive main thread work]_

### Opportunities Identified
_[List Lighthouse's top recommendations]_

## Next Steps

1. Add baseline metrics to `metrics.csv`
2. Review findings with team
3. Begin implementing optimizations starting with high-priority tasks
4. Re-test after each optimization to measure improvements
