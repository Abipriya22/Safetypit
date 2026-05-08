@echo off
echo Starting SafePit Backend...
start cmd /k "cd /d C:\Users\kmabi\Downloads\SafePit_Full\SafePit_Full\backend && node src/index.js"

timeout /t 3

echo Starting SafePit Frontend...
start cmd /k "cd /d C:\Users\kmabi\Downloads\SafePit_Full\SafePit_Full\frontend && npx expo start --web"

echo.
echo SafePit starting... Open browser at http://localhost:8081