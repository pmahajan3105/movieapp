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

**Query Parameters**:

- `count` (number): Number of recommendations
- `context` (string): Recommendation context
- `excludeWatched` (boolean): Filter out watched movies
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

## 🎙️ Voice & Conversation

### Start Conversation

```http
POST /api/conversations/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "context": "movie_recommendations"
}
```

### Exchange Messages

```http
POST /api/conversations/exchange
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "uuid",
  "message": "Tell me about this movie",
  "movieId": "uuid"
}
```

---

## 🛠️ System & Health

### Health Check

```http
GET /api/healthz
```

**Response**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "aiService": "operational",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "uptime": 3600
  }
}
```

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

## 🔒 Rate Limiting

- **Default**: 10 requests per minute per IP
- **Authenticated**: 60 requests per minute per user
- **Admin**: 100 requests per minute

Rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
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
