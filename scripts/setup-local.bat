@echo off
REM CineAI Local Setup Script for Windows
REM Automated setup for self-hosted CineAI with local Supabase
REM 
REM This script will:
REM 1. Check for required dependencies
REM 2. Install npm packages
REM 3. Start local Supabase instance
REM 4. Run database migrations
REM 5. Create .env.local with Supabase credentials
REM 6. Prompt for API keys
REM 7. Validate the setup

setlocal enabledelayedexpansion

REM Colors (Windows 10+)
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[32m"
set "RED=%ESC%[31m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "NC=%ESC%[0m"

REM Helper functions
:print_success
echo %GREEN%✅ %~1%NC%
goto :eof

:print_error
echo %RED%❌ %~1%NC%
goto :eof

:print_warning
echo %YELLOW%⚠️  %~1%NC%
goto :eof

:print_info
echo %BLUE%ℹ️  %~1%NC%
goto :eof

:print_header
echo.
echo %BLUE%================================%NC%
echo %BLUE%~1%NC%
echo %BLUE%================================%NC%
echo.
goto :eof

REM Check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel%==0 (
    exit /b 0
) else (
    exit /b 1
)

REM Check Node.js version
:check_node_version
call :command_exists node
if %errorlevel% neq 0 (
    call :print_error "Node.js is not installed"
    echo Please install Node.js 18+ from: https://nodejs.org/
    exit /b 1
)

for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
set NODE_VERSION=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION%") do set NODE_MAJOR=%%i

if %NODE_MAJOR% lss 18 (
    call :print_error "Node.js version %NODE_VERSION% is too old. Please install Node.js 18+"
    exit /b 1
)

call :print_success "Node.js %NODE_VERSION% detected"
goto :eof

REM Check Docker
:check_docker
call :command_exists docker
if %errorlevel% neq 0 (
    call :print_error "Docker is not installed"
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not running"
    echo Please start Docker Desktop and try again
    exit /b 1
)

call :print_success "Docker is running"
goto :eof

REM Check Supabase CLI
:check_supabase_cli
call :command_exists supabase
if %errorlevel% neq 0 (
    call :print_warning "Supabase CLI not found. Installing..."
    
    REM Download and install Supabase CLI for Windows
    echo Downloading Supabase CLI...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip' -OutFile 'supabase.zip'"
    if %errorlevel% neq 0 (
        call :print_error "Failed to download Supabase CLI"
        echo Please install Supabase CLI manually: https://supabase.com/docs/guides/cli/getting-started
        exit /b 1
    )
    
    powershell -Command "Expand-Archive -Path 'supabase.zip' -DestinationPath '.' -Force"
    move supabase.exe C:\Windows\System32\ >nul 2>&1
    del supabase.zip >nul 2>&1
    
    call :command_exists supabase
    if %errorlevel% neq 0 (
        call :print_error "Failed to install Supabase CLI"
        echo Please install Supabase CLI manually: https://supabase.com/docs/guides/cli/getting-started
        exit /b 1
    )
)

call :print_success "Supabase CLI detected"
goto :eof

REM Install npm packages
:install_packages
call :print_header "Installing Dependencies"

if not exist "package.json" (
    call :print_error "package.json not found. Are you in the CineAI directory?"
    exit /b 1
)

call :print_info "Installing npm packages..."
npm install
if %errorlevel% neq 0 (
    call :print_error "Failed to install npm packages"
    exit /b 1
)

call :print_success "Dependencies installed"
goto :eof

REM Start Supabase
:start_supabase
call :print_header "Starting Local Supabase"

call :print_info "Starting Supabase local instance..."

REM Stop any existing instance
supabase stop >nul 2>&1

REM Start Supabase
supabase start
if %errorlevel% neq 0 (
    call :print_error "Failed to start Supabase"
    echo This might be due to port conflicts or Docker issues.
    echo Try running: supabase stop ^&^& supabase start
    exit /b 1
)

call :print_success "Supabase started successfully"
goto :eof

REM Extract Supabase credentials and create .env.local
:create_env_file
call :print_header "Creating Environment Configuration"

REM Get Supabase credentials from status output
for /f "tokens=3" %%i in ('supabase status ^| findstr "API URL"') do set SUPABASE_URL=%%i
for /f "tokens=3" %%i in ('supabase status ^| findstr "anon key"') do set SUPABASE_ANON_KEY=%%i

if "%SUPABASE_URL%"=="" (
    call :print_error "Failed to get Supabase URL"
    echo Make sure Supabase is running with: supabase start
    exit /b 1
)

if "%SUPABASE_ANON_KEY%"=="" (
    call :print_error "Failed to get Supabase anon key"
    echo Make sure Supabase is running with: supabase start
    exit /b 1
)

call :print_info "Creating .env.local file..."

REM Create .env.local with Supabase credentials
(
echo # ==================================
echo # SUPABASE CONFIGURATION ^(Local^)
echo # ==================================
echo # Auto-generated by setup script
echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo.
echo # ==================================
echo # AI PROVIDERS ^(Required^)
echo # ==================================
echo # OpenAI ^(Primary^) - Get key: https://platform.openai.com/api-keys
echo OPENAI_API_KEY=your_openai_key_here
echo.
echo # Anthropic ^(Fallback^) - Get key: https://console.anthropic.com/
echo ANTHROPIC_API_KEY=your_anthropic_key_here
echo.
echo # ==================================
echo # MOVIE DATABASE ^(Required^)
echo # ==================================
echo # TMDB API - Get key: https://www.themoviedb.org/settings/api
echo TMDB_API_KEY=your_tmdb_key_here
echo.
echo # ==================================
echo # AI MODEL CONFIGURATION ^(Optional^)
echo # ==================================
echo # These have sensible defaults, but you can override them
echo AI_DEFAULT_MODEL=gpt-5-mini
echo AI_CHAT_MODEL=gpt-5-mini
echo AI_FAST_MODEL=gpt-5-mini
echo AI_FALLBACK_MODEL=claude-sonnet-4-20250514
echo AI_BEHAVIORAL_MODEL=claude-sonnet-4-20250514
echo.
echo # ==================================
echo # DEVELOPMENT SETTINGS
echo # ==================================
echo NODE_ENV=development
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
) > .env.local

call :print_success ".env.local created with Supabase credentials"
goto :eof

REM Prompt for API keys
:prompt_for_api_keys
call :print_header "API Keys Configuration"

echo CineAI needs API keys for AI recommendations and movie data:
echo.
echo 1. OpenAI API Key ^(Required for GPT-5-mini^)
echo    Get it from: https://platform.openai.com/api-keys
echo.
echo 2. Anthropic API Key ^(Required for Claude fallback^)
echo    Get it from: https://console.anthropic.com/
echo.
echo 3. TMDB API Key ^(Required for movie data^)
echo    Get it from: https://www.themoviedb.org/settings/api
echo.
pause
echo.

REM OpenAI API Key
:get_openai_key
set /p OPENAI_KEY="Enter your OpenAI API Key (starts with sk-): "
if not "%OPENAI_KEY:~0,3%"=="sk-" (
    call :print_warning "Invalid OpenAI API key format. Please try again."
    goto get_openai_key
)
powershell -Command "(Get-Content .env.local) -replace 'your_openai_key_here', '%OPENAI_KEY%' | Set-Content .env.local"
call :print_success "OpenAI API key configured"

REM Anthropic API Key
:get_anthropic_key
set /p ANTHROPIC_KEY="Enter your Anthropic API Key (starts with sk-ant-): "
if not "%ANTHROPIC_KEY:~0,7%"=="sk-ant-" (
    call :print_warning "Invalid Anthropic API key format. Please try again."
    goto get_anthropic_key
)
powershell -Command "(Get-Content .env.local) -replace 'your_anthropic_key_here', '%ANTHROPIC_KEY%' | Set-Content .env.local"
call :print_success "Anthropic API key configured"

REM TMDB API Key
:get_tmdb_key
set /p TMDB_KEY="Enter your TMDB API Key: "
if "%TMDB_KEY%"=="" (
    call :print_warning "TMDB API key cannot be empty. Please try again."
    goto get_tmdb_key
)
powershell -Command "(Get-Content .env.local) -replace 'your_tmdb_key_here', '%TMDB_KEY%' | Set-Content .env.local"
call :print_success "TMDB API key configured"
goto :eof

REM Validate setup
:validate_setup
call :print_header "Validating Setup"

if not exist ".env.local" (
    call :print_error ".env.local file not found"
    exit /b 1
)

REM Check if Supabase is still running
supabase status >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Supabase is not running"
    exit /b 1
)

call :print_success "All validations passed!"
goto :eof

REM Main execution
:main
call :print_header "CineAI Local Setup"
echo This script will set up CineAI for local development with Supabase
echo.

REM Check dependencies
call :print_header "Checking Dependencies"
call :check_node_version
call :check_docker
call :check_supabase_cli

REM Install packages
call :install_packages

REM Start Supabase
call :start_supabase

REM Create environment file
call :create_env_file

REM Prompt for API keys
call :prompt_for_api_keys

REM Validate setup
call :validate_setup

REM Success message
call :print_header "Setup Complete! 🎉"
echo.
call :print_success "CineAI is ready to run locally!"
echo.
echo Next steps:
echo 1. Start the development server:
echo    %BLUE%npm run dev%NC%
echo.
echo 2. Open your browser to:
echo    %BLUE%http://localhost:3000%NC%
echo.
echo 3. Access Supabase Studio (database UI):
echo    %BLUE%supabase studio%NC%
echo.
echo 4. To stop Supabase when done:
echo    %BLUE%supabase stop%NC%
echo.
call :print_info "Your data is stored locally and completely private!"
echo.

REM Run main function
call :main
