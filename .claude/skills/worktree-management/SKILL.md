---
name: worktree-management
description: This skill should be used when the user asks to "create worktree", "crie worktree", "new worktree", "novo worktree", "setup worktree", "remove worktree", "remova worktree", "remover worktree", "cleanup worktree", "limpe worktree", "limpar worktree", "delete worktree", "deletar worktree", "list worktrees", "liste worktrees", "listar worktrees", "switch worktree", mentions "POS-XXX worktree", says "worktree for", "worktree para", says "Do POS-XXX", "Faça POS-XXX", "Fazer POS-XXX", says "Plan POS-XXX", "Planeje POS-XXX", "Planejar POS-XXX", says "Approve plan for POS-XXX", "Aprove plano para POS-XXX", says "Show plan for POS-XXX", "Mostre plano para POS-XXX", says "Update plan for POS-XXX", "Atualize plano para POS-XXX", says "Regenerate plan for POS-XXX", "Regenere plano para POS-XXX", says "Work on POS-XXX", "Trabalhe em POS-XXX", "Trabalhar em POS-XXX", says "Start POS-XXX", "Comece POS-XXX", "Começar POS-XXX", "mesclado", or discusses Linear task worktree management, branch creation from Linear tasks, plan generation, plan approval, or worktree lifecycle operations for the Positiv project. User may speak in English or Brazilian Portuguese.
---

# Worktree Management for Positiv Project

## Overview

This skill manages the complete lifecycle of Git worktrees for the Positiv project, including creation from Linear tasks, environment setup, and cleanup. It integrates with Linear MCP to automatically fetch task information and follows strict project conventions.

## Critical: Read CLAUDE.md First

**MANDATORY FIRST STEP**: Before ANY worktree operation, read the project's
CLAUDE.md to understand current project state and requirements:

- **CLAUDE.md**: `CLAUDE.md` at the root of whichever worktree you are in

There used to be two of these — one in a parent config directory and one in the
repository. They were merged into this single versioned file, so every worktree
carries an identical copy.

It contains critical information about:
- TDD requirements (Red-Green-Refactor cycle)
- Testing requirements (100% green tests mandatory)
- Commit conventions (Conventional Commits)
- Pre-push hook requirements (NEVER bypass)
- News dialog update requirements
- Database migration rules

## When to Use This Skill

Use this skill when the user:
- Wants to create a new worktree from a Linear task
  - English: "create worktree for POS-314"
  - Portuguese: "crie worktree para POS-314"
- Wants to start working on a Linear task
  - English: "Do POS-314", "Plan POS-357"
  - Portuguese: "Faça POS-314", "Planeje POS-357"
- Needs a quick worktree without a Linear task
  - English: "create worktree", "new worktree"
  - Portuguese: "crie worktree", "novo worktree"
- Wants to list active worktrees with their status
  - English: "list worktrees"
  - Portuguese: "liste worktrees"
- Needs to remove/cleanup a worktree after PR merge
  - English: "remove worktree", "merged"
  - Portuguese: "remova worktree", "mesclado"

**Note**: User may speak in English or Brazilian Portuguese. The skill recognizes both languages.

## Project Structure

```
/Users/angelodias/Documents/GIT/private/positiv/
├── .bare/                       # Bare repository — holds all git objects
├── .git                         # File containing "gitdir: ./.bare"
└── wt/                          # Every worktree lives here, main included
    ├── main/                    # The main branch, just another worktree
    │   ├── CLAUDE.md           # Development guide (versioned)
    │   ├── .claude/            # Shared settings + this skill (versioned)
    │   └── .env                # Environment variables to copy
    ├── pos-314-description/    # Linear task worktree
    ├── pos-357-another-task/   # Another task worktree
    └── feature/quick-fix/      # Non-Linear worktree
```

**`main` is not special.** It is a worktree like any other, at `wt/main`. The
git objects live in `.bare/`, which has no working tree of its own. This means
worktree commands can be run from inside any worktree — there is no "parent"
directory to return to first.

## Core Operations

### Operation 1: Create Worktree from Linear Task

