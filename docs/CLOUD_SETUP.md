# 🚀 CineAI Cloud Setup - Quick Start

Get CineAI running in **5 minutes** with cloud Supabase (recommended approach).

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Supabase Account** - [Free at supabase.com](https://supabase.com/dashboard)
- **API Keys** (we'll help you get these):
  - OpenAI API Key (for GPT-5-mini)
  - Anthropic API Key (for Claude fallback)
  - TMDB API Key (for movie data)

## ⚡ 5-Step Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/cineai.git
cd cineai
```

### 2. Run the Cloud Setup Script

**Mac/Linux:**
```bash
chmod +x scripts/setup-cloud.sh
./scripts/setup-cloud.sh
```

**Windows:**
```cmd
scripts\setup-cloud.bat
```

The script will automatically:
- ✅ Check all dependencies (Node.js only!)
- ✅ Install npm packages
- ✅ Create environment configuration
- ✅ Guide you through API key setup
- ✅ Validate the setup

### 3. Add Your API Keys

The script will prompt you for:

#### Supabase Project (Required)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (free tier available)
3. Get your project URL and API keys from Settings > API

#### OpenAI API Key (Required)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)
4. Paste it when prompted

#### Anthropic API Key (Required)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)
4. Paste it when prompted

#### TMDB API Key (Required)
1. Go to [TMDB Settings](https://www.themoviedb.org/settings/api)
2. Request an API key (free)
3. Copy the key
4. Paste it when prompted

### 4. Start the App
```bash
npm run dev
```

### 5. Open Your Browser
Navigate to: **http://localhost:3000**

🎉 **You're done!** CineAI is now running with cloud Supabase.

## 🎯 What You Get

- **AI-Powered Recommendations** - GPT-5-mini + Claude 4.5 Sonnet
- **Voice Conversations** - Talk to your AI movie assistant
- **Personal Watchlist** - Track movies you want to watch
- **Smart Ratings** - Rate movies and get better recommendations
- **Cloud Data Storage** - Your data is safely stored in Supabase

## 🛠️ Daily Usage

### Starting CineAI
```bash
# Start the app (no database to start!)
npm run dev
```

### Accessing Your Data
- **Supabase Dashboard**: [https://supabase.com/dashboard](https://supabase.com/dashboard)
- **Your Database**: View and manage your data through the Supabase interface

### Stopping CineAI
```bash
# Stop the app (Ctrl+C in terminal)
# No database to stop!
```

## 🔧 Useful Commands

```bash
# Check if everything is working
npm run setup

# Check app health
npm run health

# Access your Supabase dashboard
# https://supabase.com/dashboard
```

## 🆘 Need Help?

### Setup Issues
- **Script fails?** → Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- **API key issues?** → Double-check your keys in `.env.local`
- **Supabase issues?** → Check your project is active in the dashboard

### Common Problems
- **"Supabase connection failed"** → Check your project URL and keys
- **"API key invalid"** → Double-check your keys in `.env.local`
- **"App won't start"** → Check Node.js version and npm install

### Get Support
- 📖 [Comprehensive Guide](SELF_HOSTING.md)
- 🔧 [Troubleshooting](TROUBLESHOOTING.md)
- 💾 [Backup & Restore](BACKUP.md)

## 🔒 Privacy & Security

- **Your data is secure** - Stored in your private Supabase project
- **No tracking** - We don't collect any usage data
- **API keys secure** - Stored in local `.env.local` file
- **Open source** - Full transparency, no hidden code

## 🎬 What's Next?

1. **Sign up** for your account in the app
2. **Rate some movies** to train your AI
3. **Add movies to watchlist** 
4. **Chat with AI** about movie recommendations
5. **Explore trending movies** and discover new favorites

## 🏠 Alternative: Local Setup

For users who want complete local control:

```bash
# Local setup with Docker (complete privacy)
./scripts/setup-local.sh
```

**Benefits of Local Setup:**
- ✅ Complete privacy (data never leaves your machine)
- ✅ No cloud dependencies
- ✅ Full control over your data

**Requirements:**
- Docker Desktop
- More setup time (~15 minutes)

---

**Ready to start?** Run the cloud setup script and you'll be watching AI-recommended movies in minutes! 🍿
