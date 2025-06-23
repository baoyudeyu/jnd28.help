@echo off
echo ==========================================
echo          System Cleanup Tool
echo ==========================================
echo.

echo [INFO] Starting cleanup of cache and temp files...

if exist "__pycache__" (
    echo [CLEANUP] Removing root Python cache...
    rmdir /s /q "__pycache__" 2>nul
)

if exist "utils\__pycache__" (
    echo [CLEANUP] Removing utils Python cache...
    rmdir /s /q "utils\__pycache__" 2>nul
)

if exist "logs\*.log*" (
    echo [CLEANUP] Removing log files...
    del /q "logs\*.log*" 2>nul
)

if exist "*.tmp" (
    echo [CLEANUP] Removing temp files...
    del /q "*.tmp" 2>nul
)

if exist "*.bak" (
    echo [CLEANUP] Removing backup files...
    del /q "*.bak" 2>nul
)

if exist "static\uploads\ads\test*" (
    echo [CLEANUP] Removing test ad images...
    del /q "static\uploads\ads\test*" 2>nul
)

echo.
echo ==========================================
echo          Cleanup Complete!
echo ==========================================
echo Cleaned: Python cache, log files, temp files, backup files
echo ==========================================
echo.

pause 