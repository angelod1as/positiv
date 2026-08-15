# Plan Templates

This directory contains templates for generating implementation plans for Linear tasks.

## Templates

- **plan-full.md**: Complete PRD + Implementation plan (DEFAULT)
  - Use for: Most tasks requiring comprehensive planning
  - Includes: User stories, implementation steps, TDD breakdown, testing strategy

- **plan-prd.md**: PRD only (user stories, acceptance criteria, scope)
  - Use for: Product planning without implementation details
  - Includes: User stories, acceptance criteria, scope, success metrics

- **plan-impl.md**: Implementation only (files, decisions, TDD steps)
  - Use for: Technical planning when PRD already exists
  - Includes: Files to modify, architecture decisions, TDD steps, testing

## Placeholders

Templates use `{placeholder}` syntax that gets filled during plan generation:

### Core Placeholders
- `{task-number}` - Linear task number (e.g., 314)
- `{task-title}` - Linear task title
- `{slug}` - URL-friendly task title (lowercase, hyphenated)
- `{timestamp}` - Plan creation timestamp
- `{linear-url}` - Full Linear task URL

### Content Placeholders
- `{user-stories}` - Derived from task description
- `{acceptance-criteria}` - Extracted or inferred from task
- `{in-scope}` / `{out-of-scope}` - Scope definition
- `{files-to-modify}` - Based on codebase analysis
- `{architecture-decisions}` - Design choices for implementation
- `{patterns-to-follow}` - Existing code patterns to reference
- `{database-changes}` - Migration requirements
- `{tdd-steps}` - Baby steps breakdown (Red-Green-Refactor)
- `{unit-tests}` / `{integration-tests}` / `{e2e-tests}` - Testing checklist
- `{risks}` - Potential issues and mitigations

## Usage

Templates are used automatically by the worktree-management skill when you say:
- "Plan POS-XXX" (generates plan-full.md)
- Future: Support for specifying template type

## Testing

Template validation tests are in `__tests__/templates.test.ts`:
- Verifies all template files exist
- Checks markdown structure
- Validates placeholder syntax
- Ensures delete reminders are present

Run tests:
```bash
pnpm test templates.test.ts
```

## Maintenance

When updating templates:
1. Preserve placeholder syntax: `{name}` not `${name}` or `{{name}}`
2. Keep "DELETE THIS PLAN" reminder in checklist
3. Follow existing markdown structure
4. Update tests if adding/removing sections
5. Keep templates concise but comprehensive

## Plan Lifecycle

1. **Generation**: Template filled with task analysis
2. **Storage**: Saved to `positiv/docs/plans/POS-{number}-{slug}.md`
3. **Usage**: Reference during implementation
4. **Deletion**: MUST be deleted before PR merge (temporary files)
