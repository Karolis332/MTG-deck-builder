@echo off
setlocal enabledelayedexpansion

echo.
echo   ========================================
echo     MTG Deck Builder Setup (Windows)
echo   ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Install Node.js 18+ from https://nodejs.org
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_VER=%%a
set NODE_VER=%NODE_VER:v=%
if %NODE_VER% lss 18 (
    echo [ERROR] Node.js 18+ required. Please upgrade.
    exit /b 1
)
echo [MTG] Node.js detected

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed.
    exit /b 1
)
echo [MTG] npm detected

:: Install dependencies
if not exist "node_modules" (
    echo [MTG] Installing dependencies...
    call npm install
) else (
    echo [MTG] Dependencies already installed.
)

:: Create data directory
if not exist "data" (
    mkdir data
    echo [MTG] Created data directory.
)

:: Handle flags
if "%1"=="--dev" goto :dev
if "%1"=="--build" goto :build
if "%1"=="--prod" goto :prod
if "%1"=="--seed" goto :seed
if "%1"=="--test" goto :test
goto :help

:dev
echo [MTG] Starting development server on http://localhost:3000
call npm run dev
goto :eof

:build
echo [MTG] Building for production...
call npm run build
echo [MTG] Build complete!
goto :eof

:prod
echo [MTG] Building for production...
call npm run build
echo [MTG] Starting production server on http://localhost:3000
call npm run start
goto :eof

:seed
echo [MTG] Seeding card database from Scryfall...
call npm run db:seed
echo [MTG] Database seeded!
goto :eof

:test
echo [MTG] Running tests...
call npm test
goto :eof

:help
echo.
echo   setup.bat --dev     Start development server
echo   setup.bat --build   Build for production
echo   setup.bat --prod    Build and start production server
echo   setup.bat --seed    Download card database from Scryfall
echo   setup.bat --test    Run test suite
echo.
echo   Quick start: setup.bat --dev
echo.
goto :eof
