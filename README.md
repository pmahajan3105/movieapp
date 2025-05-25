# CineAI - Movie Recommendation App

CineAI is an intelligent movie recommendation app that uses AI to learn your preferences and suggest movies you'll love. Built with Next.js, Supabase, and Groq AI.

## ✨ Features

- **🤖 AI Chat Assistant**: Natural conversation to understand your movie taste
- **🎬 Smart Recommendations**: Personalized movie suggestions based on your preferences  
- **⚡ Quick Rating**: Simple like/dislike system to improve recommendations
- **📋 Movie Discovery**: Browse curated collections and trending films
- **🔐 Magic Link Auth**: Passwordless login with email OTP
- **📱 Responsive Design**: Optimized for mobile and desktop

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account
- Groq API key

### Installation

```bash
# Clone the repository
git clone https://github.com/pmahajan3105/movieapp.git
cd movieapp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase and Groq API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: Anthropic Claude API
- **Movie Data**: TMDB (The Movie Database) API
- **Deployment**: Vercel
- **Database**: Supabase (PostgreSQL)

## 📁 Project Structure

## 📖 Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Supabase Documentation](https://supabase.io/docs) - learn about Supabase
- [Groq AI Documentation](https://groq.com/docs) - learn about Groq AI

## 🚢 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

# 🎬 CineAI - Personal Movie Recommendations

AI-powered movie recommendation app with conversational preference gathering and intelligent model selection.

## 🚀 Features

- **Conversational AI** - Natural chat interface for discovering movie preferences
- **Smart Recommendations** - AI-powered personalized movie suggestions
- **Real-time Movie Data** - Integration with TMDB API for live movie information and trending content
- **AI-Powered Chat** - Intelligent movie recommendations using Anthropic's Claude
- **Watchlist Management** - Save and organize your movie queue
- **User Authentication** - Secure login with Supabase Auth
- **Responsive Design** - Beautiful UI that works on all devices

## 🤖 AI Model Selection System

This app features a sophisticated AI model management system that allows easy switching between different AI models and providers:

### Quick Start
```bash
# List all available models and current configuration
node scripts/model-manager.js list

# See cost comparison across models
node scripts/model-manager.js cost

# Get detailed information about a specific model  
node scripts/model-manager.js info claude-3-haiku
```

### Environment Configuration
Add to your `.env.local` to configure models:

```bash
# Default model for all tasks
AI_DEFAULT_MODEL=claude-3-5-sonnet

# Task-specific model assignments
AI_CHAT_MODEL=claude-3-5-sonnet           # Main conversations
AI_RECOMMENDATIONS_MODEL=claude-3-5-sonnet # Movie recommendations  
AI_MOOD_SEARCH_MODEL=claude-3-haiku       # Quick mood searches (cheaper)
AI_PREFERENCE_MODEL=claude-3-5-sonnet     # Preference extraction
```

### Supported Models & Providers

| Model | Provider | Cost/1k tokens | Best For |
|-------|----------|----------------|----------|
| **Claude 3.5 Sonnet** ⭐ | Anthropic | $0.015 | Complex reasoning, recommendations |
| **Claude 3 Haiku** | Anthropic | $0.0025 | Quick responses, mood search |
| GPT-4 Turbo | OpenAI | $0.01 | Vision tasks (future) |
| GPT-3.5 Turbo | OpenAI | $0.001 | Cost-effective chat |
| Llama 3.3 70B | Groq | $0.0005 | High-volume, fast responses |

**Benefits:**
- 🎯 **Task-optimized**: Different models for different use cases
- 💰 **Cost-efficient**: Automatic selection of cheaper models for simple tasks  
- 🔧 **No code changes**: Switch models via environment variables
- 📊 **Cost tracking**: Built-in cost estimation and monitoring
- 🚀 **Easy scaling**: Add new models and providers easily

[→ Read full AI Model System Documentation](docs/ai-model-system.md)

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Anthropic API key
- TMDB API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd movie-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── ai/            # AI-related endpoints
│   │       ├── chat/      # Chat API with streaming
│   │       ├── models/    # Model management API
│   │       ├── recommendations/ # AI recommendations
│   │       └── mood-search/     # Mood-based search
├── lib/                   # Utility libraries
│   ├── ai/                # AI model system
│   │   ├── models.ts      # Model configuration
│   │   └── service.ts     # Unified AI service
│   ├── anthropic/         # Anthropic configuration
│   └── services/          # External services (TMDB)
├── components/            # React components
└── types/                 # TypeScript definitions

scripts/
└── model-manager.js       # CLI tool for model management

docs/
└── ai-model-system.md     # Detailed AI system documentation
```

## 🔑 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key
# OPENAI_API_KEY=your_openai_api_key    # Optional for future use
# GROQ_API_KEY=your_groq_api_key        # Optional for future use

# External APIs
TMDB_API_KEY=your_tmdb_api_key

# AI Model Configuration (Optional - uses smart defaults)
AI_DEFAULT_MODEL=claude-3-5-sonnet
AI_CHAT_MODEL=claude-3-5-sonnet
AI_RECOMMENDATIONS_MODEL=claude-3-5-sonnet
AI_MOOD_SEARCH_MODEL=claude-3-haiku
AI_PREFERENCE_MODEL=claude-3-5-sonnet
```

## 🎯 Usage Examples

### Managing AI Models
```bash
# List all models and see current assignments
node scripts/model-manager.js list

# Calculate costs for different usage scenarios
node scripts/model-manager.js cost

# Get detailed information about a model
node scripts/model-manager.js info claude-3-5-sonnet
```

### API Usage
```bash
# Get all available models
curl http://localhost:3000/api/ai/models

# Chat with AI
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I love sci-fi movies like Inception"}'

# Get movie recommendations  
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'
```

## 🧪 Development Features

- **Hot reload** with Next.js
- **TypeScript** for type safety
- **Real-time streaming** chat responses
- **Cost optimization** with intelligent model selection
- **CLI tools** for model management
- **Comprehensive logging** for debugging

## 📈 Performance & Cost Optimization

The app automatically optimizes AI costs by:

1. **Task-based model selection**: Uses cheaper models for simple tasks
2. **Streaming optimization**: Efficient real-time responses
3. **Cost monitoring**: Built-in cost tracking and estimation
4. **Provider flexibility**: Easy switching between AI providers

Example cost savings:
- Mood search: Claude 3 Haiku ($0.0025/1k) vs Claude 3.5 Sonnet ($0.015/1k) = **6x cheaper**
- High volume: Groq Llama ($0.0005/1k) vs Claude 3.5 Sonnet ($0.015/1k) = **30x cheaper**

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Netlify: Configure build command `npm run build`
- Railway: Auto-deploys from GitHub
- Self-hosted: Use `npm run build && npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for Claude AI models
- **Supabase** for backend infrastructure  
- **TMDB API** for movie data
- **Next.js** for the React framework
- **OpenAI & Groq** for additional AI model options
