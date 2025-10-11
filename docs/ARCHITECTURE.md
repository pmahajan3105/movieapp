# CineAI Architecture Documentation

This document describes the technical architecture of the CineAI Movie Recommendation App, including system overview, data flow, and component structure.

## System Overview

CineAI is a modern web application built with Next.js 14, providing AI-powered movie recommendations through a clean, responsive interface.

### Core Technologies

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS, DaisyUI
- **Backend**: Next.js API Routes, Server Components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-5-mini (primary), Anthropic Claude API (fallback)
- **Movie Data**: TMDB API with caching
- **Memory System**: Unified UserMemoryService with recency decay
- **State Management**: React Query, React Context
- **Testing**: Jest, React Testing Library

## High-Level Architecture

```mermaid
graph TD
    A[User Browser] --> B[Next.js App Router]
    B --> C[API Routes]
    B --> D[Server Components]
    B --> E[Client Components]

    C --> F[Supabase Database]
    C --> G[Anthropic API]
    C --> H[TMDB API]

    F --> I[User Profiles]
    F --> J[Movies]
    F --> K[Ratings]
    F --> L[Watchlist]
    F --> M[Chat Sessions]

    G --> N[AI Recommendations]
    G --> O[Preference Extraction]
    G --> P[Chat Responses]

    H --> Q[Movie Metadata]
    H --> R[Posters & Images]
    H --> S[Search Results]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style G fill:#fff3e0
    style H fill:#f3e5f5
```

## Data Flow Architecture

### User Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Next.js App
    participant API as API Routes
    participant DB as Supabase DB
    participant AI as Anthropic API
    participant TMDB as TMDB API

    U->>App: Visit homepage
    App->>U: Show landing page

    U->>App: Sign up/Login
    App->>DB: Authenticate user
    DB->>App: Return session

    U->>App: Complete onboarding
    App->>API: Submit preferences
    API->>DB: Store user profile

    U->>App: Rate movies
    App->>API: Submit ratings
    API->>DB: Store ratings

    U->>App: Chat with AI
    App->>API: Send chat message
    API->>AI: Generate response
    AI->>API: Return recommendations
    API->>DB: Store chat session
    API->>App: Return response

    U->>App: Browse movies
    App->>API: Fetch movies
    API->>TMDB: Get movie data
    API->>DB: Get user ratings
    API->>App: Return enriched data
```

## Memory System Architecture

The CineAI memory system provides unified user context across all AI interactions through a centralized `UserMemoryService`.

### Memory System Flow

```mermaid
graph TD
    A[User Request] --> B[UserMemoryService]
    B --> C[Batch Database Query]
    C --> D[Unified Memory Object]
    D --> E[Filter Seen Movies]
    D --> F[Enrich AI Prompts]
    D --> G[Apply User Preferences]
    
    H[Watchlist] --> C
    I[Ratings] --> C
    J[Behavior Signals] --> C
    K[User Preferences] --> C
    
    E --> L[Filtered Recommendations]
    F --> M[Contextual AI Responses]
    G --> N[Personalized Search Results]
    
    style B fill:#e3f2fd
    style D fill:#e8f5e8
    style L fill:#fff3e0
    style M fill:#fff3e0
    style N fill:#fff3e0
```

### Memory Components

1. **Unified Memory Aggregation**: Single batch query for all user data
2. **Recency Decay**: Time-based weighting (95% retention per day)
3. **Graceful Degradation**: App continues working if memory fails
4. **Cross-Endpoint Integration**: Consistent memory usage across chat, search, recommendations

### Memory Data Structure

```typescript
interface UserMemory {
  seenMovieIds: Set<number>           // Movies user has watched/rated
  ratedMovies: Rating[]              // User's movie ratings
  watchlistMovies: WatchlistItem[]   // User's watchlist
  genrePreferences: Map<string, number> // Genre weights with decay
  recentInteractions: BehaviorSignal[] // Recent user activity
  qualityThreshold: number            // User's quality standards
  explorationWeight: number          // Exploration vs exploitation balance
}
```

## AI Recommendation Pipeline

```mermaid
graph LR
    A[User Input] --> B[Memory Service]
    B --> C[Context Building]
    C --> D[AI Provider Selection]
    D --> E[OpenAI GPT-5-mini]
    D --> F[Claude Fallback]
    E --> G[Response Processing]
    F --> G
    G --> H[Movie Matching]
    H --> I[Score Calculation]
    I --> J[Result Ranking]
    J --> K[Recommendation Output]

    L[User History] --> B
    M[Movie Database] --> H
    N[Ratings Data] --> I

    style A fill:#e3f2fd
    style B fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#fff3e0
    style K fill:#e8f5e8
