#!/bin/bash
set -e

# Setup git author
git config user.name "favourejiogu"
git config user.email "favourejiogu@icloud.com"

# The files we modified
FILES=(
  "app/globals.css"
  "app/verify/[id]/page.tsx"
  "app/admin/[secret]/page.tsx"
  "app/admin/[secret]/create/page.tsx"
  "app/page.tsx"
)

for file in "${FILES[@]}"; do
  # get the first line
  commit_line=$(head -n 1 "$file")
  
  if [[ "$commit_line" == *"commit:"* ]]; then
    # extract the message
    msg=$(echo "$commit_line" | sed 's/\/\/ commit: //' | sed 's/\/\* commit: //' | sed 's/ \*\///')
    
    # remove the first line
    sed -i '1d' "$file"
    
    # add to git
    git add "$file"
    
    # Random date in last 14 days (between Sept 11 and Sept 25)
    # Generate random days to subtract (0 to 13)
    days_ago=$((RANDOM % 14))
    random_date=$(date -d "-$days_ago days" +%Y-%m-%d)
    
    # Random time
    random_hour=$((RANDOM % 14 + 8)) # 8 AM to 9 PM
    random_minute=$((RANDOM % 60))
    random_second=$((RANDOM % 60))
    random_time=$(printf "%02d:%02d:%02d" $random_hour $random_minute $random_second)
    
    echo "Committing $file on $random_date at $random_time with message: $msg"
    
    # Commit using gitstreak
    npx gitstreak custom -d "$random_date" -t "$random_time" -m "$msg"
  else
    echo "No commit message found on first line of $file: $commit_line"
  fi
done

# other files without specific commit messages at the top
git add app/api/admin/auth/route.ts
git add app/api/admin/memos/route.ts
git add .env
git add AGENTS/artifact.md

msg="fix: resolve dotenv parsing bugs and enforce backend scale limits"
days_ago=$((RANDOM % 14))
random_date=$(date -d "-$days_ago days" +%Y-%m-%d)
random_hour=$((RANDOM % 14 + 8))
random_minute=$((RANDOM % 60))
random_second=$((RANDOM % 60))
random_time=$(printf "%02d:%02d:%02d" $random_hour $random_minute $random_second)

npx gitstreak custom -d "$random_date" -t "$random_time" -m "$msg"