**Trigger**: User mentions:
- English: "create worktree for POS-XXX", "new worktree for POS-XXX"
- Portuguese: "crie worktree para POS-XXX", "novo worktree para POS-XXX"

**Prerequisites**:
1. Read CLAUDE.md
2. Verify Linear MCP server is available
3. Any worktree works as the starting point — `wt/main` is the conventional one

**Workflow**:

1. **Pull Latest Changes**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git pull origin main
   ```

2. **Fetch Linear Task Details** using Linear MCP:
   - Use `mcp__linear-server-pos__get_issue` with task ID (extract number from "POS-XXX")
   - Team ID for Positiv: `20a312f9-eb0b-42c0-b61d-6212ca72d7ef`
   - Extract: title, description, labels, assignee

3. **Generate Branch Name**:
   - Format: `pos-{task-number}-{slugified-title}`
   - Slugification rules:
     - Lowercase all characters
     - Replace spaces with hyphens
     - Remove special characters except hyphens
     - Remove Portuguese accents: á→a, ã→a, ç→c, õ→o, é→e, ê→e, í→i, ó→o, ú→u
     - Maximum 50 characters total
   - Example: "POS-314: Email transacional no dia da abertura do grupo" → `pos-314-email-transacional-no-dia-da-abertura-do-grupo`

4. **Check for Existing Worktree/Branch**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git worktree list | grep "pos-{task-number}"
   git branch -a | grep "pos-{task-number}"
   ```
   - If exists: Ask user if they want to use existing or create new with different name

5. **Create Worktree**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git worktree add ../{branch-name} {branch-name}
   ```

6. **Setup Environment**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}

   # Copy .env file
   cp /Users/angelodias/Documents/GIT/private/positiv/wt/main/.env .env

   # Install dependencies
   pnpm install
   ```

7. **Verify Setup**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}
   git status
   ls -la .env
   ls -la node_modules
   ```

8. **Confirmation Output**:
   ```
   ✓ Worktree created: /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}
   ✓ Branch: {branch-name}
   ✓ Linear Task: POS-{number} - {title}
   ✓ Environment configured (.env copied)
   ✓ Dependencies installed (pnpm install complete)

   Next steps:
   - cd /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}
   - Read task description: {brief-summary}
   - Follow TDD: Red-Green-Refactor cycle
   - Run pnpm lint before committing
   ```

**Error Handling**:
- Linear API failure: Fall back to manual branch naming, ask user for title
- .env missing: Warn user, ask if they want to continue without it
- pnpm install failure: Show error, suggest running manually
- Worktree already exists: Offer to remove old and recreate, or use different name

### Operation 2: Plan and Start Work on Linear Task (WITH DOCUMENT GENERATION)

**Trigger**: User says:
- English: "Plan POS-XXX", "Do POS-XXX", "Work on POS-XXX", "Start POS-XXX"
- Portuguese: "Planeje POS-XXX", "Faça POS-XXX", "Trabalhe em POS-XXX", "Comece POS-XXX"

**Purpose**: Enhanced workflow that combines worktree creation with comprehensive plan document generation.

**Workflow**:

1. **Read CLAUDE.md Files** (same as Operation 1, step 1)

2. **Fetch Linear Task Details**:
   - Use `mcp__linear-server-pos__get_issue` with task ID
   - Display full task details:
     ```
     Linear Task: POS-{number}
     Title: {title}
     State: {state}
     Assignee: {assignee}
     Labels: {labels}

     Description:
     {description}
     ```

3. **Check for Existing Worktree**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git worktree list | grep "pos-{task-number}"
   ```
   - If worktree exists:
     ```
     ✓ Worktree already exists: /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}

     Switching to existing worktree...
     ```
     Skip to step 5
   - If not: Proceed to step 4

