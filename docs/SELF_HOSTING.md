# 🏠 CineAI Self-Hosting Guide

Complete guide for running CineAI locally with your own data and complete privacy.

## 📖 Table of Contents

- [What is Self-Hosting?](#what-is-self-hosting)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Setup Methods](#setup-methods)
- [Configuration](#configuration)
- [Daily Usage](#daily-usage)
- [Data Privacy](#data-privacy)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## What is Self-Hosting?

Self-hosting means running CineAI entirely on your own machine with your own data. This provides:

- **🔒 Complete Privacy** - Your data never leaves your machine
- **🎛️ Full Control** - You own and control all your data
- **💰 Cost Savings** - No cloud hosting fees
- **⚡ Better Performance** - No network latency for database operations
- **🛡️ Security** - No external dependencies except API calls

## Architecture Overview

### Local Setup Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Machine                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   CineAI App    │    │  Local Supabase │                │
│  │   (Next.js)     │◄──►│   (PostgreSQL)  │                │
│  │   Port: 3000    │    │   Port: 54321   │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Supabase      │    │   Docker        │                │
│  │   Studio        │    │   Containers    │                │
│  │   Port: 54323   │    │   (Database)    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                External APIs (Optional)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   OpenAI API    │  │ Anthropic API   │  │  TMDB API    │ │
│  │  (GPT-5-mini)   │  │ (Claude 4.5)    │  │ (Movie Data) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interface** - Next.js app running on port 3000
2. **Local Database** - Supabase PostgreSQL running in Docker
3. **AI Processing** - External API calls to OpenAI/Anthropic
4. **Movie Data** - External API calls to TMDB
5. **Data Storage** - All user data stored locally in PostgreSQL

## Prerequisites

### System Requirements

- **Operating System**: macOS, Windows, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for API calls

### Required Software

#### 1. Node.js 18+
```bash
# Check if installed
node --version

# Install if needed
# macOS: brew install node
# Windows: Download from https://nodejs.org/
# Linux: sudo apt install nodejs npm
```

#### 2. Docker Desktop
```bash
# Check if installed
docker --version

# Install if needed
# macOS: Download from https://www.docker.com/products/docker-desktop/
# Windows: Download from https://www.docker.com/products/docker-desktop/
# Linux: Follow Docker installation guide
```

#### 3. Git (for cloning)
```bash
# Check if installed
git --version

# Install if needed
# macOS: xcode-select --install
# Windows: Download from https://git-scm.com/
# Linux: sudo apt install git
```

### API Keys Required

You'll need API keys for external services:

#### OpenAI API Key (Required)
- **Purpose**: Primary AI for recommendations and chat
- **Model**: GPT-5-mini
- **Cost**: ~$0.004 per 1K input tokens
- **Get it**: [OpenAI API Keys](https://platform.openai.com/api-keys)

#### Anthropic API Key (Required)
- **Purpose**: Fallback AI for complex analysis
- **Model**: Claude 4.5 Sonnet
- **Cost**: ~$0.003 per 1K input tokens
- **Get it**: [Anthropic Console](https://console.anthropic.com/)

#### TMDB API Key (Required)
- **Purpose**: Movie database and metadata
- **Cost**: Free
- **Get it**: [TMDB Settings](https://www.themoviedb.org/settings/api)

## Setup Methods

### Method 1: Automated Setup (Recommended)

The easiest way to get started:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/cineai.git
cd cineai

# 2. Run automated setup
# Mac/Linux:
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh

# Windows:
scripts\setup-local.bat

# 3. Start the app
npm run dev
```

The setup script will:
- ✅ Check all dependencies
- ✅ Install npm packages
- ✅ Start local Supabase
- ✅ Run database migrations
- ✅ Create environment configuration
- ✅ Guide you through API key setup
- ✅ Validate everything is working

### Method 2: Manual Setup (Advanced)

For users who prefer manual control:

#### Step 1: Install Dependencies
```bash
# Install npm packages
npm install

# Install Supabase CLI
# macOS:
brew install supabase/tap/supabase

# Windows:
# Download from GitHub releases

# Linux:
curl -fsSL https://supabase.com/install.sh | sh
```

#### Step 2: Start Supabase
```bash
# Start local Supabase
supabase start

# This will output:
# API URL: http://127.0.0.1:54321
# anon key: your-anon-key
# service_role key: your-service-role-key
```

#### Step 3: Create Environment File
```bash
# Copy example file
cp env.example .env.local

# Edit with your Supabase credentials
nano .env.local
```

Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Step 4: Add API Keys
```env
# Add your API keys
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
TMDB_API_KEY=your-tmdb-key
```

#### Step 5: Start the App
```bash
npm run dev
```

## Configuration

### Environment Variables

All configuration is done through `.env.local`:

#### Supabase Configuration (Auto-generated)
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

#### AI Provider Configuration
```env
# OpenAI (Primary)
OPENAI_API_KEY=sk-your-openai-key

# Anthropic (Fallback)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

#### Movie Database Configuration
```env
# TMDB API
TMDB_API_KEY=your-tmdb-key
```

#### AI Model Configuration (Optional)
```env
# Override default models
AI_DEFAULT_MODEL=gpt-5-mini
AI_CHAT_MODEL=gpt-5-mini
AI_FAST_MODEL=gpt-5-mini
AI_FALLBACK_MODEL=claude-sonnet-4-20250514
AI_BEHAVIORAL_MODEL=claude-sonnet-4-20250514
```

#### Development Settings
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Supabase Configuration

The local Supabase instance is configured in `supabase/config.toml`:

```toml
[api]
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
port = 54323
```

### Database Schema

CineAI uses the following main tables:

- **profiles** - User profiles and preferences
- **movies** - Movie database with TMDB integration
- **ratings** - User movie ratings
- **watchlist** - User saved movies
- **user_behavior_signals** - Learning data
- **chat_sessions** - Conversation history

## Daily Usage

### Starting CineAI

```bash
# Start Supabase (if not running)
supabase start

# Start the app
npm run dev

# Open browser to http://localhost:3000
```

### Stopping CineAI

```bash
# Stop the app (Ctrl+C in terminal)

# Stop Supabase
supabase stop
```

### Accessing Database UI

```bash
# Open Supabase Studio
supabase studio

# This opens http://localhost:54323
# You can view/edit your data here
```

### Useful Commands

```bash
# Check if everything is working
npm run setup

# Start Supabase only
npm run db:start

# Stop Supabase
npm run db:stop

# Reset database (if needed)
npm run db:reset

# Open database UI
npm run db:studio

# Check app health
npm run health

# Backup your data
npm run backup
```

## Data Privacy

### What Data is Stored Locally

- **User profiles** - Your preferences and settings
- **Movie ratings** - Your ratings and reviews
- **Watchlist** - Movies you want to watch
- **Behavior data** - How you interact with recommendations
- **Chat history** - Your conversations with AI
- **Recommendations** - Personalized movie suggestions

### What Data is NOT Stored

- **Audio recordings** - Voice chat uses browser APIs only
- **Personal information** - No tracking or analytics
- **Usage patterns** - No external analytics services

### Data Location

All data is stored in:
- **Database**: Local PostgreSQL (Docker container)
- **Files**: Local filesystem in your project directory
- **Backups**: Local backup files (if you create them)

### External API Calls

The only external calls are:
- **OpenAI API** - For AI recommendations and chat
- **Anthropic API** - For fallback AI processing
- **TMDB API** - For movie metadata and images

## Troubleshooting

### Common Issues

#### Supabase Won't Start
```bash
# Check Docker is running
docker --version

# Restart Docker Desktop
# Then try:
supabase stop
supabase start
```

#### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or use different port
npm run dev -- -p 3001
```

#### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Reset database
supabase db reset

# Check logs
supabase logs
```

#### API Key Issues
```bash
# Validate your setup
npm run setup

# Check environment variables
cat .env.local
```

### Getting Help

1. **Check the logs**: `supabase logs`
2. **Validate setup**: `npm run setup`
3. **Check health**: `npm run health`
4. **Read troubleshooting guide**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Advanced Topics

### Custom Configuration

#### Changing Ports
Edit `supabase/config.toml`:
```toml
[api]
port = 54321  # Change this

[db]
port = 54322  # Change this

[studio]
port = 54323  # Change this
```

#### Database Backups
```bash
# Create backup
supabase db dump --data-only > backup.sql

# Restore backup
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
```

#### Performance Tuning
```bash
# Increase Docker memory limit
# In Docker Desktop settings:
# Resources > Memory > 4GB

# Optimize database
supabase db optimize
```

### Security Considerations

#### API Key Security
- Store keys in `.env.local` (not committed to git)
- Use different keys for development/production
- Rotate keys regularly

#### Network Security
- CineAI only listens on localhost by default
- No external network access required
- Firewall can block all external connections except API calls

#### Data Encryption
- Database is not encrypted by default (local use)
- Consider encrypting backup files
- Use full-disk encryption on your machine

### Scaling Considerations

#### Resource Usage
- **RAM**: ~2GB for Supabase + 1GB for Next.js
- **CPU**: Minimal usage when idle
- **Storage**: ~100MB for database + 1GB for app

#### Performance Limits
- **Concurrent users**: 1 (single-user app)
- **Database size**: Limited by available disk space
- **API rate limits**: Respect OpenAI/Anthropic/TMDB limits

### Migration and Backup

#### Moving to Another Machine
1. Export your data: `npm run backup`
2. Copy backup files to new machine
3. Set up CineAI on new machine
4. Import your data: `npm run restore`

#### Cloud Migration (Optional)
If you want to move to cloud hosting:
1. Set up Supabase Cloud project
2. Export local data
3. Import to cloud database
4. Update environment variables
5. Deploy to Vercel/Netlify

---

## 🎉 You're All Set!

CineAI is now running locally with complete privacy and control. Your data stays on your machine, and you have full control over your movie recommendations.

**Next Steps:**
1. Sign up for your account in the app
2. Rate some movies to train your AI
3. Start getting personalized recommendations
4. Explore the voice chat features
5. Customize your preferences

**Need Help?**
- [Quick Start Guide](LOCAL_SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Backup & Restore Guide](BACKUP.md)
