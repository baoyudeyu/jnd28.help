@echo off
chcp 65001 >nul
echo ==========================================
echo          Deploy to GitHub Repository
echo ==========================================
echo.

:: Set repository URL
set REPO_URL=https://github.com/baoyudeyu/jnd28.help.git

:: Check if git repository is initialized
if not exist ".git" (
    echo [INFO] Initializing Git repository...
    git init
    if errorlevel 1 (
        echo [ERROR] Git initialization failed, please check if Git is installed
        pause
        exit /b 1
    )
)

:: Check if remote repository is added
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [INFO] Adding remote repository...
    git remote add origin %REPO_URL%
) else (
    echo [INFO] Updating remote repository URL...
    git remote set-url origin %REPO_URL%
)

:: Check current branch
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" (
    echo [INFO] Creating and switching to main branch...
    git checkout -b main
)

:: Add all files to staging area
echo [INFO] Adding files to staging area...
git add .

:: Check if there are files to commit
git diff --cached --quiet
if not errorlevel 1 (
    echo [WARNING] No changes detected for commit
    echo [INFO] Attempting force push current state...
) else (
    echo [INFO] Committing changes...
    git commit -m "Auto deploy: %date% %time%"
)

:: Push to remote repository
echo [INFO] Pushing to GitHub repository...
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo [ERROR] Push failed, possible reasons:
    echo 1. Network connection issues
    echo 2. Repository permission issues
    echo 3. Git authentication issues
    echo.
    echo [SUGGESTION] Please check:
    echo - GitHub repository exists and has write permission
    echo - Git username and email are configured
    echo - SSH key or personal access token configured
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo          Deploy Success!
echo ==========================================
echo Repository URL: %REPO_URL%
echo Deploy Time: %date% %time%
echo ==========================================
echo.

pause