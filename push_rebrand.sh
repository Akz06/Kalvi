#!/bin/bash
set -e
cd "/Users/Akshay-5823/School ERP"
git add \
  frontend/index.html \
  frontend/src/components/Layout.tsx \
  frontend/src/pages/Fees.tsx \
  frontend/src/pages/Login.tsx \
  frontend/src/pages/ReportCard.tsx \
  frontend/src/pages/public/FeaturesPage.tsx \
  frontend/src/pages/public/HelpPage.tsx \
  frontend/src/pages/public/HomePage.tsx \
  frontend/src/pages/public/PricingPage.tsx
git commit -m "rebrand: rename SchoolOS -> Kalvi across all frontend UI"
git push https://Akz06@github.com/Akz06/Kalvi.git main