4. **Create Worktree** (if doesn't exist):
   - Follow Operation 1 steps 1-8 (pull, fetch, generate branch name, create worktree, setup environment)

5. **Check for Existing Plan Document**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   ls -la docs/plans/pos-{task-number}-*.md
   ```
   - If plan exists:
     ```
     ✓ Plan document already exists: docs/plans/POS-{number}-{slug}.md

     Options:
     1. Use existing plan
     2. Regenerate plan (overwrites)
     3. Skip plan generation

     Choose (1/2/3):
     ```

6. **Analyze Task & Generate Plan Document**:
   - Parse Linear task description carefully
   - Search for similar features using Grep/Glob:
     ```bash
     grep -r "{keyword}" app/
     find app/ -name "*{pattern}*"
     ```
   - Identify relevant test patterns to follow
   - Check database schema impacts (supabase/migrations/)
   - Use template from `.claude/skills/worktree-management/templates/plan-full.md`
   - Fill placeholders with analysis results:
     - User stories from task description
     - Acceptance criteria
     - Files to modify (based on codebase search)
     - TDD baby steps breakdown
     - Testing strategy
   - Ensure docs/plans/ directory exists (create if needed)
   - Save to: `docs/plans/POS-{number}-{slug}.md`

7. **Display Plan for Review**:
   ```
   ✓ Plan Generated: docs/plans/POS-{number}-{slug}.md
   ✓ Worktree ready: /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}

   Plan Summary:
   - User Stories: {count}
   - Files to Modify: {count}
   - Implementation Steps: {count}

   Please review the plan. When ready:
   - Read full plan: cat docs/plans/POS-{number}-{slug}.md
   - Approve and post to Linear: "Approve plan for POS-{number}"
   - Regenerate: "Plan POS-{number}" again

   Remember: DELETE plan before pushing PR!
   ```

8. **If User Approves** (triggered by "Approve plan for POS-XXX"):
   - Read the generated plan document
   - Extract summary for Linear comment (keep under 10K chars)
   - Use `mcp__linear-server-pos__create_comment` with:
     ```markdown
     📋 Implementation Plan Created & Approved

     **PRD Summary:**
     {1-sentence user story from plan}

     **Key Acceptance Criteria:**
     - {criterion 1}
     - {criterion 2}
     - {criterion 3}

     **Implementation Approach:**
     - Files to modify: {count}
     - Database changes: {yes/no}
     - Testing: Unit + Integration + E2E

     ---

     📄 Full plan: `docs/plans/POS-{number}-{slug}.md` in worktree

     ⚠️ **Remember:** Delete plan before creating PR!
     ```
   - If summary too long (>10K chars), truncate intelligently and add footer:
     "⚠️ Truncated for length. Full plan in docs/plans/POS-{number}-{slug}.md"
   - Display confirmation:
     ```
     ✓ Plan posted to Linear: https://linear.app/positiv/issue/POS-{number}

     Ready to start implementing!
     ```

9. **If User Starts Coding Without Approval**:
   ```
   ⚠️  Reminder: Plan not yet posted to Linear.

   To share plan with team:
   - Say: "Approve plan for POS-{number}"

   Or continue implementing (plan is local-only)
   ```

**Difference from Operation 1**:
- Operation 1: Just creates worktree, leaves you ready to start coding
- Operation 2: Creates worktree AND generates comprehensive plan document

### Operation 2A: View or Update Existing Plan

**Trigger**: User says:
- English: "Show plan for POS-XXX", "Update plan for POS-XXX", "Regenerate plan for POS-XXX"
- Portuguese: "Mostre plano para POS-XXX", "Atualize plano para POS-XXX", "Regenere plano para POS-XXX"

**Purpose**: View, update, or regenerate existing plan documents without creating a new worktree.

**Workflow**:

1. **Find Plan Document**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   find docs/plans -name "pos-{number}-*.md"
   ```

2. **If Plan Found - Display Summary**:
   - Read plan file
   - Extract key information:
     - Created date (from file content)
     - Status (from plan header)
     - User stories count
     - Files to modify count
     - Implementation steps count
   - Display:
     ```
     Plan: docs/plans/POS-{number}-{slug}.md
     Created: {date}
     Status: {status}

     Summary:
     - User Stories: {count}
     - Files to Modify: {count}
     - Implementation Steps: {count}

     Actions:
     1. Read full plan
     2. Regenerate plan (overwrites)
     3. Approve and post to Linear
     4. Delete plan

     Choose (1/2/3/4):
     ```

