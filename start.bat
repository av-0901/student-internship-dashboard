@echo off
setlocal
title Student ^& Internship Analytics - Launcher
cd /d "%~dp0"

rem Prefer the system-wide Node.js install if present (avoids broken per-user nvm links).
if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"

where python >nul 2>nul || (echo [ERROR] Python 3.10+ not found on PATH. & pause & exit /b 1)
where npm >nul 2>nul || (echo [ERROR] Node.js / npm not found on PATH. & pause & exit /b 1)

echo === Backend setup ===
if not exist "backend\venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv backend\venv || (echo [ERROR] venv creation failed & pause & exit /b 1)
)
backend\venv\Scripts\python.exe -m pip install -q -r backend\requirements.txt || (echo [ERROR] pip install failed & pause & exit /b 1)

if not exist "outputs\internship_professional.csv" (
    echo Running data-processing pipeline...
    pushd backend
    venv\Scripts\python.exe data_processing.py || (popd & echo [ERROR] pipeline failed & pause & exit /b 1)
    popd
)

echo === Frontend setup ===
if not exist "frontend\node_modules" (
    echo Installing frontend packages - first run only...
    pushd frontend
    call npm install --no-audit --no-fund || (popd & echo [ERROR] npm install failed & pause & exit /b 1)
    popd
)

echo === Starting servers ===
start "Analytics API (port 8000)" /D "%~dp0backend" cmd /k "venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
start "Analytics Web (port 5173)" /D "%~dp0frontend" cmd /k "npm run dev"

echo Waiting for the servers to start...
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo  Dashboard : http://localhost:5173
echo  API       : http://localhost:8000
echo  API docs  : http://localhost:8000/docs
echo.
echo Close the two server windows to stop the application.
endlocal
