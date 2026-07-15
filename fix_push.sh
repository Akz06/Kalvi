#!/bin/bash
set -e
cd "/Users/Akshay-5823/School ERP"
git add backend/src/scripts/reset-db.ts
git commit -m "fix: correct Prisma model names in reset-db script"
git push origin main
echo "PUSHED OK"
