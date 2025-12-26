# 🎬 CineAI API Documentation

## Overview

CineAI provides a comprehensive RESTful API for movie recommendations, user management, and AI-powered features. The API follows OpenAPI 3.0 specifications with consistent response formats and comprehensive error handling.

**Base URL**: `https://your-app.vercel.app/api`  
**API Version**: v1  
**Authentication**: Bearer Token (Supabase JWT)

## 📋 Quick Reference

### Response Format

All API responses follow this consistent structure:

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid",
    "cached": false
  },
  "error": null
}
```

### Error Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {...}
  }
}
```

### Authentication

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication & User Management

### Check Authentication Status

```http
GET /api/auth/status
```

**Response**:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "session": {...}
  }
}
```

### Request OTP

```http
POST /api/auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Verify OTP

```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456"
}
```

### User Profile Management

```http
GET /api/user/profile
Authorization: Bearer <token>
```

```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Updated Name"
}
```

### Record User Interactions

```http
POST /api/user/interactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "movie_view",
  "movieId": "uuid",
  "metadata": {...}
}
```

### Get Preference Insights

```http
GET /api/user/preference-insights
Authorization: Bearer <token>
```

---

## 🎬 Movies & Content

### Get Movies

```http
GET /api/movies?smart=true&limit=12&page=1
Authorization: Bearer <token> (optional)
```

**Query Parameters**:

- `smart` (boolean): Enable AI-powered recommendations
- `behavioral` (boolean): Use behavioral analysis
- `realtime` (boolean): Fetch live TMDB data
- `query` (string): Search query
- `mood` (string): Mood-based filtering
- `genres` (string): Comma-separated genre IDs
- `limit` (number): Results limit (default: 12)
- `page` (number): Page number for pagination

**Response**:

```json
{
  "success": true,
  "data": {
    "movies": [
      {
        "id": "uuid",
        "title": "Movie Title",
        "overview": "Movie description",
        "posterPath": "/poster.jpg",
        "releaseDate": "2024-01-01",
        "rating": 8.5,
        "genres": ["Action", "Drama"],
        "confidence": 0.95
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 100,
      "hasNext": true
    }
  }
}
```

### Search Movies

```http
POST /api/movies/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "sci-fi movies like Blade Runner",
  "limit": 10
}
```

### Get Movie Details

```http
GET /api/movies/{id}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Movie Title",
    "overview": "Detailed description",
    "runtime": 120,
    "budget": 50000000,
    "revenue": 150000000,
    "cast": [...],
    "crew": [...],
    "similar": [...]
  }
}
```

### Get Similar Movies

```http
GET /api/movies/{id}/similar?limit=6
```

### Get Movie Explanations

```http
GET /api/movies/explanations?movieId={id}
Authorization: Bearer <token>
```

### Movie Autocomplete

```http
GET /api/movies/autocomplete?q=inception
```

---

## 🤖 AI & Recommendations

### AI Chat Interface

```http
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Recommend me some horror movies",
  "sessionId": "uuid",
  "stream": false
}
```

**Features**:
- **Memory Integration**: Automatically enriches prompts with user context
- **Multi-Provider Support**: Uses OpenAI GPT-5-mini (primary) or Claude (fallback)
- **User Context**: Includes seen movies, preferences, and recent activity

**Streaming Response** (when `stream: true`):

```
data: {"type": "chunk", "content": "I'd recommend..."}
data: {"type": "chunk", "content": " some great horror movies..."}
data: {"type": "done"}
```

### Hyper-Personalized Recommendations

```http
GET /api/recommendations/hyper-personalized?count=10&excludeWatched=true
Authorization: Bearer <token>
```

**Features**:
- **Memory Filtering**: Automatically filters out movies user has already seen
- **Preference Integration**: Uses user's genre preferences and quality standards
- **Recency Decay**: Recent preferences weighted higher than older ones

**Query Parameters**:

- `count` (number): Number of recommendations
- `context` (string): Recommendation context
- `excludeWatched` (boolean): Filter out watched movies (uses memory service)
- Custom weighting parameters

```http
POST /api/recommendations/hyper-personalized
Authorization: Bearer <token>
Content-Type: application/json

{
  "signal": "positive_rating",
  "movieId": "uuid",
  "strength": 0.8
}
```

### Memory System

#### Get User Memory

```http
GET /api/user/memory
Authorization: Bearer <token>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "seenMovieIds": [1, 2, 3],
    "ratedMovies": [...],
    "watchlistMovies": [...],
    "genrePreferences": {
      "Action": 0.8,
      "Drama": 0.6
    },
    "recentInteractions": [...],
    "qualityThreshold": 7.0,
    "explorationWeight": 0.2
  }
}
```

#### Filter Unseen Movies

```http
POST /api/user/memory/filter-unseen
Authorization: Bearer <token>
Content-Type: application/json

{
  "movies": [
    {"id": "movie-1", "tmdb_id": 1},
    {"id": "movie-2", "tmdb_id": 2}
  ]
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "filteredMovies": [
      {"id": "movie-2", "tmdb_id": 2}
    ],
    "filteredCount": 1,
    "totalCount": 2
  }
}
```

### Semantic Recommendations

```http
GET /api/recommendations/semantic?movieId={id}&limit=6
Authorization: Bearer <token>
```

---

## 📝 User Data & Preferences

### Manage Preferences

```http
GET /api/preferences
Authorization: Bearer <token>
```

