#!/bin/bash
set -e
cd "/Users/akshay-5823/School ERP"
git add frontend/src/pages/public/PricingPage.tsx
git commit -m "fix: PricingPage TS1005 - missing q: key in FAQ object"
git push https://Akz06@github.com/Akz06/Kalvi.git main
echo "=== PUSHED ==="
git log --oneline -3
