#!/bin/bash

# CineAI Cloud Setup Script
# Alternative setup using cloud Supabase (no Docker required)

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

# Check Node.js
check_node() {
    if ! command -v node >/dev/null 2>&1; then
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

# Install packages
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

# Create environment file
create_env_file() {
    print_header "Creating Environment Configuration"
    
    print_info "Creating .env.local file..."
    
    # Create .env.local with placeholders
    cat > .env.local << EOF
# ==================================
# SUPABASE CONFIGURATION (Cloud)
# ==================================
# Get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

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

    print_success ".env.local created"
}

# Prompt for API keys
prompt_for_api_keys() {
    print_header "API Keys Configuration"
    
    echo "CineAI needs API keys for AI recommendations and movie data:"
    echo ""
    echo "1. Supabase Cloud Project (Required)"
    echo "   Get it from: https://supabase.com/dashboard"
    echo ""
    echo "2. OpenAI API Key (Required for GPT-5-mini)"
    echo "   Get it from: https://platform.openai.com/api-keys"
    echo ""
    echo "3. Anthropic API Key (Required for Claude fallback)"
    echo "   Get it from: https://console.anthropic.com/"
    echo ""
    echo "4. TMDB API Key (Required for movie data)"
    echo "   Get it from: https://www.themoviedb.org/settings/api"
    echo ""
    
    read -p "Press Enter when you have your API keys ready..."
    echo ""
    
    # Supabase URL
    while true; do
        read -p "Enter your Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
        if [[ $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
            sed -i.bak "s/your_supabase_url_here/$SUPABASE_URL/" .env.local
            print_success "Supabase URL configured"
            break
        else
            print_warning "Invalid Supabase URL format. Please try again."
        fi
    done
    
    # Supabase Anon Key
    while true; do
        read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
        if [[ ! -z "$SUPABASE_ANON_KEY" ]]; then
            sed -i.bak "s/your_supabase_anon_key_here/$SUPABASE_ANON_KEY/" .env.local
            print_success "Supabase Anon Key configured"
            break
        else
            print_warning "Supabase Anon Key cannot be empty. Please try again."
        fi
    done
    
    # Supabase Service Role Key
    while true; do
        read -p "Enter your Supabase Service Role Key: " SUPABASE_SERVICE_KEY
        if [[ ! -z "$SUPABASE_SERVICE_KEY" ]]; then
            sed -i.bak "s/your_service_role_key_here/$SUPABASE_SERVICE_KEY/" .env.local
            print_success "Supabase Service Role Key configured"
            break
        else
            print_warning "Service Role Key cannot be empty. Please try again."
        fi
    done
    
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
    
    if [ "$NEXT_PUBLIC_SUPABASE_URL" = "your_supabase_url_here" ]; then
        print_error "Supabase URL not configured"
        exit 1
    fi
    
    print_success "All validations passed!"
}

# Main execution
main() {
    print_header "CineAI Cloud Setup"
    echo "This script will set up CineAI using cloud Supabase (no Docker required)"
    echo ""
    
    # Check dependencies
    print_header "Checking Dependencies"
    check_node
    
    # Install packages
    install_packages
    
    # Create environment file
    create_env_file
    
    # Prompt for API keys
    prompt_for_api_keys
    
    # Validate setup
    validate_setup
    
    # Success message
    print_header "Setup Complete! 🎉"
    echo ""
    print_success "CineAI is ready to run with cloud Supabase!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   ${BLUE}npm run dev${NC}"
    echo ""
    echo "2. Open your browser to:"
    echo "   ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "3. Access your Supabase dashboard:"
    echo "   ${BLUE}https://supabase.com/dashboard${NC}"
    echo ""
    print_info "Your data is stored in your cloud Supabase project!"
    echo ""
}

# Run main function
main "$@"