```http
PUT /api/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "genres": ["Action", "Sci-Fi"],
  "actors": ["Actor Name"],
  "directors": ["Director Name"],
  "yearRange": [2000, 2024],
  "ratingRange": [7.0, 10.0]
}
```

```http
PATCH /api/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "operation": "add",
  "field": "genres",
  "value": "Horror"
}
```

```http
DELETE /api/preferences
Authorization: Bearer <token>
```

### Rate Movies

```http
POST /api/ratings
Authorization: Bearer <token>
Content-Type: application/json

{
  "movie_id": "uuid",
  "interested": true,
  "rating": 5
}
```

### Watchlist Management

```http
GET /api/watchlist?watched=false
Authorization: Bearer <token>
```

```http
POST /api/watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "movieId": "uuid",
  "source": "recommendation"
}
```

```http
PATCH /api/watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "movieId": "uuid",
  "watched": true,
  "rating": 4,
  "notes": "Great movie!"
}
```

```http
DELETE /api/watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "movieId": "uuid"
}
```

### Individual Watchlist Item

```http
PATCH /api/watchlist/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "watched": true,
  "rating": 5
}
```

```http
DELETE /api/watchlist/{id}
Authorization: Bearer <token>
```

---

## 🛠️ System & Health

### Health Check

```http
GET /api/health
```

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "2.0.0",
  "checks": {
    "supabase": "✅ connected",
    "database": "✅ migrations applied",
    "openai_api_key": "✅ configured",
    "anthropic_api_key": "✅ configured",
    "tmdb_api_key": "✅ configured",
    "environment": "✅ development"
  },
  "responseTime": 376
}
```

**Health Check Features**:
- **Database Status**: Verifies Supabase connection and migrations
- **API Keys**: Validates OpenAI, Anthropic, and TMDB API keys
- **Environment**: Checks development/production configuration
- **Response Time**: Measures endpoint performance

### Movie Sync Script

```bash
npm run sync:movies
```

**Features**:
- **Rate Limiting**: Respects TMDB API limits (40 requests per 10 seconds)
- **Batch Processing**: Fetches trending and popular movies
- **Upsert Logic**: Prevents duplicate movies in database
- **Error Handling**: Continues processing even if some requests fail
- **Progress Logging**: Shows sync progress and results

**What it does**:
1. Fetches trending movies from TMDB (last 3 months)
2. Fetches popular movies
3. Removes duplicates based on TMDB ID
4. Upserts movies into database
5. Logs sync results and sample movies

### Admin: Tune Recommendation Weights

```http
POST /api/admin/tune-weights
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "weights": {
    "genre": 0.3,
    "director": 0.2,
    "actor": 0.25,
    "year": 0.1,
    "rating": 0.15
  }
}
```

---

## 📊 Error Codes

| Code                   | Description                       |
| ---------------------- | --------------------------------- |
| `VALIDATION_ERROR`     | Invalid request parameters        |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication |
| `AUTHORIZATION_ERROR`  | Insufficient permissions          |
| `NOT_FOUND`            | Resource not found                |
| `RATE_LIMITED`         | Too many requests                 |
| `AI_SERVICE_ERROR`     | AI service unavailable            |
| `DATABASE_ERROR`       | Database connection issue         |
| `EXTERNAL_API_ERROR`   | External service failure          |

## 🧠 Memory System

### User Memory Service

The unified memory system aggregates all user data to provide context-aware recommendations:

**Features**:
- **Seen Movies Tracking** - Remembers all watched and rated movies
- **Recent Activity** - Tracks movies seen in the last 30 days for novelty detection
- **Genre Preferences** - Learns from user ratings with recency decay
- **Behavioral Signals** - Captures interaction patterns and preferences
- **Novelty Penalties** - Reduces scores for movies similar to recently seen ones

**Memory Endpoints**:
- `GET /api/user/memory` - Get unified user memory
- `POST /api/user/memory/filter-unseen` - Filter unseen movies
- `POST /api/user/memory/apply-novelty-penalties` - Apply novelty penalties

### Single User Mode

For personal use, enable `SINGLE_USER_MODE=true` in environment variables:
- Skips authentication for frictionless local development
- Uses default user ID for all operations
- Perfect for personal movie recommendation setup

## 🔒 Rate Limiting

- **AI Endpoints**: 10 requests per minute (expensive operations)
- **Search Endpoints**: 30 requests per minute
- **General API**: 60 requests per minute
- **Health Check**: 5 requests per minute (prevent abuse)

Rate limit headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2024-01-01T00:01:00Z
Retry-After: 60
```

## 📝 Request/Response Examples

### Successful Movie Search

```bash
curl -X POST "https://your-app.vercel.app/api/movies/search" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"query": "action movies from 2020", "limit": 5}'
```

### Error Response Example

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameter",
    "details": {
      "field": "limit",
      "reason": "Must be between 1 and 50"
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123456"
  }
}
```

## 🚀 SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @cineai/sdk
```

```typescript
import { CineAI } from '@cineai/sdk'

const client = new CineAI({
  baseUrl: 'https://your-app.vercel.app/api',
  apiKey: 'your-jwt-token',
})

const movies = await client.movies.search({
  query: 'sci-fi movies',
  limit: 10,
})
```

## 📚 Additional Resources

- [Authentication Guide](./AUTH_SETUP.md)
- [AI Features Documentation](./AI_FEATURES_REQUIREMENTS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

_This documentation is automatically updated with each API release. For the latest version, visit our [GitHub repository](https://github.com/your-username/cineai)._
