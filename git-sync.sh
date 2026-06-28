#!/bin/bash
set -x

cd "/Users/nitheeshvellaiyan/Desktop/react billing/POS_Application"

# 1. Verify current repository
git status
git branch
git remote -v
git log --oneline -5

# 2. Verify correct remote
REMOTE_URL=$(git config --get remote.origin.url)
if [ "$REMOTE_URL" != "https://github.com/Nitheeshnkl/POS_Application.git" ]; then
    git remote remove origin || true
    git remote add origin https://github.com/Nitheeshnkl/POS_Application.git
fi

# 3. Protect secrets
TRACKED_SECRETS=$(git ls-files | grep "\.env" || true)
if [ -n "$TRACKED_SECRETS" ]; then
    git rm --cached .env || true
    git rm --cached backend/.env || true
    git commit -m "Remove environment files from tracking" || true
fi

# 4. Sync with remote safely
git fetch origin
git status
# Try to rebase. If it fails, abort rebase and we will handle it.
git pull --rebase origin main || git rebase --abort

# 5. Commit final state
git add .
git commit -m "Final POS stabilization: cash drawer, exports, billing, finance reconciliation" || true

# 6. Push safely
git push -u origin main || git pull origin main --allow-unrelated-histories && git push origin main

# 7. Verify upload
git status
git log --oneline -3
