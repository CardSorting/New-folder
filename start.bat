@echo off
echo Cleaning up any existing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak >nul

echo Starting Scene Narrator...
npm start
