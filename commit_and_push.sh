#!/bin/bash
cd "/Users/akshay-5823/School ERP"
git commit -m "feat: custom SVG icons, school switcher UI, improved login, DB reset script

- Replace all emoji icons in sidebar with clean custom SVG icons (icons.tsx)
- School switcher dropdown in sidebar header — shows all user schools with tick on active
- Add Another School always visible in sidebar footer for single-school users
- Login page: school code field hidden by default, auto-shown if multi-school email detected
- CreateSchool: store new token after school creation so context updates correctly
- DB reset script: backend/src/scripts/reset-db.ts for wiping Railway data"

git remote set-url origin https://github.com/Akz06/Kalvi.git
git push origin main
