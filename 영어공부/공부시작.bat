@echo off
title English Study App
cd /d "%~dp0"
echo.
echo  === English Study App ===
echo  Browser will open automatically.
echo  If not, open: http://localhost:8770
echo  Closing this window stops the app.
echo.
start "" http://localhost:8770
python app\server.py
pause
