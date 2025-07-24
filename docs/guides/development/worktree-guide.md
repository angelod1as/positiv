# Git Worktree Guide for Positiv Project

## Quick Start

The global worktree management system is now available in your shell. Here's how to use it:

### Basic Commands

```bash
# Create a new worktree for a feature
wt add feature/dark-mode

# List all worktrees
wt list

# Switch to a worktree
wt dark-mode  # or: wt cd dark-mode

# Remove a worktree when done
wt remove dark-mode
```

### Aliases for Speed

```bash
wta feature/auth       # Add worktree
wtl                    # List worktrees
wtg auth               # Go to worktree
wtr auth               # Remove worktree
```

## Working with Claude

### Parallel Development
1. Create a worktree for each feature:
   ```bash
   wta feature/dark-mode dark-mode
   wta bugfix/auth-error auth-fix
   ```

2. Open separate Claude sessions:
   ```bash
   # Terminal 1
   wt dark-mode
   claude

   # Terminal 2
   wt auth-fix
   claude
   ```

3. Each Claude instance works independently without conflicts

### Example Workflow

```bash
# 1. Create a worktree for a new Linear issue
wta pos-165-dark-mode dark-mode

# 2. Switch to it
wt dark-mode

# 3. Install dependencies
pnpm install

# 4. Start Claude in that directory
claude

# 5. When done, remove the worktree
wtr dark-mode
```

## Directory Structure

Worktrees are created as siblings to your main repository:

```
/Users/angelodias/Documents/GIT/private/positiv-project/
├── positiv/                    # Main repository
└── positiv-worktrees/          # All worktrees
    ├── dark-mode/
    ├── auth-fix/
    └── new-feature/
```

## Advanced Usage

### Custom Worktree Names
```bash
# Branch: feature/complex-name, Worktree: simple-name
wt add feature/pos-165-implement-dark-mode dark
```

### Environment Variable
Set a custom base directory for all worktrees:
```bash
export GIT_WORKTREE_BASE_DIR="$HOME/worktrees"
```

### Essential Files
The system automatically copies these files to new worktrees:
- `.env.example` → `.env`
- `CLAUDE.md`
- `.nvmrc`

## Tips

1. **Clean Commits**: Each worktree has its own working directory, so you can commit without affecting other work

2. **Quick Switching**: Tab completion works with worktree names:
   ```bash
   wt d<tab>  # Completes to: wt dark-mode
   ```

3. **Cleanup**: Remove worktrees when done to keep things organized:
   ```bash
   wtr feature-name
   ```

4. **Status Check**: See all active worktrees and their branches:
   ```bash
   wtl
   ```

## Installation

The worktree commands are globally available through your zsh configuration. The script is located at:
```
~/.zsh_custom/worktree.zsh
```

If you need to customize the behavior, you can edit this file directly.