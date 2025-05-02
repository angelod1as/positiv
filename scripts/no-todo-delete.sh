# This script checks for the presence of "DELETE" todos in TypeScript files.
# Get the list of files that are about to be pushed.
files_to_check=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ts$|\.tsx$')

if [ -z "$files_to_check" ]; then
  # No TypeScript files are being pushed.
  exit 0
fi

# Check for "DELETE" todos in these files.
if git grep -q "// TODO: DELETE" $files_to_check; then
  echo "Error: Found 'DELETE' todos in the following files:"
  git grep -l "// TODO: DELETE" $files_to_check
  echo "Please remove these comments before pushing."
  exit 1
else
  echo "No 'DELETE' todos found, proceeding with push."
  exit 0
fi
