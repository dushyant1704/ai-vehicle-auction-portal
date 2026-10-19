#!/bin/bash
# Damage Detection Service Setup Script

echo "═══════════════════════════════════════════════════════════════════"
echo "  DAMAGE DETECTION SERVICE - SETUP"
echo "═══════════════════════════════════════════════════════════════════"

# Check Python version
echo ""
echo "Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment
echo ""
echo "Creating virtual environment..."
python -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo ""
echo "Installing requirements..."
pip install -r requirements.txt

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p temp
mkdir -p test_images

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please configure .env with your settings"
else
    echo ""
    echo "✅ .env file already exists"
fi

# Check for YOLO model
echo ""
echo "Checking for YOLO model..."
if [ -f yolov8_damage.pt ]; then
    echo "✅ YOLO model found: yolov8_damage.pt"
else
    echo "⚠️  YOLO model not found!"
    echo "   Please copy your trained model to: yolov8_damage.pt"
    echo "   Or update YOLO_MODEL_PATH in .env"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  SETUP COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure .env file"
echo "  2. Place YOLO model at: yolov8_damage.pt"
echo "  3. Add test images to: test_images/"
echo "  4. Run the service: python app.py"
echo "  5. Test endpoints: python test_service.py"
echo ""
