@echo off
cd /d "%~dp0"
echo Running npm install in %cd% ...
where node > npm-install.log 2>&1
node -v >> npm-install.log 2>&1
call npm install >> npm-install.log 2>&1
echo EXIT CODE %ERRORLEVEL% >> npm-install.log
type npm-install.log
echo.
echo Done. You can close this window.
pause
