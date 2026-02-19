@echo off
title BWPL Auction 2026
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║      BWPL AUCTION 2026                   ║
echo  ║      Bangalore Willows Cricket Club      ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please install Node.js first:
    echo  1. Go to https://nodejs.org
    echo  2. Download the LTS version
    echo  3. Install it (just click Next, Next, Finish)
    echo  4. Restart your computer
    echo  5. Double-click this file again
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js found: 
node --version

:: Check if node_modules exists
if not exist "node_modules\" (
    echo.
    echo  [SETUP] First time setup - installing dependencies...
    echo  This may take 1-2 minutes...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed!
)

:: Build the project
echo.
echo  [BUILD] Building BWPL Auction...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Build failed!
    pause
    exit /b 1
)
echo  [OK] Build complete!

echo.
echo  [STARTING] Launching BWPL Auction...
echo.
echo  ┌────────────────────────────────────────────┐
echo  │  The app will open in your browser.        │
echo  │                                            │
echo  │  Admin Panel: http://localhost:4173/admin  │
echo  │  Presentation: http://localhost:4173       │
echo  │                                            │
echo  │  Keep this window open while using the app │
echo  │  Press Ctrl+C to stop the server           │
echo  └────────────────────────────────────────────┘
echo.

:: Wait 2 seconds then open browser
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4173/admin"

:: Start the preview server
call npm run preview