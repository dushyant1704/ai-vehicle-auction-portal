@echo off
REM Damage Detection Service Setup Script (Windows)

echo ===================================================================
echo   DAMAGE DETECTION SERVICE - SETUP (Windows)
echo ===================================================================

REM Check Python version
echo.
echo Checking Python version...
python --version

REM Create virtual environment
echo.
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo.
echo Installing requirements...
pip install -r requirements.txt

REM Create necessary directories
echo.
echo Creating directories...
if not exist "temp" mkdir temp
if not exist "test_images" mkdir test_images

REM Copy .env.example to .env if not exists
if not exist ".env" (
    echo.
    echo Creating .env file from template...
    copy .env.example .env
    echo [OK] .env file created
    echo [!] Please configure .env with your settings
) else (
    echo.
    echo [OK] .env file already exists
)

REM Check for YOLO model
echo.
echo Checking for YOLO model...
if exist "yolov8_damage.pt" (
    echo [OK] YOLO model found: yolov8_damage.pt
) else (
    echo [!] YOLO model not found!
    echo    Please copy your trained model to: yolov8_damage.pt
    echo    Or update YOLO_MODEL_PATH in .env
)

echo.
echo ===================================================================
echo   SETUP COMPLETE
echo ===================================================================
echo.
echo Next steps:
echo   1. Configure .env file
echo   2. Place YOLO model at: yolov8_damage.pt
echo   3. Add test images to: test_images\
echo   4. Run the service: python app.py
echo   5. Test endpoints: python test_service.py
echo.
pause
