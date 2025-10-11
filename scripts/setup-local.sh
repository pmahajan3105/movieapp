#!/bin/bash

# CineAI Local Setup Script
# Automated setup for self-hosted CineAI with local Supabase
# 
# This script will:
# 1. Check for required dependencies
# 2. Install npm packages
# 3. Start local Supabase instance
# 4. Run database migrations
# 5. Create .env.local with Supabase credentials
# 6. Prompt for API keys
# 7. Validate the setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_node_version() {
    if ! command_exists node; then
        print_error "Node.js is not installed"
        echo "Please install Node.js 18+ from: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+"
        exit 1
    fi
    
    print_success "Node.js $(node --version) detected"
}

# Check Docker
check_docker() {
    if ! command_exists docker; then
        print_warning "Docker is not installed"
        echo ""
        print_info "Would you like to install Docker automatically? (y/n)"
        read -p "> " INSTALL_DOCKER
        
        if [[ $INSTALL_DOCKER =~ ^[Yy]$ ]]; then
            print_info "Installing Docker..."
            ./scripts/install-docker.sh
        else
            print_error "Docker is required for local Supabase"
            echo "Please install Docker from: https://www.docker.com/products/docker-desktop/"
            echo "Or use the cloud setup: ./scripts/setup-cloud.sh"
            exit 1
        fi
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        echo "Please start Docker Desktop and try again"
        exit 1
    fi
    
    print_success "Docker is running"
}

# Check Supabase CLI
check_supabase_cli() {
    if ! command_exists supabase; then
        print_warning "Supabase CLI not found. Installing..."
        
        # Detect OS and install accordingly
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command_exists brew; then
                brew install supabase/tap/supabase
            else
                print_error "Homebrew not found. Please install Supabase CLI manually:"
                echo "https://supabase.com/docs/guides/cli/getting-started"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -fsSL https://supabase.com/install.sh | sh
            export PATH="$HOME/.local/bin:$PATH"
        else
            print_error "Unsupported OS. Please install Supabase CLI manually:"
            echo "https://supabase.com/docs/guides/cli/getting-started"
            exit 1
        fi
    fi
    
    print_success "Supabase CLI $(supabase --version | head -n1) detected"
}

# Install npm packages
install_packages() {
    print_header "Installing Dependencies"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the CineAI directory?"
        exit 1
    fi
    
    print_info "Installing npm packages..."
    npm install
    
    print_success "Dependencies installed"
}

# Start Supabase
start_supabase() {
    print_header "Starting Local Supabase"
    
    print_info "Starting Supabase local instance..."
    
    # Stop any existing instance
    supabase stop >/dev/null 2>&1 || true
    
    # Start Supabase
    if supabase start; then
        print_success "Supabase started successfully"
    else
        print_error "Failed to start Supabase"
        echo "This might be due to port conflicts or Docker issues."
        echo "Try running: supabase stop && supabase start"
        exit 1
    fi
}

# Extract Supabase credentials and create .env.local
create_env_file() {
    print_header "Creating Environment Configuration"
    
    # Get Supabase credentials
    SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    SUPABASE_ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        print_error "Failed to get Supabase credentials"
        echo "Make sure Supabase is running with: supabase start"
        exit 1
    fi
    
    print_info "Creating .env.local file..."
    
    # Create .env.local with Supabase credentials
    cat > .env.local << EOF
# ==================================
# SUPABASE CONFIGURATION (Local)
# ==================================
# Auto-generated by setup script
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# ==================================
# AI PROVIDERS (Required)
# ==================================
# OpenAI (Primary) - Get key: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_key_here

# Anthropic (Fallback) - Get key: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_key_here

# ==================================
# MOVIE DATABASE (Required)
# ==================================
# TMDB API - Get key: https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_key_here

# ==================================
# AI MODEL CONFIGURATION (Optional)
# ==================================
# These have sensible defaults, but you can override them
AI_DEFAULT_MODEL=gpt-5-mini
AI_CHAT_MODEL=gpt-5-mini
AI_FAST_MODEL=gpt-5-mini
AI_FALLBACK_MODEL=claude-sonnet-4-20250514
AI_BEHAVIORAL_MODEL=claude-sonnet-4-20250514

# ==================================
# DEVELOPMENT SETTINGS
# ==================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

    print_success ".env.local created with Supabase credentials"
}