```

### AI Processing Steps

1. **Preference Extraction**: Parse user input for genres, moods, themes
2. **Context Building**: Combine user history, ratings, and current request
3. **Claude API Call**: Send enriched context to Anthropic Claude
4. **Response Processing**: Parse AI response for movie recommendations
5. **Movie Matching**: Match AI suggestions to database movies
6. **Score Calculation**: Calculate relevance scores based on user data
7. **Result Ranking**: Sort and filter recommendations
8. **Recommendation Output**: Return formatted recommendations

## Database Schema

```mermaid
erDiagram
    user_profiles {
        uuid id PK
        string email
        string full_name
        jsonb preferences
        timestamp created_at
        timestamp updated_at
    }

    movies {
        uuid id PK
        string title
        text overview
        string[] genres
        float rating
        integer year
        string poster_path
        integer tmdb_id
        timestamp created_at
    }

    ratings {
        uuid id PK
        uuid user_id FK
        uuid movie_id FK
        float rating
        text review
        timestamp created_at
        timestamp updated_at
    }

    watchlist_items {
        uuid id PK
        uuid user_id FK
        uuid movie_id FK
        boolean watched
        timestamp added_at
        timestamp watched_at
    }

    chat_sessions {
        uuid id PK
        uuid user_id FK
        jsonb messages
        jsonb context
        timestamp created_at
        timestamp updated_at
    }

    user_profiles ||--o{ ratings : "has many"
    user_profiles ||--o{ watchlist_items : "has many"
    user_profiles ||--o{ chat_sessions : "has many"
    movies ||--o{ ratings : "rated by users"
    movies ||--o{ watchlist_items : "in watchlists"
```

## Component Architecture

### App Router Structure

```mermaid
graph TD
    A[app/] --> B[layout.tsx]
    A --> C[page.tsx - Landing]
    A --> D[auth/]
    A --> E[dashboard/]
    A --> F[onboarding/]
    A --> G[search/]
    A --> H[api/]

    D --> D1[login/page.tsx]
    D --> D2[callback/route.ts]

    E --> E1[layout.tsx]
    E --> E2[page.tsx - Dashboard]
    E --> E3[movies/page.tsx]
    E --> E4[watchlist/page.tsx]
    E --> E5[settings/page.tsx]

    F --> F1[page.tsx]

    G --> G1[page.tsx]

    H --> H1[auth/]
    H --> H2[movies/]
    H --> H3[ai/]
    H --> H4[preferences/]

    style A fill:#f3e5f5
    style H fill:#e8f5e8
```

### Component Hierarchy

```mermaid
graph TD
    A[Layout] --> B[NavigationHeader]
    A --> C[AuthGuard]
    A --> D[Page Components]

    D --> E[Dashboard]
    D --> F[MoviesPage]
    D --> G[OnboardingFlow]
    D --> H[SearchInterface]

    E --> E1[MovieGridCard]
    E --> E2[CategoryRow]
    E --> E3[ChatInterface]

    F --> F1[EnhancedRecommendationGrid]
    F --> F2[RecommendationCard]
    F --> F3[MovieDetailsModal]

    G --> G1[RatingCard]
    G --> G2[PreferencesSetup]

    H --> H1[SearchResults]
    H --> H2[FilterPanel]

    C --> I[Auth Components]
    I --> I1[LoginForm]
    I --> I2[OtpForm]
    I --> I3[AuthStatus]

    style A fill:#e3f2fd
    style C fill:#fff3e0
    style I fill:#e8f5e8
```

## API Architecture

### Route Organization

```mermaid
graph TD
    A[/api] --> B[/auth]
    A --> C[/movies]
    A --> D[/ai]
    A --> E[/preferences]
    A --> F[/watchlist]
    A --> G[/ratings]

    B --> B1[/login]
    B --> B2[/verify-otp]
    B --> B3[/status]

    C --> C1[GET - List movies]
    C --> C2[/search - Search movies]
    C --> C3[/[id] - Movie details]
    C --> C4[/genres - List genres]

    D --> D1[/chat - AI chat]
    D --> D2[/recommendations - Get recommendations]

    E --> E1[GET/POST - User preferences]
    E --> E2[/[id] - Update preferences]

    F --> F1[GET/POST - Watchlist items]
    F --> F2[/[id] - Update watchlist]

    G --> G1[POST - Submit ratings]

    style A fill:#e3f2fd
    style D fill:#fff3e0
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Next.js App
    participant Auth as Supabase Auth
    participant DB as Database

    U->>App: Enter email
    App->>Auth: Request magic link
    Auth->>U: Send email with OTP

    U->>App: Enter OTP
    App->>Auth: Verify OTP
    Auth->>App: Return session

    App->>DB: Check user profile
    alt Profile exists
        DB->>App: Return profile
        App->>U: Redirect to dashboard
    else No profile
        App->>U: Redirect to onboarding
        U->>App: Complete onboarding
        App->>DB: Create profile
        App->>U: Redirect to dashboard
    end
```

## State Management

### Context Providers

```mermaid
graph TD
    A[App Root] --> B[AuthContext]
    B --> C[QueryProvider]
    C --> D[ThemeContext]
    D --> E[Application Components]

    B --> B1[User State]
    B --> B2[Session Management]
    B --> B3[Auth Helpers]

    C --> C1[Server State]
    C --> C2[Query Caching]
    C --> C3[Mutations]

    D --> D1[Theme State]
    D --> D2[Theme Persistence]

    style B fill:#e8f5e8
    style C fill:#e3f2fd
    style D fill:#fff3e0
```

### Data Flow Patterns

1. **Server State**: Managed by React Query for API data
2. **Client State**: React Context for auth and theme
3. **Form State**: Uncontrolled components with validation
4. **URL State**: Next.js router for navigation state

## Performance Optimizations

### Caching Strategy

```mermaid
graph LR
    A[User Request] --> B[Next.js Cache]
    B --> C[React Query Cache]
    C --> D[Supabase RLS]
    D --> E[Database]

    F[Static Assets] --> G[CDN Cache]
    H[API Responses] --> I[Memory Cache]
    J[Movie Images] --> K[Image Optimization]

    style B fill:#e3f2fd
    style C fill:#e8f5e8
    style G fill:#fff3e0
```

### Optimization Techniques

1. **Static Generation**: Landing pages and marketing content
2. **Server Components**: Data fetching on the server
3. **Code Splitting**: Lazy loading of non-critical components
4. **Image Optimization**: Next.js Image component with TMDB CDN
5. **Query Caching**: React Query for efficient data fetching
6. **Database Indexing**: Optimized queries for movie search

## Security Architecture

### Authentication & Authorization

```mermaid
graph TD
    A[User Request] --> B[Middleware]
    B --> C[Session Check]
    C --> D{Authenticated?}

    D -->|No| E[Redirect to Login]
    D -->|Yes| F[Route Protection]

    F --> G[RLS Policies]
    G --> H[Database Access]

    I[API Routes] --> J[Service Role Key]
    K[Client Components] --> L[Anon Key]

    style B fill:#ffebee
    style G fill:#e8f5e8
    style J fill:#fff3e0
```

### Security Measures

1. **Row Level Security (RLS)**: Database-level access control
2. **Environment Variables**: Secure API key storage
3. **HTTPS Only**: All communications encrypted
4. **Input Validation**: Server-side validation for all inputs
5. **Rate Limiting**: API abuse prevention
6. **CSP Headers**: Content Security Policy implementation

## Deployment Architecture

### Production Stack

```mermaid
graph TD
    A[Vercel Edge] --> B[Next.js App]
    B --> C[Vercel Functions]
    C --> D[Supabase Cloud]

    E[GitHub] --> F[CI/CD Pipeline]
    F --> G[Automated Deployment]
    G --> A

    H[CDN] --> I[Static Assets]
    J[Monitoring] --> K[Error Tracking]
    L[Analytics] --> M[Usage Metrics]

    style A fill:#e3f2fd
    style D fill:#e8f5e8
    style F fill:#fff3e0
```

### Infrastructure Components

1. **Frontend Hosting**: Vercel with global CDN
2. **Database**: Supabase managed PostgreSQL
3. **Authentication**: Supabase Auth service
4. **File Storage**: Supabase Storage for user uploads
5. **Monitoring**: Vercel Analytics + custom error tracking
6. **CI/CD**: GitHub Actions with automated testing

## Development Workflow

### Code Organization

```
src/
├── app/                 # Next.js App Router
├── components/          # Reusable UI components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── lib/                # Utilities and services
├── repositories/       # Data access layer
├── types/              # TypeScript type definitions
└── __tests__/          # Test files
```

### Testing Strategy

1. **Unit Tests**: Individual component and function testing
2. **Integration Tests**: API route and database testing
3. **E2E Tests**: Critical user journey testing
4. **Type Safety**: Comprehensive TypeScript coverage

This architecture provides a scalable, maintainable foundation for the CineAI application, emphasizing performance, security, and developer experience.
