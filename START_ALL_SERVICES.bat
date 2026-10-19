@echo off
echo ═══════════════════════════════════════════════════════════════════
echo AI AUCTION PORTAL - ALL SERVICES LAUNCHER
echo ═══════════════════════════════════════════════════════════════════
echo.

REM Check if running from correct directory
if not exist "ai auction portal backend" (
    echo ERROR: Please run this script from the project root directory
    echo Expected directory structure:
    echo   - ai auction portal backend\
    echo   - ai-auction-frontend\
    echo   - damage-detection\
    pause
    exit /b 1
)

echo Starting all services...
echo.

REM ── Start MongoDB (if not already running) ──────────────────────
echo [1/5] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo       MongoDB is already running ✓
) else (
    echo       Starting MongoDB...
    start "MongoDB" mongod
    timeout /t 3 /nobreak >nul
)
echo.

REM ── Start XGBoost ML Service (port 5001) ────────────────────────
echo [2/5] Starting XGBoost ML Service (port 5001)...
cd "ai auction portal backend\ml"
if exist "venv\Scripts\activate.bat" (
    start "XGBoost ML Service" cmd /k "venv\Scripts\activate && python app.py"
) else (
    start "XGBoost ML Service" cmd /k "python app.py"
)
cd ..\..
timeout /t 2 /nobreak >nul
echo       XGBoost service started ✓
echo.

REM ── Start YOLO Damage Detection Service (port 5002) ─────────────
echo [3/5] Starting YOLO Damage Detection Service (port 5002)...
cd "ai auction portal backend\damage-service"
if exist "venv\Scripts\activate.bat" (
    start "YOLO Damage Service" cmd /k "venv\Scripts\activate && python app.py"
) else (
    start "YOLO Damage Service" cmd /k "python app.py"
)
cd ..\..
timeout /t 2 /nobreak >nul
echo       YOLO service started ✓
echo.

REM ── Start Node.js Backend (port 5000) ───────────────────────────
echo [4/5] Starting Node.js Backend (port 5000)...
cd "ai auction portal backend"
start "Node.js Backend" cmd /k "node server.js"
cd ..
timeout /t 2 /nobreak >nul
echo       Backend server started ✓
echo.

REM ── Start React Frontend (port 5173) ────────────────────────────
echo [5/5] Starting React Frontend (port 5173)...
cd "ai-auction-frontend"
start "React Frontend" cmd /k "npm run dev"
cd ..
timeout /t 2 /nobreak >nul
echo       Frontend started ✓
echo.

echo ═══════════════════════════════════════════════════════════════════
echo ALL SERVICES LAUNCHED SUCCESSFULLY
echo ═══════════════════════════════════════════════════════════════════
echo.
echo Services running:
echo   • MongoDB:         mongodb://localhost:27017
echo   • XGBoost ML:      http://localhost:5001
echo   • Damage Detection: http://localhost:5002
echo   • Backend API:     http://localhost:5000
echo   • Frontend:        http://localhost:5173
echo.
echo Press any key to open the application in your browser...
pause >nul

start http://localhost:5173

echo.
echo NOTE: Keep this window open to see the status of all services.
echo To stop all services, close this window and all terminal windows.
echo ═══════════════════════════════════════════════════════════════════
pause
