#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Error: Worktree name is required"
  echo "Usage: pnpm worktree <worktree-name>"
  echo "Example: pnpm worktree add-observations-column"
  exit 1
fi

WORKTREE_NAME=$1
BRANCH_NAME="feature/$WORKTREE_NAME"
WORKTREE_PATH="../positiv-worktrees/$WORKTREE_NAME"
MAIN_DIR="/Users/angelodias/Documents/GIT/private/positiv-project/positiv"

echo "📦 Creating worktree: $WORKTREE_NAME"
echo ""

cd "$MAIN_DIR"
echo "✓ Navigated to main directory"

echo "⬇️  Pulling latest changes from main..."
git pull origin main

echo "🌳 Creating worktree at $WORKTREE_PATH with branch $BRANCH_NAME..."
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"

echo "📋 Copying .env file..."
cp .env "$WORKTREE_PATH/.env"

echo "📦 Installing dependencies..."
cd "$WORKTREE_PATH"
pnpm install

echo ""
echo "✅ Worktree created successfully!"
echo ""
echo "Next steps:"
echo "  cd $WORKTREE_PATH"
echo ""
echo "Happy coding! 🚀"
