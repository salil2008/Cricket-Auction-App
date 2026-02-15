#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      BWPL AUCTION 2026                   ║${NC}"
echo -e "${CYAN}║      Bangalore Willows Cricket Club      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed!${NC}"
    echo ""
    echo "Please install Node.js first:"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  Option 1: Using Homebrew (recommended)"
        echo "    brew install node"
        echo ""
        echo "  Option 2: Download from website"
        echo "    Go to https://nodejs.org"
        echo "    Download the macOS installer"
        echo "    Install it"
    else
        echo "  Option 1: Using package manager"
        echo "    Ubuntu/Debian: sudo apt install nodejs npm"
        echo "    Fedora: sudo dnf install nodejs"
        echo ""
        echo "  Option 2: Download from https://nodejs.org"
    fi
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js found: $(node --version)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}[SETUP]${NC} First time setup - installing dependencies..."
    echo "This may take 1-2 minutes..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}[ERROR] Failed to install dependencies!${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo ""
    echo -e "${GREEN}[OK]${NC} Dependencies installed!"
fi

echo ""
echo -e "${GREEN}[STARTING]${NC} Launching BWPL Auction..."
echo ""
echo "┌────────────────────────────────────────────┐"
echo "│  The app will open in your browser.        │"
echo "│                                            │"
echo "│  Admin Panel: http://localhost:4173/admin  │"
echo "│  Presentation: http://localhost:4173       │"
echo "│                                            │"
echo "│  Keep this window open while using the app │"
echo "│  Press Ctrl+C to stop the server           │"
echo "└────────────────────────────────────────────┘"
echo ""

# Open browser after 2 seconds (in background)
(sleep 2 && open "http://localhost:4173/admin" 2>/dev/null || xdg-open "http://localhost:4173/admin" 2>/dev/null) &

# Start the preview server
npm run preview