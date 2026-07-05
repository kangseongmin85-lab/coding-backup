@echo off
setlocal
echo ============================================
echo   EO2 web app redeploy
echo ============================================
echo.

REM Use the script's own folder (%~dp0) so Korean path is handled by Windows, not typed in this file
if exist "C:\temp\eo2-deploy" rmdir /s /q "C:\temp\eo2-deploy"
mkdir "C:\temp\eo2-deploy"
copy "%~dp0index.html" "C:\temp\eo2-deploy\index.html" >nul

if not exist "C:\temp\eo2-deploy\index.html" (
  echo ERROR: could not find index.html next to this script.
  pause
  exit /b 1
)

cd /d "C:\temp\eo2-deploy"
echo Deploying to Cloudflare Pages... ^(30-60 sec^)
echo.
call npx wrangler pages deploy . --project-name=eo2-app --commit-dirty=true

echo.
echo ============================================
echo   Done. The URL shown above is the new deploy.
echo   eo2-app.pages.dev updates within 1-2 min.
echo ============================================
echo.
pause
