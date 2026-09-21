#!/bin/bash
cd /home/mello/nacos-qr

echo "=== SCAN 1: Dependency Health ==="
npm ls --all 2>&1 | grep -E "WARN|ERR|missing|extraneous|invalid" | head -40
cat package.json | grep -A 50 '"dependencies"' | head -60
npm audit --json 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    meta = d.get('metadata', {}).get('vulnerabilities', {})
    print('Critical:', meta.get('critical', 0))
    print('High:', meta.get('high', 0))
    print('Moderate:', meta.get('moderate', 0))
    print('Low:', meta.get('low', 0))
    print('Total:', meta.get('total', 0))
except Exception as e:
    print('Audit parsing failed:', e)
"

echo -e "\n=== SCAN 2: TypeScript Compilation Integrity ==="
npx tsc --noEmit --pretty 2>&1 | tail -30
npx tsc --noEmit 2>&1 | grep -c "error TS"

echo -e "\n=== SCAN 3: ESLint & Build Verification ==="
npm run build 2>&1 | tail -40
npm run build 2>&1 | grep -cE "Error:|Warning:"

echo -e "\n=== SCAN 4: Dead Imports & Unused Exports ==="
grep -rn "^import " --include="*.ts" --include="*.tsx" app/ lib/ | head -50
for file in $(find app lib -name "*.ts" -o -name "*.tsx"); do
  imports=$(grep "^import" "$file" | sed -E "s/import \{([^}]+)\}.*/\1/" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -v "^$")
  for imp in $imports; do
    count=$(grep -rn "\b${imp}\b" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v "^.*import.*${imp}" | wc -l)
    if [ "$count" -eq 0 ]; then
      echo "UNUSED: ${imp} in ${file}"
    fi
  done
done 2>/dev/null | head -30

echo -e "\n=== SCAN 5: Database Layer Audit ==="
npx prisma validate 2>&1
cat prisma/schema.prisma
grep -rn "prisma.\$queryRaw\|prisma.\$executeRaw\|sql\`" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null
grep -rn "new PrismaClient()" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null
grep -n "\.db" .gitignore

echo -e "\n=== SCAN 6: Authentication & Authorization ==="
grep -rn "isAuthenticated\|ADMIN_PASSWORD\|authorization\|Bearer" --include="*.ts" app/api/ 2>/dev/null
for route in $(find app/api -name "route.ts"); do
  has_auth=$(grep -c "isAuthenticated\|authorization" "$route")
  echo "$route: auth_checks=$has_auth"
done
grep -rn "password\s*=\s*['\"]" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | grep -v "process.env"
grep -n "^\.env$\|^\.env\b" .gitignore

echo -e "\n=== SCAN 7: Routing & Page Structure ==="
find app -name "page.tsx" -o -name "route.ts" | sort
find . -name "pages" -type d 2>/dev/null | grep -v node_modules
find app -name "layout.tsx" | sort
find app -type d -name "*\[*" | sort

echo -e "\n=== SCAN 8: Environment Variables ==="
grep -rn "process\.env\." --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | sort -u
grep -rn "NEXT_PUBLIC_" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null
cat .env.example 2>/dev/null || echo "MISSING: .env.example"
for var in $(grep -roh "process\.env\.\w\+" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | sort -u | sed 's/process.env.//'); do
  if ! grep -q "$var" .env.example 2>/dev/null; then
    echo "UNDOCUMENTED ENV VAR: $var"
  fi
done

echo -e "\n=== SCAN 9: UI/UX Compliance ==="
grep -rn "00A859\|hsl(152\|rgba(0, 168, 89" --include="*.css" app/ 2>/dev/null
grep -rn "#0066cc\|#2997ff\|rgb(0, 102, 204)" --include="*.css" --include="*.tsx" app/ 2>/dev/null
grep -rPn "[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F900}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]" --include="*.tsx" --include="*.ts" --include="*.md" --include="*.css" app/ lib/ *.md 2>/dev/null
grep -rni "lorem ipsum\|placeholder\|TODO\|FIXME\|HACK" --include="*.tsx" --include="*.ts" app/ lib/ 2>/dev/null
grep -rn "Inter\|font-inter" --include="*.css" --include="*.tsx" app/ 2>/dev/null

echo -e "\n=== SCAN 10: File Hygiene & Gitignore ==="
git ls-files | head -60
git ls-files | grep -E "\.env$|\.db$|\.db-journal$|node_modules|\.next|\.DS_Store|\.pem$"
git ls-files | while read f; do
  size=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$size" -gt 512000 ]; then
    echo "LARGE FILE: $f ($size bytes)"
  fi
done
cat .gitignore
git log --all --diff-filter=A --name-only --pretty="" | grep -iE "\.env$|secret|password|key\.pem" | head -10

echo -e "\n=== SCAN 11: Security Surface ==="
grep -rn "createHmac\|hmac\|sha256" --include="*.ts" lib/ 2>/dev/null
grep -rn "eval(\|new Function(" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" app/ 2>/dev/null
grep -rn "req.body\|req.json()" --include="*.ts" app/api/ 2>/dev/null
grep -rn "rateLimit\|rate-limit\|throttle" --include="*.ts" app/api/ lib/ 2>/dev/null
grep -rn "Access-Control\|cors" --include="*.ts" app/api/ 2>/dev/null

echo -e "\n=== SCAN 12: Framework Configuration ==="
cat next.config.mjs
cat tsconfig.json | python3 -m json.tool 2>/dev/null || cat tsconfig.json
cat .eslintrc.json 2>/dev/null || echo "NO .eslintrc.json"
grep -n "provider\|output\|generator\|datasource" prisma/schema.prisma
ls -la tailwind.config.* postcss.config.* 2>/dev/null || echo "No Tailwind/PostCSS config files (expected)"
node -v
npm -v
