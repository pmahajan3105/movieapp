# CineAI - AI-Powered Movie Recommendation App

CineAI is an intelligent movie recommendation app that uses AI to learn your preferences and suggest movies you'll love. Built with Next.js 14, Supabase, and Anthropic Claude.

## ✨ Features

- **🤖 AI Chat Assistant**: Natural conversation to understand your movie taste
- **🎬 Smart Recommendations**: Personalized movie suggestions based on your preferences
- **⚡ Quick Rating**: Simple like/dislike system to improve recommendations
- **📋 Movie Discovery**: Browse curated collections and trending films
- **🔐 Magic Link Auth**: Passwordless login with email OTP
- **📱 Responsive Design**: Optimized for mobile and desktop with DaisyUI

## 🚀 Quick Start

For detailed setup instructions, see [**docs/SETUP_GUIDE.md**](docs/SETUP_GUIDE.md)

```bash
# Clone and install
git clone https://github.com/pmahajan3105/movieapp.git
cd movie
npm install

# Set up environment
cp env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🏗️ Architecture

CineAI uses a modern, scalable architecture built on Next.js 14 with Server Components.

For comprehensive architecture documentation with diagrams, see [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md)

### Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, DaisyUI
- **Backend**: Next.js API Routes, Server Components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API
- **Movie Data**: TMDB API
- **State Management**: React Query, React Context
- **Testing**: Jest, React Testing Library

## 📁 Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── api/              # API routes
│   ├── dashboard/        # Protected dashboard pages
│   ├── auth/             # Authentication pages
│   └── onboarding/       # User onboarding flow
├── components/           # Reusable UI components
│   ├── ai/              # AI-related components
│   ├── auth/            # Authentication components
│   ├── movies/          # Movie display components
│   └── ui/              # Base UI components
├── lib/                 # Utilities and services
│   ├── ai/              # AI model integration
│   ├── supabase/        # Database client
│   └── services/        # External API services
├── hooks/               # Custom React hooks
├── contexts/            # React Context providers
├── repositories/        # Data access layer
└── types/              # TypeScript definitions

docs/                    # Documentation
├── SETUP_GUIDE.md      # Complete setup instructions
├── ARCHITECTURE.md     # System architecture with diagrams
└── ...                 # Additional documentation

archive/                 # Archived documentation
└── docs/               # Old versions and deprecated docs
```

## 📚 Documentation

### Setup & Development

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete installation and configuration
- **[Architecture](docs/ARCHITECTURE.md)** - System design and component structure
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### Features & APIs

- **[AI Features Requirements](docs/AI_FEATURES_REQUIREMENTS.md)** - AI system capabilities
- **[AI Prompts Reference](docs/AI_PROMPTS_REFERENCE.md)** - Complete AI prompt documentation
- **[Authentication Setup](docs/AUTH_SETUP.md)** - Auth configuration details

### Development

- **[Current Status](docs/CURRENT_STATUS.md)** - Latest development status
- **[Test Results](docs/TEST_RESULTS.md)** - Test coverage and results

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed sample data
npm run generate:types  # Generate TypeScript types from Supabase

# Testing
npm test                # Run test suite
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate test coverage report

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
```

## 🤖 AI Model System

CineAI features a sophisticated AI model management system that allows easy switching between different AI models and providers for optimal cost and performance.

### Quick Model Management

```bash
# List all available models
node scripts/model-manager.js list

# See cost comparison
node scripts/model-manager.js cost

# Get model details
node scripts/model-manager.js info claude-3-haiku
```

### Environment Configuration

```bash
# Default model for all tasks
AI_DEFAULT_MODEL=claude-3-7-sonnet-20250219

# Task-specific models
AI_CHAT_MODEL=claude-3-7-sonnet-20250219
AI_FAST_MODEL=claude-3-5-haiku-20241022
```

## 🔑 Environment Variables

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for complete environment setup.

**Required:**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

**Optional:**

- `TMDB_API_KEY` - The Movie Database API key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## 🚀 Deployment

The app is optimized for deployment on Vercel with Supabase as the backend.

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/pmahajan3105/movieapp)

## 🧪 Testing

CineAI includes comprehensive test coverage:

- **Unit Tests**: Component and function testing
- **Integration Tests**: API and database testing
- **E2E Tests**: Critical user journey testing

```bash
npm test                # Run all tests
npm run test:coverage   # Generate coverage report
```

Current test status: **100% test suites passing** (41/41 suites, 522/539 tests)

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:

1. Check the [Setup Guide](docs/SETUP_GUIDE.md) for common solutions
2. Review [GitHub Issues](https://github.com/pmahajan3105/movieapp/issues)
3. Create a new issue with detailed information

Your CineAI app should now be fully functional! 🎬✨
