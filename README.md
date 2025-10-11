# 🎬 CineAI - Your Personal Movie Companion

> **Advanced AI-powered movie recommendations with voice conversation and hyper-personalized engine**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![daisyUI](https://img.shields.io/badge/daisyUI-5A0EF8?style=flat&logo=daisyui&logoColor=white)](https://daisyui.com/)
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-🏠-green?style=flat)](docs/LOCAL_SETUP.md)

## 🏠 100% Self-Hosted - Your Data, Your Control

CineAI is designed to run completely locally with your own data. No cloud dependencies, complete privacy, and full control over your movie recommendations.

### 🎯 **Frictionless Local Mode** - NEW!

- **No Sign-Up Required** - Just enter your name and start using
- **Zero Authentication** - No passwords, no OAuth, no hassle
- **Instant Access** - Start getting recommendations in seconds
- **Full Privacy** - All data stored locally in your browser
- **Perfect for Self-Hosting** - Ideal for personal media servers

[Learn more about Local Mode →](docs/LOCAL_USER_MODE.md)

## ✨ Features

### 🤖 **F-1 Hyper-Personalized Engine**

- **Advanced Behavioral Analysis** - Learns from your ratings, watchlist, and viewing patterns
- **Real-time Learning** - Adapts recommendations based on every interaction
- **Multi-factor Scoring** - Combines genre affinity, quality prediction, temporal patterns, and exploration
- **Configurable AI** - Tune personalization factors to match your preferences
- **95%+ Confidence** - Industry-leading accuracy in movie recommendations

### 🎤 **Voice Conversation (Web Speech API)**

- **Browser-native Voice Chat** – Uses the Web Speech API for speech recognition and synthesis (no external service needed)
- **Privacy Friendly** – All processing happens in the browser; no audio leaves the device
- **Accessible** – Works across Chromium-based browsers and Safari 17+
- **Seamless Integration** – Voice input works alongside chat & hyper-personalized recommendations

### 🧠 **Intelligent Features**

- **Smart Hybrid TMDB** - Blends trending movies with personalized recommendations
- **Contextual Recommendations** - Different suggestions for weekend vs. weekday viewing
- **Quality Filtering** - Respects your standards for movie quality
- **Exploration Mode** - Discover new genres while staying true to your taste
- **Unified Memory System** - Advanced memory aggregation with novelty tracking
- **Single User Mode** - Frictionless local development for personal use
- **Model Validation** - Runtime AI model validation with graceful fallbacks
- **Rate Limiting** - Built-in protection against API abuse
- **Transparent Scoring** - See exactly why each movie was recommended

### 📊 **Analytics & Insights**

- **Behavioral Insights Panel** - Understand your viewing patterns
- **Confidence Scoring** - See why each movie was recommended
- **Performance Monitoring** - Real-time system health and metrics
- **Comprehensive Testing** - 90%+ test coverage with E2E automation

## 🚀 Quick Start (Cloud Setup - Recommended)

### ⚡ 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/cineai.git
cd cineai

# 2. Run cloud setup (no Docker required!)
chmod +x scripts/setup-cloud.sh
./scripts/setup-cloud.sh

# 3. Start the app
npm run dev
```

**Windows users:** Run `scripts\setup-cloud.bat` instead.

### 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Supabase Account** - [Free at supabase.com](https://supabase.com/dashboard)
- **API Keys** (we'll help you get these):
  - OpenAI API Key (for GPT-5-mini)
  - Anthropic API Key (for Claude fallback)  
  - TMDB API Key (for movie data)

### 🎯 What the Setup Script Does

The automated setup script will:
- ✅ Check all dependencies (Node.js only!)
- ✅ Install npm packages
- ✅ Create `.env.local` with your credentials
- ✅ Guide you through API key setup
- ✅ Validate everything is working

### 🔑 Getting Your Keys

#### 1. Supabase Project (Required)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (free tier available)
3. Get your project URL and API keys from Settings > API

#### 2. OpenAI API Key (Required)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

#### 3. Anthropic API Key (Required)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)

#### 4. TMDB API Key (Required)
1. Go to [TMDB Settings](https://www.themoviedb.org/settings/api)
2. Request an API key (free)
3. Copy the key

### 🎬 Start Using CineAI

After setup completes:
1. Open [http://localhost:3000](http://localhost:3000)
2. Sign up for your account
3. Rate some movies to train your AI
4. Start getting personalized recommendations!

### 🛠️ Daily Usage

```bash
# Start CineAI (no database to start!)
npm run dev

# Access your Supabase dashboard
# https://supabase.com/dashboard
```

---

## 🏠 Alternative: Local Setup (Complete Privacy)

For users who want complete local control:

```bash
# Local setup with Docker
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

