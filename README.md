# CineAI - Movie Recommendation App

CineAI is an intelligent movie recommendation app that uses AI to learn your preferences and suggest movies you'll love. Built with Next.js, Supabase, and Groq AI.

## ✨ Features

- **AI-Powered Recommendations**: Conversational AI learns your movie preferences
- **Tinder-Style Swiping**: Swipe through movie recommendations
- **Personal Watchlist**: Save and track movies you want to watch
- **Mood-Based Discovery**: Find movies based on your current mood
- **Smart Authentication**: Passwordless login with email OTP

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

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth + Database)
- **AI**: Groq AI for recommendations
- **UI Components**: Shadcn/ui
- **Authentication**: Supabase Auth with email OTP

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
