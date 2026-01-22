# Use AG Grid for Admin Data Tables

- Status: accepted
- Date: 2025-02-02
- Tags: frontend, admin, components

## Context

The Positiv admin panel requires advanced data table features:

- Inline editing of participant data
- Complex filtering (multi-select, date ranges)
- Sorting, pagination, column resizing
- Custom cell renderers (status badges, actions)
- Large dataset handling (100s of participants per event)

We needed a table solution that provides enterprise-grade features without building from scratch.

**Background:** We initially used PrimeReact DataTable but found the developer experience (DX) and user experience (UX) unsatisfactory, leading to this migration.

## Decision

We use AG Grid Community Edition for all admin data tables:

- **Base component**: `AgDataTable` wraps AG Grid with project conventions
- **Custom cell editors**: Select, checkbox, text editors with server sync
- **Custom filters**: Multi-select filters for status, roles, etc.
- **Theming**: Integrated with Tailwind CSS variables

```typescript
// Usage in admin pages
<AgDataTable
  columnDefs={columnDefs}
  rowData={participants}
  defaultColDef={{ editable: true, sortable: true }}
/>
```

## Consequences

### Positive

- Rich feature set out of the box (sorting, filtering, editing)
- Excellent performance with virtualization
- Strong TypeScript support
- Active development and documentation
- Community Edition is free for commercial use
- Handles complexity we'd otherwise build ourselves
- Much better DX than PrimeReact

### Negative

- Large bundle size impact (~300KB min)
- Learning curve for advanced features
- AG Grid-specific patterns (cell renderers, editors)
- Community Edition lacks some features (Excel export, tree data)
- Styling requires effort to match design system

### Neutral

- Can upgrade to Enterprise Edition if features are needed
- Standard in many enterprise applications

## Alternatives Considered

1. **PrimeReact DataTable** (Previously used)
   - Pros: Part of PrimeReact ecosystem, good feature set
   - Cons: **Poor DX** - difficult API, confusing documentation; **Poor UX** - clunky interactions, styling issues. We used this and migrated away.

2. **TanStack Table (headless)**
   - Pros: Full control, smaller bundle
   - Cons: Must build all UI, editing, filtering ourselves - too much work

3. **MUI DataGrid**
   - Pros: Good features, MUI ecosystem
   - Cons: Tied to MUI, licensing for advanced features

4. **Custom implementation**
   - Pros: Exactly what we need, no bundle
   - Cons: Significant development time, maintenance burden

## References

- [AG Grid Documentation](https://www.ag-grid.com/react-data-grid/)
- [AG Grid Community Features](https://www.ag-grid.com/license-pricing/)
- Component location: `app/components/organisms/tables/ag-grid/`
