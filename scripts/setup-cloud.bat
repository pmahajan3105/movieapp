@echo off
REM CineAI Cloud Setup Script for Windows
REM Automated setup for CineAI with cloud Supabase (no Docker required)

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

REM Create environment file
:create_env_file
call :print_header "Creating Environment Configuration"

call :print_info "Creating .env.local file..."

REM Create .env.local with placeholders
(
echo # ==================================
echo # SUPABASE CONFIGURATION ^(Cloud^)
echo # ==================================
echo # Get these from your Supabase project dashboard
echo NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
echo SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
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

call :print_success ".env.local created"
goto :eof

REM Prompt for API keys
:prompt_for_api_keys
call :print_header "API Keys Configuration"

echo CineAI needs API keys for AI recommendations and movie data:
echo.
echo 1. Supabase Cloud Project ^(Required^)
echo    Get it from: https://supabase.com/dashboard
echo.
echo 2. OpenAI API Key ^(Required for GPT-5-mini^)
echo    Get it from: https://platform.openai.com/api-keys
echo.
echo 3. Anthropic API Key ^(Required for Claude fallback^)
echo    Get it from: https://console.anthropic.com/
echo.
echo 4. TMDB API Key ^(Required for movie data^)
echo    Get it from: https://www.themoviedb.org/settings/api
echo.
pause
echo.

REM Supabase URL
:get_supabase_url
set /p SUPABASE_URL="Enter your Supabase URL (https://xxx.supabase.co): "
if not "%SUPABASE_URL:~0,8%"=="https://" (
    call :print_warning "Invalid Supabase URL format. Please try again."
    goto get_supabase_url
)
powershell -Command "(Get-Content .env.local) -replace 'your_supabase_url_here', '%SUPABASE_URL%' | Set-Content .env.local"
call :print_success "Supabase URL configured"

REM Supabase Anon Key
:get_supabase_anon_key
set /p SUPABASE_ANON_KEY="Enter your Supabase Anon Key: "
if "%SUPABASE_ANON_KEY%"=="" (
    call :print_warning "Supabase Anon Key cannot be empty. Please try again."
    goto get_supabase_anon_key
)
powershell -Command "(Get-Content .env.local) -replace 'your_supabase_anon_key_here', '%SUPABASE_ANON_KEY%' | Set-Content .env.local"
call :print_success "Supabase Anon Key configured"

REM Supabase Service Role Key
:get_supabase_service_key
set /p SUPABASE_SERVICE_KEY="Enter your Supabase Service Role Key: "
if "%SUPABASE_SERVICE_KEY%"=="" (
    call :print_warning "Service Role Key cannot be empty. Please try again."
    goto get_supabase_service_key
)
powershell -Command "(Get-Content .env.local) -replace 'your_service_role_key_here', '%SUPABASE_SERVICE_KEY%' | Set-Content .env.local"
call :print_success "Supabase Service Role Key configured"

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

call :print_success "All validations passed!"
goto :eof

REM Main execution
:main
call :print_header "CineAI Cloud Setup"
echo This script will set up CineAI using cloud Supabase (no Docker required)
echo.

REM Check dependencies
call :print_header "Checking Dependencies"
call :check_node_version

REM Install packages
call :install_packages

REM Create environment file
call :create_env_file

REM Prompt for API keys
call :prompt_for_api_keys

REM Validate setup
call :validate_setup

REM Success message
call :print_header "Setup Complete! 🎉"
echo.
call :print_success "CineAI is ready to run with cloud Supabase!"
echo.
echo Next steps:
echo 1. Start the development server:
echo    %BLUE%npm run dev%NC%
echo.
echo 2. Open your browser to:
echo    %BLUE%http://localhost:3000%NC%
echo.
echo 3. Access your Supabase dashboard:
echo    %BLUE%https://supabase.com/dashboard%NC%
echo.
call :print_info "Your data is stored in your cloud Supabase project!"
echo.

REM Run main function
call :main
