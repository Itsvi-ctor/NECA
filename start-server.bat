@echo off
title NECA Vision — Local Server

:: Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  NECA Computer Vision Project
    echo  ─────────────────────────────
    echo  Starting server with Python...
    echo.
    echo  Open your browser and go to:
    echo  http://localhost:8080
    echo.
    echo  Press Ctrl+C to stop the server.
    echo.
    python -m http.server 8080
    goto :done
)

:: Try py launcher (Windows Python launcher)
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  NECA Computer Vision Project
    echo  ─────────────────────────────
    echo  Starting server with Python (py launcher)...
    echo.
    echo  Open your browser and go to:
    echo  http://localhost:8080
    echo.
    echo  Press Ctrl+C to stop the server.
    echo.
    py -m http.server 8080
    goto :done
)

:: Try Node / npx
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  NECA Computer Vision Project
    echo  ─────────────────────────────
    echo  Starting server with Node (npx serve)...
    echo.
    echo  Open your browser and go to:
    echo  http://localhost:8080
    echo.
    echo  Press Ctrl+C to stop the server.
    echo.
    npx -y serve . --listen 8080
    goto :done
)

:: Nothing found
echo.
echo  ERROR: Neither Python nor Node.js was found.
echo.
echo  Please install one of the following:
echo    Python:  https://www.python.org/downloads/
echo    Node.js: https://nodejs.org/
echo.
echo  After installing, run this file again.
echo.
pause

:done