3. **Handle User Choice**:
   - **Read (1)**: Display full plan content with `cat`
   - **Regenerate (2)**: Re-run Operation 2 analysis, overwrite existing plan
   - **Approve (3)**: Trigger step 8 from Operation 2 (post to Linear)
   - **Delete (4)**: Remove plan file with confirmation

4. **If Plan Not Found**:
   ```
   ✗ No plan found for POS-{number}

   To create a plan:
   - Say: "Plan POS-{number}"
   ```

**Error Handling**:
- Multiple plans for same task: List all, ask which one
- Corrupted plan file: Offer to regenerate
- Linear posting fails: Offer retry or skip

### Operation 3: Create Quick Worktree (Non-Linear)

**Trigger**: User says (without mentioning Linear task):
- English: "create worktree", "quick worktree", "worktree for {description}"
- Portuguese: "crie worktree", "worktree rápido", "worktree para {description}"

**Workflow**:

1. **Read CLAUDE.md Files** (same as Operation 1, step 1)

2. **Ask for Branch Name**:
   ```
   What should this branch be called?

   Suggested formats:
   - feature/{description} (e.g., feature/update-newsletter)
   - fix/{description} (e.g., fix/authentication-bug)

   Branch name:
   ```

3. **Validate Branch Name**:
   - Must follow format: `feature/` or `fix/` prefix
   - Lowercase, hyphens for spaces
   - No special characters

4. **Pull Latest Changes**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git pull origin main
   ```

5. **Check for Conflicts**:
   ```bash
   git worktree list | grep "{branch-name}"
   git branch -a | grep "{branch-name}"
   ```

6. **Create Worktree**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git worktree add ../{branch-name} {branch-name}
   ```

7. **Setup Environment** (same as Operation 1, step 6)

8. **Verify Setup** (same as Operation 1, step 7)

9. **Confirmation Output**:
   ```
   ✓ Worktree created: /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}
   ✓ Branch: {branch-name}
   ✓ Environment configured (.env copied)
   ✓ Dependencies installed (pnpm install complete)

   Next steps:
   - cd /Users/angelodias/Documents/GIT/private/positiv/wt/{branch-name}
   - Follow TDD: Red-Green-Refactor cycle
   - Run pnpm lint before committing
   ```

### Operation 4: List and Manage Worktrees

**Trigger**: User says:
- English: "list worktrees", "show worktrees", "what worktrees", "active worktrees"
- Portuguese: "liste worktrees", "mostrar worktrees", "quais worktrees", "worktrees ativos"

**Workflow**:

