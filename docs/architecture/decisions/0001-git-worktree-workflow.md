# ADR-0001: Git Worktree Workflow for Parallel Development

**Status:** Accepted  
**Date:** 2025-01-22  
**Tags:** development, tooling, git, claude

## Context

When working with AI coding assistants like Claude, we often need to work on multiple features or bugs simultaneously. Switching branches in a single repository causes several issues:

1. Context switching interrupts Claude sessions and loses conversation history
2. Uncommitted changes must be stashed or committed before switching
3. Dependencies need to be reinstalled when switching between branches with different package versions
4. Running multiple Claude instances in the same directory causes conflicts

## Decision

We will use Git worktrees as the standard workflow for parallel development. Git's built-in `git worktree` command is used to manage worktrees across all projects, with automatic setup of essential files and consistent directory structure.

## Consequences

### Positive

- Multiple Claude sessions can run simultaneously without conflicts
- Each feature/bug has its own isolated working directory
- No need to stash changes when switching context
- Dependencies remain installed per worktree
- Clean git history without WIP commits
- Faster context switching between tasks
- Works globally for any git project

### Negative

- Increased disk usage (each worktree duplicates the repository)
- Need to run `pnpm install` for each new worktree
- Must remember to remove worktrees when done
- Initial learning curve for developers unfamiliar with worktrees

### Neutral

- Branches still work the same way in git
- Push/pull operations remain unchanged
- CI/CD pipelines are unaffected

## Alternatives Considered

1. **Branch switching with stash**: Traditional approach
   - Pros: No additional disk space, familiar workflow
   - Cons: Loses Claude context, requires constant stashing, slower

2. **Multiple clones**: Clone the repository multiple times
   - Pros: Complete isolation
   - Cons: No shared git history, harder to manage remotes, more disk usage

3. **VS Code workspaces**: Use editor workspaces to manage contexts
   - Pros: Good editor integration
   - Cons: Doesn't solve the git switching problem, still need stashing

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Worktree Guide](../guides/worktree-guide.md)
- [Claude Code Worktree Tutorial](https://wickd.ninja/blog/claude-code-tutorials/part-1-git-worktrees)