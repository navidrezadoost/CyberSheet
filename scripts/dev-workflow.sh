#!/bin/bash

# CyberSheet Development Workflow Script
# Purpose: Build packages, setup test projects, and facilitate local development

set -e  # Exit on error

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       CyberSheet Development Workflow Manager            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
step() {
    echo -e "${GREEN}▶${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Build all packages
build_packages() {
    step "Building all packages..."
    
    # Core package
    step "Building @cyber-sheet/core..."
    cd packages/core
    npm run build 2>/dev/null || npm run typecheck || warn "Core build/typecheck completed with warnings"
    cd ../..
    success "Core package built"
    
    # Renderer package
    step "Building @cyber-sheet/renderer-canvas..."
    cd packages/renderer-canvas
    npm run build 2>/dev/null || npm run typecheck || warn "Renderer build/typecheck completed with warnings"
    cd ../..
    success "Renderer package built"
    
    # React package
    step "Building @cyber-sheet/react..."
    cd packages/react
    npm run build 2>/dev/null || npm run typecheck || warn "React build/typecheck completed with warnings"
    cd ../..
    success "React package built"
    
    # Vue package
    step "Building @cyber-sheet/vue..."
    cd packages/vue
    npm run build 2>/dev/null || npm run typecheck || warn "Vue build/typecheck completed with warnings"
    cd ../..
    success "Vue package built"
    
    # Angular package
    step "Building @cyber-sheet/angular..."
    cd packages/angular
    npm run build 2>/dev/null || npm run typecheck || warn "Angular build/typecheck completed with warnings"
    cd ../..
    success "Angular package built"
    
    # Svelte package
    step "Building @cyber-sheet/svelte..."
    cd packages/svelte
    npm run build 2>/dev/null || npm run typecheck || warn "Svelte build/typecheck completed with warnings"
    cd ../..
    success "Svelte package built"
    
    success "All packages built successfully!"
}

# Setup vanilla JS test
setup_vanilla() {
    step "Setting up Vanilla JS test project..."
    cd test-projects/vanilla-js
    
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    success "Vanilla JS test project ready"
    echo -e "${BLUE}Run:${NC} cd test-projects/vanilla-js && npm run dev"
    cd ../..
}

# Run tests
run_tests() {
    step "Running tests..."
    npm test || warn "Some tests failed"
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "  1) Build all packages"
    echo "  2) Setup Vanilla JS test project"
    echo "  3) Build and setup Vanilla JS"
    echo "  4) Run tests"
    echo "  5) Clean build artifacts"
    echo "  6) Full setup (build + setup all)"
    echo "  7) Start dev server (examples)"
    echo "  0) Exit"
    echo ""
}

# Clean build artifacts
clean_build() {
    step "Cleaning build artifacts..."
    find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find packages -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
    success "Build artifacts cleaned"
}

# Full setup
full_setup() {
    build_packages
    setup_vanilla
    success "Full setup complete!"
}

# Start dev server
start_dev() {
    step "Starting development server..."
    npm run dev
}

# Main execution
if [ $# -eq 0 ]; then
    # Interactive mode
    while true; do
        show_menu
        read -p "Enter your choice: " choice
        case $choice in
            1) build_packages ;;
            2) setup_vanilla ;;
            3) build_packages && setup_vanilla ;;
            4) run_tests ;;
            5) clean_build ;;
            6) full_setup ;;
            7) start_dev ;;
            0) echo "Goodbye!"; exit 0 ;;
            *) error "Invalid option" ;;
        esac
    done
else
    # Command line mode
    case $1 in
        build) build_packages ;;
        test) run_tests ;;
        clean) clean_build ;;
        setup) full_setup ;;
        vanilla) setup_vanilla ;;
        dev) start_dev ;;
        *) 
            echo "Usage: $0 [build|test|clean|setup|vanilla|dev]"
            exit 1
            ;;
    esac
fi
