#!/bin/bash
cd /home/mello/nacos-qr
echo "============================================"
echo "NACOS QR — POST-FIX VERIFICATION"
echo "============================================"

echo -e "\n[1] Prisma singleton exists"
test -f lib/prisma.ts && echo "PASS" || echo "FAIL"

echo -e "\n[2] Zero 'new PrismaClient()' in app/ or lib/ (excluding lib/prisma.ts)"
count=$(grep -rn "new PrismaClient()" --include="*.ts" --include="*.tsx" app/ lib/ | grep -v "lib/prisma.ts" | wc -l)
echo "Count: $count (expect 0)"
[ "$count" -eq 0 ] && echo "PASS" || echo "FAIL"

echo -e "\n[3] Zero 'as any' in codebase"
count=$(grep -rn "as any" --include="*.ts" --include="*.tsx" app/ lib/ | wc -l)
echo "Count: $count (expect 0)"
[ "$count" -eq 0 ] && echo "PASS" || echo "FAIL"

echo -e "\n[4] TypeScript compilation (tsc --noEmit)"
error_count=$(npx tsc --noEmit 2>&1 | grep -c "error TS")
echo "TS errors: $error_count (expect 0)"
[ "$error_count" -eq 0 ] && echo "PASS" || echo "FAIL"

echo -e "\n[5] Production build (npm run build)"
npm run build > /tmp/build_output.txt 2>&1
build_exit=$?
echo "Exit code: $build_exit (expect 0)"
[ "$build_exit" -eq 0 ] && echo "PASS" || echo "FAIL"
if [ "$build_exit" -ne 0 ]; then
  echo "--- Build errors ---"
  tail -20 /tmp/build_output.txt
fi

echo -e "\n[6] No 'Create Next App' in metadata"
count=$(grep -c "Create Next App" app/layout.tsx)
echo "Count: $count (expect 0)"
[ "$count" -eq 0 ] && echo "PASS" || echo "FAIL"

echo -e "\n[7] Prisma schema valid"
npx prisma validate 2>&1 | tail -1

echo -e "\n[8] All admin routes have auth checks"
for route in $(find app/api -name "route.ts"); do
  has_auth=$(grep -c "isAuthenticated" "$route")
  echo "$route: auth_checks=$has_auth"
done

echo -e "\n[9] .env is gitignored"
grep -c "^\.env$" .gitignore | xargs -I{} echo "Count: {} (expect 1)"

echo -e "\n[10] No database files tracked"
count=$(git ls-files | grep -c "\.db$" || true)
echo "Count: $count (expect 0)"
[ "$count" -eq 0 ] && echo "PASS" || echo "FAIL"

echo -e "\n============================================"
echo "VERIFICATION COMPLETE"
echo "============================================"
