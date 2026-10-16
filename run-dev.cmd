@echo off
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js is not installed. Get it from https://nodejs.org then run this again. & pause & exit /b 1)
if not exist node_modules (
  echo Installing dependencies, this takes a minute...
  call npm install || (echo npm install failed. & pause & exit /b 1)
)
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
echo Starting CareVerified on http://localhost:3000  (close this window to stop it)
call npm run dev
pause
