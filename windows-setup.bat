@echo off
:: MTG Deck Builder - Windows One-Click Setup Launcher
:: Double-click this file (or right-click -> Run as administrator)
:: It elevates to admin and runs the PowerShell setup script.

:: Check for admin privileges
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: Run the PowerShell setup script
powershell -ExecutionPolicy Bypass -File "%~dp0windows-setup.ps1"
