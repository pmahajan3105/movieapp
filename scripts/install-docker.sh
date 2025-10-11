#!/bin/bash

# Docker Auto-Install Script for CineAI
# Automatically installs Docker based on the operating system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Install Docker on macOS
install_docker_macos() {
    print_header "Installing Docker on macOS"
    
    # Check if Homebrew is installed
    if ! command -v brew >/dev/null 2>&1; then
        print_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install Docker Desktop
    print_info "Installing Docker Desktop..."
    brew install --cask docker
    
    print_success "Docker Desktop installed"
    print_warning "Please start Docker Desktop from Applications and wait for it to be ready"
    print_info "You can start it with: open -a Docker"
    
    # Wait for user to start Docker
    read -p "Press Enter when Docker Desktop is running (green icon in menu bar)..."
    
    # Verify Docker is running
    if docker info >/dev/null 2>&1; then
        print_success "Docker is running"
    else
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
}

# Install Docker on Linux
install_docker_linux() {
    print_header "Installing Docker on Linux"
    
    # Update package index
    print_info "Updating package index..."
    sudo apt-get update
    
    # Install prerequisites
    print_info "Installing prerequisites..."
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    print_info "Adding Docker's GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    print_info "Adding Docker repository..."
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    print_info "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    print_info "Adding user to docker group..."
    sudo usermod -aG docker $USER
    
    # Start Docker service
    print_info "Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installed successfully"
    print_warning "Please log out and log back in for group changes to take effect"
    print_info "Or run: newgrp docker"
    
    # Test Docker
    if docker --version >/dev/null 2>&1; then
        print_success "Docker is working"
    else
        print_error "Docker installation failed"
        exit 1
    fi
}

# Install Docker on Windows
install_docker_windows() {
    print_header "Installing Docker on Windows"
    
    print_info "Downloading Docker Desktop for Windows..."
    
    # Download Docker Desktop
    curl -L "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -o "DockerDesktopInstaller.exe"
    
    print_info "Running Docker Desktop installer..."
    print_warning "Please follow the installer prompts and restart your computer when prompted"
    
    # Run installer
    ./DockerDesktopInstaller.exe
    
    print_success "Docker Desktop installed"
    print_warning "Please restart your computer and start Docker Desktop"
    print_info "After restart, start Docker Desktop and wait for it to be ready"
    
    # Clean up
    rm -f DockerDesktopInstaller.exe
}

# Main installation function
main() {
    print_header "Docker Auto-Install for CineAI"
    
    OS=$(detect_os)
    print_info "Detected operating system: $OS"
    
    case $OS in
        "macos")
            install_docker_macos
            ;;
        "linux")
            install_docker_linux
            ;;
        "windows")
            install_docker_windows
            ;;
        *)
            print_error "Unsupported operating system: $OSTYPE"
            print_info "Please install Docker manually from: https://www.docker.com/products/docker-desktop/"
            exit 1
            ;;
    esac
    
    print_header "Docker Installation Complete"
    print_success "Docker is now installed and running"
    print_info "You can now run the CineAI setup script: ./scripts/setup-local.sh"
}

# Run main function
main "$@"