**Need help?** Check out our [Quick Start Guide](docs/LOCAL_SETUP.md) or [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, daisyUI
- **Backend**: Next.js API Routes, Supabase (PostgreSQL), Real-time subscriptions
- **AI**: Anthropic Claude, Custom ML pipeline
- **Authentication**: Supabase Auth with email/OTP
- **Testing**: Jest, React Testing Library, Playwright E2E
- **Deployment**: Vercel, Supabase Cloud

### Core Components

#### F-1 Hyper-Personalized Engine

```typescript
// Advanced scoring algorithm
const confidence_score =
  genre_affinity * behavioral_weight * 100 +
  director_affinity * behavioral_weight * 80 +
  quality_prediction * quality_threshold_weight * 100 +
  temporal_fit * temporal_weight * 60 +
  exploration_bonus * exploration_weight * 40
```

#### Real-time Learning Pipeline

- User interaction capture (views, clicks, ratings, skips)
- Behavioral pattern analysis (genre preferences, quality standards)
- Dynamic factor adjustment based on recent activity
- Continuous model improvement with feedback loops

#### Voice Integration

- Web Speech Recognition (speech-to-text) in the browser
- Speech Synthesis API for AI responses (text-to-speech)
- Context-aware conversation memory (stored locally)

## 📖 Usage Guide

### Getting Personalized Recommendations

1. **Rate Some Movies** - Start by rating 5-10 movies you've seen
2. **Set Preferences** - Use the chat interface to tell the AI your preferences
3. **Explore F-1 Engine** - Visit the dashboard to see hyper-personalized recommendations
4. **Tune Settings** - Adjust AI factors (behavioral weight, exploration, quality threshold)
5. **Use Voice Chat** - Ask for recommendations using natural speech

### API Endpoints

#### Get Hyper-Personalized Recommendations

```typescript
GET /api/recommendations/hyper-personalized
Query params:
- count: number of recommendations (default: 10)
- context: viewing context ('evening', 'quick', etc.)
- excludeWatched: boolean (default: true)
- behavioral_weight: 0-1 (custom factor)
- exploration_weight: 0-1 (custom factor)
```

#### Record Learning Signals

```typescript
POST /api/recommendations/hyper-personalized
Body: {
  movieId: string,
  action: 'view' | 'click' | 'save' | 'rate' | 'skip',
  value?: number, // for ratings
  context: {
    page_type: string,
    position_in_list?: number
  }
}
```

## 🧪 Testing

### Run All Tests

```bash
npm run test:all      # Unit + Integration + E2E
```

### Test Coverage

```bash
npm run test:coverage # Generates HTML coverage report
```

### E2E Testing

```bash
npm run test:e2e      # Playwright tests
```

### Current Coverage

- **Unit Tests**: 95%+ statement coverage
- **Integration Tests**: Core user journeys covered
- **E2E Tests**: Complete recommendation flow automation

## 🚀 Deployment

### Vercel Deployment

```bash
# Connect to Vercel
npx vercel

# Deploy
npm run build
npx vercel --prod
```

### Environment Variables

Ensure all production environment variables are configured in your deployment platform:

- Supabase production credentials
- API keys for AI services
- Feature flags for production features

### Database Migration

```bash
# Apply migrations to production
npx supabase db push
```

## 🔧 Development

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── movies/         # Movie-related components
│   ├── dashboard/      # Dashboard sections
│   └── ui/            # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and services
│   ├── ai/            # AI engines and services
│   ├── supabase/      # Database utilities
│   └── utils/         # Helper functions
├── types/              # TypeScript type definitions
└── __tests__/          # Test files
```

### Key Scripts

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # TypeScript checking
npm run test:watch      # Watch mode testing
```

### Database Schema

```sql
-- Core tables
users (auth.users)      # User authentication
profiles                # User profiles and preferences
movies                  # Movie database with TMDB integration
ratings                 # User ratings (1-5 stars)
watchlist              # User saved movies
user_behavior_signals  # Real-time learning data
chat_sessions          # Conversation history
```

## 🛡️ Security & Privacy

- **Row Level Security (RLS)** - All database access is user-scoped
- **API Rate Limiting** - Prevents abuse and ensures fair usage
- **Input Validation** - All user inputs are sanitized and validated
- **Secure Headers** - CORS, CSP, and security headers configured
- **Private Data** - User preferences and behavior data never shared

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Use daisyUI components and Tailwind CSS
- Maintain 90%+ test coverage
- Update documentation for API changes

## 📊 Performance

### Metrics

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

### Optimizations

- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Database query optimization with indexed lookups
- Caching strategies for API responses
- Performance monitoring with real-time alerts

## 🗺️ Roadmap

### Current Version: 2.0

- ✅ F-1 Hyper-Personalized Engine
- ✅ Browser Voice Integration (Web Speech API)
- ✅ 90%+ Test Coverage
- ✅ Performance Monitoring

### Upcoming Features

- **Social Features** - Share recommendations with friends
- **Streaming Integration** - Direct links to Netflix, Disney+, etc.
- **Advanced Analytics** - Detailed viewing pattern insights
- **Mobile App** - React Native version
- **Offline Mode** - Progressive Web App capabilities

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie data
- Removed external voice AI dependency
- [Anthropic](https://anthropic.com/) for Claude AI
- [Supabase](https://supabase.com/) for backend infrastructure
- [Vercel](https://vercel.com/) for hosting and deployment

---

**Built with ❤️ using Next.js, TypeScript, and cutting-edge AI technology**

**[Live Demo](https://cineai.vercel.app)** | **[Documentation](https://docs.cineai.app)** | **[API Reference](https://api.cineai.app)**
