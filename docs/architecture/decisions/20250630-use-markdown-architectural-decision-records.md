# Use Markdown Architectural Decision Records

- Status: accepted
- Date: 2025-06-29
- Tags: documentation

## Context

We want to record architectural decisions made in this project. We need to decide on a format and structure for these records that is easy to write, read, and maintain.

## Decision

We use MADR (Markdown Architectural Decision Records) 2.1.2 with Log4brains patches. This format provides:

- Lean, readable structure
- Standard sections (Context, Decision, Consequences, Alternatives)
- Date-based filenames (`YYYYMMDD-slug.md`) to avoid merge conflicts
- Support for tags and status tracking

The Log4brains patch adds:
- `draft` status for collaborative writing
- `Tags` field for categorization
- Date-based filenames instead of numerical

## Consequences

### Positive

- Decisions are documented alongside code
- Markdown is readable without special tools
- Standard structure makes ADRs consistent
- Version controlled with the codebase
- Easy to link between related decisions

### Negative

- Requires discipline to maintain
- Another file type to manage

### Neutral

- Compatible with any markdown renderer
- Can be migrated to other formats if needed

## Alternatives Considered

1. **Original MADR 2.1.2**
   - Pros: Well-documented standard
   - Cons: Numerical filenames cause merge conflicts

2. **Michael Nygard's template**
   - Pros: Original ADR format, simple
   - Cons: Less structured, no tags

3. **Y-Statements (Sustainable Architectural Decisions)**
   - Pros: Detailed reasoning format
   - Cons: More verbose, steeper learning curve

4. **No formal structure**
   - Pros: Maximum flexibility
   - Cons: Inconsistent documentation, hard to find information

## References

- [MADR on GitHub](https://adr.github.io/madr/)
- [Original ADR article by Michael Nygard](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
- Related: [Use Log4brains to Manage ADRs](./20250630-use-log4brains-to-manage-the-adrs.md)
