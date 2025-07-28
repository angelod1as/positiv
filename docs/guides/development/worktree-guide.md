# Git Worktree Guide for Positiv Project

## Quick Start

This guide shows how to use git worktrees for the Positiv project development:

### Basic Commands

```bash
# Create a new worktree for a feature
git worktree add ../positiv-worktrees/dark-mode -b feature/dark-mode

# List all worktrees
git worktree list

# Switch to a worktree
cd ../positiv-worktrees/dark-mode

# Remove a worktree when done
git worktree remove ../positiv-worktrees/dark-mode
```

### Quick Reference

```bash
# Add worktree
git worktree add ../positiv-worktrees/auth -b feature/auth

# List worktrees
git worktree list

# Go to worktree
cd ../positiv-worktrees/auth

# Remove worktree
git worktree remove ../positiv-worktrees/auth
```

## Working with Claude

### Parallel Development

1. Create a worktree for each feature:

   ```bash
   git worktree add ../positiv-worktrees/dark-mode -b feature/dark-mode
   git worktree add ../positiv-worktrees/auth-fix -b bugfix/auth-error
   ```

2. Open separate Claude sessions:

   ```bash
   # Terminal 1
   cd ../positiv-worktrees/dark-mode
   claude

   # Terminal 2
   cd ../positiv-worktrees/auth-fix
   claude
   ```

3. Each Claude instance works independently without conflicts

### Example Workflow

```bash
# 1. Create a worktree for a new Linear issue
git worktree add ../positiv-worktrees/dark-mode -b pos-165-dark-mode

# 2. Switch to it
cd ../positiv-worktrees/dark-mode

# 3. Install dependencies
pnpm install

# 4. Start Claude in that directory
claude

# 5. When done, remove the worktree
git worktree remove ../positiv-worktrees/dark-mode
```

## Directory Structure

Worktrees are created as siblings to your main repository:

```sh
/Users/angelodias/Documents/GIT/private/positiv-project/
├── positiv/                    # Main repository
└── positiv-worktrees/          # All worktrees
    ├── dark-mode/
    ├── auth-fix/
    └── new-feature/
```

## Advanced Usage

### Creating Worktrees with Different Names

```bash
# Branch: feature/pos-165-implement-dark-mode
# Worktree directory: dark
git worktree add ../positiv-worktrees/dark -b feature/pos-165-implement-dark-mode
```

### Working Directory

Worktrees are created in the `positiv-worktrees` directory next to the main repository:

```bash
# Always create worktrees as siblings to the main repo
git worktree add ../positiv-worktrees/<name> -b <branch-name>
```

### Essential Files

After creating a worktree, copy these essential files:

```bash
# Copy environment variables
cp ../positiv/.env .env

# CLAUDE.md and .nvmrc are already tracked in git
```

## Tips

1. **Clean Commits**: Each worktree has its own working directory, so you can commit without affecting other work

2. **Quick Switching**: Navigate between worktrees:

   ```bash
   cd ../positiv-worktrees/dark-mode
   ```

3. **Cleanup**: Remove worktrees when done to keep things organized:

   ```bash
   git worktree remove ../positiv-worktrees/feature-name
   ```

4. **Status Check**: See all active worktrees and their branches:

   ```bash
   git worktree list
   ```

## Summary

Use standard git worktree commands for managing feature development:

- `git worktree add` - Create new worktree
- `git worktree list` - List all worktrees  
- `git worktree remove` - Remove worktree
- Always create worktrees in `../positiv-worktrees/` directory
- Run `pnpm install` after creating each worktree
