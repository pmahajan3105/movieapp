# CineAI Development Guide

*Simple guidelines for working on this personal movie recommendation app*

## 🎯 Project Overview

**Stack**: Next.js 14, TypeScript, Supabase, Tailwind, Shadcn/ui  
**Purpose**: AI-powered movie recommendations with chat interface  
**Approach**: Keep it simple, ship features, clean up as you go

## 🛠️ Development Principles

### Do This ✅
- **Write the minimum code required** - solve the problem, don't over-engineer
- **Keep components focused** - if it's getting >200 lines, consider splitting
- **Add types instead of `any`** - when you touch a file, fix obvious type issues
- **Test complex business logic** - custom hooks, API routes with important logic
- **Use existing patterns** - follow what's already working in the codebase

### Don't Do This ❌
- **Don't create enterprise architecture** - this isn't a team project
- **Don't add complex abstractions** - YAGNI (You Aren't Gonna Need It)
- **Don't test everything** - skip simple presentational components
- **Don't premature optimize** - make it work first, optimize when needed
- **Don't break existing functionality** - run tests before big changes

## 🏗️ Code Organization

### Components
```
src/components/
├── ai/          # AI-related components (already well-organized)
├── dashboard/   # Dashboard sections (recently refactored ✅)
├── movies/      # Movie display and interaction
├── auth/        # Authentication UI
└── ui/          # Reusable UI components
```

### When to Split Components
- **> 200 lines**: Probably doing too much
- **Multiple concerns**: Authentication + data fetching + display
- **Hard to understand**: If you can't quickly see what it does

### API Routes Pattern
```typescript
// Keep it simple - use existing patterns
export async function GET(request: Request) {
  try {
    // Your logic here
    return NextResponse.json({ data })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/your-endpoint',
      method: 'GET'
    })
  }
}
```

## 🧪 Testing Strategy

### What to Test
- **API routes with business logic** (recommendations, user preferences)
- **Custom hooks** (`useMovieActions`, `useAISettings`)
- **Complex components** (forms with validation, state management)

### What NOT to Test
- Simple UI components that just display data
- Third-party library wrappers
- Basic CRUD without business logic

### Test Example
```typescript
// Focus on behavior, not implementation
describe('useMovieActions', () => {
  it('should add movie to watchlist', async () => {
    // Test the important business logic
  })
})
```

## 🎨 Styling Guidelines

### Use DaisyUI + Tailwind
```typescript
// Good - semantic, readable
<button className="btn btn-primary">
  Save Movie
</button>

// Avoid - too specific, hard to maintain
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium">
```

### Responsive Design
```typescript
// Use responsive prefixes
<div className="flex flex-col lg:flex-row">
  <div className="w-full lg:w-1/3">
```

## 🔄 AI Integration

### Current AI Features ✅
- Movie recommendations with explanations
- Chat interface for movie discussions
- User preference learning
- AI-powered insights

### Adding New AI Features
1. **Start simple** - basic prompt/response first
2. **Add error handling** - AI calls can fail
3. **Consider rate limits** - add loading states
4. **Test with real data** - AI responses vary

```typescript
// Good pattern for AI calls
const { data, error, loading } = useAIRecommendations({
  onError: (err) => toast.error('AI service unavailable'),
  fallback: [] // Always have a fallback
})
```

## 🗃️ Database (Supabase)

### Current Tables
- `users` - User profiles and preferences
- `movies` - Movie data and metadata
- `ratings` - User movie ratings
- `chat_sessions` - AI conversation history
- `user_movie_interactions` - Watchlist, favorites, etc.

### Adding New Features
1. **Check existing tables first** - might already have what you need
2. **Create migration** - use Supabase CLI
3. **Update TypeScript types** - run `supabase gen types`
4. **Test locally** - use local Supabase instance

## 🚀 Deployment & Environment

### Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=

# Optional AI features
OPENAI_API_KEY=
TMDB_API_KEY=
```

### Local Development
```bash
# Start everything
npm run dev          # Next.js app
supabase start       # Local Supabase (if using)

# Useful commands
npm run test         # Run tests
npm run type-check   # TypeScript validation
```

## 🐛 Debugging Tips

### Common Issues
1. **Supabase auth errors** - Check RLS policies
2. **AI API limits** - Add proper error handling and retries
3. **Type errors** - Use TypeScript strict mode, fix incrementally
4. **Performance** - Use React DevTools Profiler for slow components

### Debugging Tools
- **React DevTools** - Component state and props
- **Network tab** - API calls and responses
- **Supabase Dashboard** - Database queries and auth
- **Console logs** - But clean them up afterwards

## 📦 Dependencies

### Core Stack (Keep)
- `next` - React framework
- `typescript` - Type safety
- `tailwindcss` + `daisyui` - Styling
- `@supabase/supabase-js` - Database and auth
- `@tanstack/react-query` - Data fetching

### AI Libraries
- `@anthropic-ai/sdk` - Claude API
- `openai` - OpenAI GPT (if using)

### When Adding New Dependencies
1. **Check if really needed** - can you solve it with existing tools?
2. **Consider bundle size** - will it slow down the app?
3. **Check maintenance** - is it actively maintained?
4. **Start small** - add one dependency at a time

## 🎯 Current Status

### ✅ What's Working Well
- Dashboard architecture (recently refactored)
- AI Control Panel (clean, well-tested)
- Basic movie recommendations
- User authentication flow
- Chat interface

### 🔄 Areas for Simple Improvements
- Add basic error boundaries (when you hit errors)
- Replace `any` types when you see them
- Add tests for new complex features
- Clean up console.logs and TODOs

### 🚫 Don't Worry About
- Perfect test coverage
- Complex performance optimization
- Enterprise monitoring
- Formal documentation
- Advanced security audits

---

## 💡 Final Thoughts

**This is a personal project** - focus on:
- Building cool features
- Learning new things
- Solving real problems (movie recommendations!)
- Having fun with AI integration

**Don't get caught up in**:
- Perfect architecture
- 100% test coverage
- Enterprise best practices
- Over-engineering solutions

**When in doubt**: Keep it simple, make it work, ship it! 🚀

---

*Update this guide when you learn something useful or change major patterns.*
