# 🚀 CineAI Local Setup - Quick Start

Get CineAI running locally in **15 minutes** with your own data and complete privacy.

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
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

### 2. Run the Setup Script

**Mac/Linux:**
```bash
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

**Windows:**
```cmd
scripts\setup-local.bat
```

The script will automatically:
- ✅ Check all dependencies
- ✅ Install npm packages
- ✅ Start local Supabase
- ✅ Run database migrations
- ✅ Create environment configuration
- ✅ Guide you through API key setup

### 3. Add Your API Keys

The script will prompt you for:

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

🎉 **You're done!** CineAI is now running locally with your own data.

## 🎯 What You Get

- **100% Local Data** - Everything stored on your machine
- **Complete Privacy** - No cloud dependencies except API calls
- **AI-Powered Recommendations** - GPT-5-mini + Claude 4.5 Sonnet
- **Voice Conversations** - Talk to your AI movie assistant
- **Personal Watchlist** - Track movies you want to watch
- **Smart Ratings** - Rate movies and get better recommendations

## 🛠️ Daily Usage

### Starting CineAI
```bash
# Start Supabase (if not running)
supabase start

# Start the app
npm run dev
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
```
This opens a web interface to view and manage your local database.

## 🔧 Useful Commands

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
```

## 🆘 Need Help?

### Setup Issues
- **Script fails?** → Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- **Docker issues?** → Make sure Docker Desktop is running
- **Port conflicts?** → Check if ports 3000, 54321, 54322, 54323 are free

### Common Problems
- **"Supabase not running"** → Run `supabase start`
- **"API key invalid"** → Double-check your keys in `.env.local`
- **"Port already in use"** → Stop other services using port 3000

### Get Support
- 📖 [Comprehensive Guide](SELF_HOSTING.md)
- 🔧 [Troubleshooting](TROUBLESHOOTING.md)
- 💾 [Backup & Restore](BACKUP.md)

## 🔒 Privacy & Security

- **Your data stays local** - Never leaves your machine
- **No tracking** - We don't collect any usage data
- **API keys secure** - Stored in local `.env.local` file
- **Open source** - Full transparency, no hidden code

## 🎬 What's Next?

1. **Sign up** for your account in the app
2. **Rate some movies** to train your AI
3. **Add movies to watchlist** 
4. **Chat with AI** about movie recommendations
5. **Explore trending movies** and discover new favorites

---

**Ready to start?** Run the setup script and you'll be watching AI-recommended movies in minutes! 🍿
