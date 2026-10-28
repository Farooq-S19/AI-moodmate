@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo      Launching AI MoodMate - Next-Gen React 3D Edition
echo ============================================================
echo.

:: 1. Locate working Python environment for YOLOv11
set PYTHON_BIN=
if exist "C:\Users\shaik\anaconda3\python.exe" (
    set PYTHON_BIN="C:\Users\shaik\anaconda3\python.exe"
) else if exist "C:\Users\%USERNAME%\anaconda3\python.exe" (
    set PYTHON_BIN="C:\Users\%USERNAME%\anaconda3\python.exe"
) else (
    where python >nul 2>&1
    if !errorlevel! equ 0 set PYTHON_BIN=python
)

if defined PYTHON_BIN (
    echo [1/3] Starting local YOLOv11 Neural Engine on port 5001...
    start "MoodMate YOLO Neural Engine" /min %PYTHON_BIN% yolo_backend.py
    timeout /t 2 /nobreak >nul
) else (
    echo [WARNING] Python not found for YOLO backend. Will run in standalone client mode.
)

:: 2. Locate Node / npm
set NPM_BIN=
if exist "C:\Program Files\nodejs\npm.cmd" (
    set NPM_BIN="C:\Program Files\nodejs\npm.cmd"
) else (
    where npm >nul 2>&1
    if !errorlevel! equ 0 set NPM_BIN=npm
)

if not defined NPM_BIN (
    echo [ERROR] Node.js / npm not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: 3. Launch UI and open browser
echo [2/3] Starting Next-Gen UI Server on http://localhost:3000 ...
echo [3/3] Opening your default web browser...
start "" "http://localhost:3000"

%NPM_BIN% run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server stopped with error code %errorlevel%.
)
pause