# Prompt for API keys
prompt_for_api_keys() {
    print_header "API Keys Configuration"
    
    echo "CineAI needs API keys for AI recommendations and movie data:"
    echo ""
    echo "1. OpenAI API Key (Required for GPT-5-mini)"
    echo "   Get it from: https://platform.openai.com/api-keys"
    echo ""
    echo "2. Anthropic API Key (Required for Claude fallback)"
    echo "   Get it from: https://console.anthropic.com/"
    echo ""
    echo "3. TMDB API Key (Required for movie data)"
    echo "   Get it from: https://www.themoviedb.org/settings/api"
    echo ""
    
    read -p "Press Enter when you have your API keys ready..."
    echo ""
    
    # OpenAI API Key
    while true; do
        read -p "Enter your OpenAI API Key (starts with sk-): " OPENAI_KEY
        if [[ $OPENAI_KEY =~ ^sk- ]]; then
            sed -i.bak "s/your_openai_key_here/$OPENAI_KEY/" .env.local
            print_success "OpenAI API key configured"
            break
        else
            print_warning "Invalid OpenAI API key format. Please try again."
        fi
    done
    
    # Anthropic API Key
    while true; do
        read -p "Enter your Anthropic API Key (starts with sk-ant-): " ANTHROPIC_KEY
        if [[ $ANTHROPIC_KEY =~ ^sk-ant- ]]; then
            sed -i.bak "s/your_anthropic_key_here/$ANTHROPIC_KEY/" .env.local
            print_success "Anthropic API key configured"
            break
        else
            print_warning "Invalid Anthropic API key format. Please try again."
        fi
    done
    
    # TMDB API Key
    while true; do
        read -p "Enter your TMDB API Key: " TMDB_KEY
        if [[ ! -z "$TMDB_KEY" ]]; then
            sed -i.bak "s/your_tmdb_key_here/$TMDB_KEY/" .env.local
            print_success "TMDB API key configured"
            break
        else
            print_warning "TMDB API key cannot be empty. Please try again."
        fi
    done
    
    # Clean up backup file
    rm -f .env.local.bak
}

# Validate setup
validate_setup() {
    print_header "Validating Setup"
    
    # Check if .env.local exists and has required variables
    if [ ! -f ".env.local" ]; then
        print_error ".env.local file not found"
        exit 1
    fi
    
    # Check for required environment variables
    source .env.local
    
    if [ "$OPENAI_API_KEY" = "your_openai_key_here" ]; then
        print_error "OpenAI API key not configured"
        exit 1
    fi
    
    if [ "$ANTHROPIC_API_KEY" = "your_anthropic_key_here" ]; then
        print_error "Anthropic API key not configured"
        exit 1
    fi
    
    if [ "$TMDB_API_KEY" = "your_tmdb_key_here" ]; then
        print_error "TMDB API key not configured"
        exit 1
    fi
    
    # Check if Supabase is still running
    if ! supabase status >/dev/null 2>&1; then
        print_error "Supabase is not running"
        exit 1
    fi
    
    print_success "All validations passed!"
}

# Main execution
main() {
    print_header "CineAI Local Setup"
    echo "This script will set up CineAI for local development with Supabase"
    echo ""
    
    # Check dependencies
    print_header "Checking Dependencies"
    check_node_version
    check_docker
    check_supabase_cli
    
    # Install packages
    install_packages
    
    # Start Supabase
    start_supabase
    
    # Create environment file
    create_env_file
    
    # Prompt for API keys
    prompt_for_api_keys
    
    # Validate setup
    validate_setup
    
    # Success message
    print_header "Setup Complete! 🎉"
    echo ""
    print_success "CineAI is ready to run locally!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   ${BLUE}npm run dev${NC}"
    echo ""
    echo "2. Open your browser to:"
    echo "   ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "3. Access Supabase Studio (database UI):"
    echo "   ${BLUE}supabase studio${NC}"
    echo ""
    echo "4. To stop Supabase when done:"
    echo "   ${BLUE}supabase stop${NC}"
    echo ""
    print_info "Your data is stored locally and completely private!"
    echo ""
}

# Run main function
main "$@"