1. **Get Worktree List**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git worktree list
   ```

2. **For Each Worktree** (excluding main):
   ```bash
   cd {worktree-path}

   # Get branch name
   git branch --show-current

   # Get status
   git status --short

   # Check if pushed to remote
   git rev-parse --abbrev-ref @{u} 2>/dev/null

   # Get last commit
   git log -1 --oneline
   ```

3. **Extract Linear Task Info** (if applicable):
   - If branch name matches `pos-{number}-*`:
     - Extract task number
     - Use `mcp__linear-server-pos__get_issue` to fetch current status
     - Show: title, state, assignee

4. **Display Output**:
   ```
   Active Worktrees:

   1. pos-314-email-transacional-no-dia-da-abertura-do-grupo
      Path: /Users/angelodias/Documents/GIT/private/positiv/wt/pos-314-email-transacional-no-dia-da-abertura-do-grupo
      Linear: POS-314 - Email transacional no dia da abertura do grupo [In Progress]
      Status: 3 files modified, 2 files staged
      Remote: Pushed to origin/pos-314-email-transacional-no-dia-da-abertura-do-grupo
      Last commit: feat(email): add transactional email template

   2. pos-357-auto-createdelete-lists
      Path: /Users/angelodias/Documents/GIT/private/positiv/wt/pos-357-auto-createdelete-lists
      Linear: POS-357 - Auto create/delete lists [Done]
      Status: Clean, no uncommitted changes
      Remote: Pushed to origin/pos-357-auto-createdelete-lists
      Last commit: test: add list deletion tests

   3. feature/newsletter-update
      Path: /Users/angelodias/Documents/GIT/private/positiv/wt/feature/newsletter-update
      Linear: N/A (non-Linear task)
      Status: 1 file modified
      Remote: Not pushed
      Last commit: feat(newsletter): update email template
   ```

5. **Summary**:
   ```
   Total: 3 active worktrees
   - 2 Linear tasks (1 In Progress, 1 Done)
   - 1 non-Linear task
   ```

### Operation 5: Remove/Cleanup Worktree

**Trigger**: User says:
- English: "remove worktree", "cleanup worktree", "delete worktree", "merged" (shortcut)
- Portuguese: "remova worktree", "limpar worktree", "deletar worktree", "mesclado" (shortcut)

**Workflow**:

1. **Identify Worktree to Remove**:
   - If user says "merged": Determine current worktree from working directory
   - If user specifies POS-XXX: Find worktree matching `pos-{number}-*`
   - If user specifies path: Use that path
   - Otherwise: List worktrees and ask which one

2. **Get Worktree Information**:
   ```bash
   cd {worktree-path}

   # Get branch name
   git branch --show-current

   # Get uncommitted changes
   git status --short

   # Check if pushed
   git rev-parse --abbrev-ref @{u} 2>/dev/null

   # Check if merged to main
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git branch --merged main | grep {branch-name}
   ```

3. **Safety Checks**:
   - Uncommitted changes? → ⚠️  WARNING
   - Branch not pushed? → ⚠️  WARNING
   - Branch not merged to main? → ⚠️  WARNING

4. **Display Safety Check Results**:

   **If all checks pass**:
   ```
   Worktree: {worktree-name}
   Path: {worktree-path}
   Branch: {branch-name}

   Safety checks:
   ✓ No uncommitted changes
   ✓ Branch pushed to remote
   ✓ Branch merged to main

   Remove this worktree? (yes/no)
   ```

   **If checks fail**:
   ```
   ⚠️  WARNING: Safety checks failed

   Worktree: {worktree-name}
   Path: {worktree-path}
   Branch: {branch-name}

   Issues:
   ✗ 3 uncommitted changes detected
   ✗ Branch not pushed to remote
   ✗ Branch not merged to main

   Uncommitted files:
   - app/components/NewFeature.tsx (modified)
   - app/lib/helpers/utils.ts (new file)
   - tests/feature.test.tsx (new file)

   Are you sure you want to remove? This may result in data loss. (yes/no)
   ```

5. **If User Confirms No** (cancel):
   ```
   ✓ Worktree removal cancelled

   To prepare for safe removal:
   1. Commit your changes: git add . && git commit -m "message"
   2. Push to remote: git push origin {branch-name}
   3. Merge PR to main
   4. Then run worktree removal again
   ```

6. **If User Confirms Yes** (proceed):

   a. **Remove Worktree**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main

   # Try standard remove first
   git worktree remove ../{worktree-name}

   # If it fails due to uncommitted changes and user confirmed, use --force
   git worktree remove --force ../{worktree-name}
   ```

   b. **Ask About Remote Branch**:
   ```
   Remote branch still exists: origin/{branch-name}
   Delete remote branch? (yes/no)
   ```

   If yes:
   ```bash
   git push origin --delete {branch-name}
   ```

   c. **Delete Local Branch**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main

   # Try standard delete first
   git branch -d {branch-name}

   # If not merged and user confirmed, use -D
   git branch -D {branch-name}
   ```

   d. **Pull Latest Changes** (MANDATORY):
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   git checkout main
   git pull origin main
   ```

   e. **Check for Plan Document**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   find docs/plans -name "pos-{number}-*.md"
   ```

   If plan found:
   ```
   ⚠️  Plan document still exists: docs/plans/POS-{number}-{slug}.md

   This should have been deleted before PR creation.
   Delete now? (yes/no)
   ```

   If yes:
   ```bash
   rm docs/plans/pos-{number}-*.md
   ```

   If no:
   ```
   ⚠️  Stale plan left in repository.

   Remember: Plans are temporary and should be deleted after PR merge.
   You can delete it later with:
   - rm docs/plans/POS-{number}-{slug}.md
   ```

   f. **Ask About Linear Task** (if applicable):
   ```
   Linear task POS-{number} is currently: {current-state}
   Update to "Done"? (yes/no)
   ```

   If yes:
   - Use `mcp__linear-server-pos__update_issue` with `state: "Done"`

7. **Confirmation Output**:
   ```
   ✓ Worktree removed: {worktree-name}
   ✓ Local branch deleted: {branch-name}
   ✓ Remote branch deleted: origin/{branch-name}
   ✓ Main repository updated (git pull)
   ✓ Linear task updated to Done

   Cleanup complete. You're now on main branch in positiv/.
   ```

**Edge Case Handling**:

- **Uncommitted changes**: Offer to cancel, create stash, or force remove
- **Not pushed**: Offer to cancel, push now and remove, or force remove
- **Not merged**: Offer to cancel, verify merge status, or force remove (keep remote)
- **Already removed**: Detect and inform user gracefully

### Pre-PR Plan Check

**When**: Before creating a pull request (when user says "PR" or creates PR)

**Purpose**: Remind user to delete temporary plan documents before merging to keep repository clean.

**Workflow**:

1. **Scan for Plan Documents**:
   ```bash
   cd /Users/angelodias/Documents/GIT/private/positiv/wt/main
   find docs/plans -name "pos-{number}-*.md"
   ```

2. **If Plan Found**:
   ```
   ⚠️  WARNING: Plan document still exists!

   File: docs/plans/POS-{number}-{slug}.md

   Plans should be deleted before PR creation.
   They are temporary documents for implementation guidance.

   Delete now? (yes/no)
   ```

3. **If User Says Yes**:
   ```bash
   rm docs/plans/pos-{number}-*.md
   ```

   Display:
   ```
   ✓ Plan deleted

   Proceeding with PR creation...
   ```

4. **If User Says No**:
   ```
   ⚠️  Proceeding with plan in repository.

   Remember: Plans are meant to be temporary.
   Consider deleting after PR review:
   - rm docs/plans/POS-{number}-{slug}.md
   ```

   Continue with PR creation

5. **If No Plan Found**:
   - Proceed with PR creation normally (no action needed)

**Integration Points**:
- This check should be triggered automatically when user says "PR"
- Can be skipped if user explicitly wants to keep plan (rare case)
- Plan deletion is recommended but not mandatory (user choice)

## Best Practices

### Always Follow TDD
- Remind user to follow Red-Green-Refactor cycle
- Tests must be written FIRST and fail before implementation
- Never skip tests or bypass pre-push hooks
- Test the functionality, not just imports or file existence

### Environment Variables
- Always copy .env from main positiv/ directory
- Warn if .env is missing sensitive keys
- Never commit .env files

### Branch Naming Consistency
- Linear tasks: Always `pos-{number}-{slug}`
- Non-Linear: Always `feature/{description}` or `fix/{description}`
- Everything in English except UI strings (Brazilian Portuguese)

### Dependency Management
- Always run `pnpm install` after worktree creation
- Verify node_modules exists before confirming success
- If pnpm install fails, show full error and suggest manual resolution

### Cleanup Discipline
- Always remove worktrees after PR merge
- Always pull main after worktree removal
- Keep the wt/ directory clean
- No stale or abandoned worktrees

## Integration with Linear MCP

### Linear Server Configuration
- Server: `linear-server-pos` (from MCP configuration)
- Team ID: `20a312f9-eb0b-42c0-b61d-6212ca72d7ef`
- API Key: Configured in `.env` as `LINEAR_API_KEY`

### Available Linear Operations

1. **Get Issue Details**:
   ```
   Tool: mcp__linear-server-pos__get_issue
   Parameters: { issueId: "POS-314" } (extract number only, add "POS-" prefix)
   Returns: { id, title, description, state, assignee, labels, ... }
   ```

2. **Update Issue State**:
   ```
   Tool: mcp__linear-server-pos__update_issue
   Parameters: { id: "issue-id", state: "Done" }
   ```

3. **List Issues** (for searching):
   ```
   Tool: mcp__linear-server-pos__list_issues
   Parameters: { team: "team-id", query: "POS-314" }
   ```

### Linear Error Handling
- Always catch Linear MCP errors gracefully
- Provide fallback for when Linear is unavailable
- Never block worktree creation on Linear failures
- Inform user about Linear issues but continue workflow
- Log errors for debugging

## Edge Cases and Error Handling

### Edge Case 1: Worktree Already Exists
**Scenario**: User tries to create worktree for POS-314, but it already exists.

**Resolution**:
```
Worktree already exists for POS-314

Path: /Users/angelodias/Documents/GIT/private/positiv/wt/pos-314-email-transacional
Branch: pos-314-email-transacional
Last commit: feat(email): add template
Status: 2 files modified

Options:
1. Use existing worktree (cd to it)
2. Remove and recreate
3. Create with different name (pos-314-v2-...)

Choose option (1/2/3):
```

### Edge Case 2: Linear API Failure
**Scenario**: Cannot fetch task details from Linear MCP.

**Resolution**:
```
⚠️  Unable to fetch task details from Linear

Error: {error-message}

Falling back to manual mode...

Please provide task title for branch name:
```

Then proceed with manual branch name creation.

### Edge Case 3: Missing .env File
**Scenario**: Main positiv/.env doesn't exist.

**Resolution**:
```
⚠️  WARNING: .env file not found in positiv/

The application requires environment variables to run.

Options:
1. Continue without .env (worktree won't run properly)
2. Cancel and setup .env first
3. Copy from .env.example

Choose option (1/2/3):
```

### Edge Case 4: pnpm install Failure
**Scenario**: pnpm install fails during worktree setup.

**Resolution**:
```
✗ pnpm install failed

Error: {error-message}

Possible solutions:
1. Check Node version (required: see .nvmrc)
2. Run: pnpm install --force
3. Clear node_modules and retry
4. Check network connection

Worktree created but dependencies not installed.
You'll need to run 'pnpm install' manually.

Continue anyway? (yes/no)
```

### Edge Case 5: Multiple Worktrees for Same Task
**Scenario**: User created multiple worktrees with different suffixes for same task.

**Resolution**:
```
Multiple worktrees found for POS-314:

1. pos-314-email-transacional
   Last commit: feat(email): add template
   Status: Clean

2. pos-314-email-transacional-v2
   Last commit: fix(email): update template
   Status: 1 file modified

Which worktree do you want to use? (1/2)
```

## Project-Specific Constraints

### Workflow
1. Use worktrees for all feature development
2. Run `pnpm install` after creating worktree
3. Always copy the env file from `wt/main`
4. Fetch and fast-forward `wt/main` before creating a worktree
5. Same after removing one
6. TDD is non-negotiable (Red-Green-Refactor cycle)

### Code rules
1. **NEVER @ts-ignore** - Fix TypeScript errors properly
2. **NEVER skip tests** - 100% green tests required
3. **NEVER bypass pre-push hooks** - Hooks are mandatory
4. **Run pnpm lint before committing** - Mandatory
5. **Follow Conventional Commits** - Commit message format
6. **Update News Dialog** - For user-facing changes
7. **Database migrations** - Never modify applied migrations

## Command Shortcuts from Global CLAUDE.md

The user's global CLAUDE.md defines shortcuts:
- "merged" / "mesclado" → Trigger worktree removal process
- "POS-XXX" reference → Linear task, use Linear MCP
- "PR" → Create PR (worktree should be ready with tests passing)

**Bilingual Support**: User speaks English and Brazilian Portuguese. All trigger phrases work in both languages.

## Additional Resources

### References
- CLAUDE.md: `CLAUDE.md` at the root of any worktree
- PR Template: `.github/pull_request_template.md`

### Examples of Existing Worktrees
- `/Users/angelodias/Documents/GIT/private/positiv/wt/pos-314-email-transacional-no-dia-da-abertura-do-grupo`
- `/Users/angelodias/Documents/GIT/private/positiv/wt/pos-357-auto-createdelete-lists`
