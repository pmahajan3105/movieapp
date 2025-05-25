# Mem0.ai Implementation Guide for CineAI Movie App

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Architecture](#architecture)
4. [Environment Configuration](#environment-configuration)
5. [Core Implementation](#core-implementation)
6. [API Integration](#api-integration)
7. [Streaming Chat](#streaming-chat)
8. [Frontend Integration](#frontend-integration)
9. [Testing & Debugging](#testing--debugging)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This guide documents the complete Mem0.ai integration in the CineAI Movie App. Mem0 provides intelligent, personalized AI memory capabilities that remember user preferences, past conversations, and movie interactions to create truly personalized experiences.

### What We've Built ✅

- ✅ AI that remembers user movie preferences using Mem0
- ✅ Contextual conversations based on past interactions
- ✅ Automatic memory extraction from conversations
- ✅ Movie recommendation improvements based on memory
- ✅ Real-time streaming chat with GROQ and Anthropic
- ✅ Robust error handling and fallback mechanisms

---

## Current Implementation Status

### ✅ **COMPLETED**

- **Mem0 Service**: Full `MovieMemoryService` class with TypeScript types
- **API Integration**: Integrated into chat, movies, and recommendations APIs
- **Streaming Chat**: Real-time streaming with both GROQ and Anthropic
- **Error Handling**: Graceful fallback when Mem0 fails
- **Authentication**: User-specific memory storage
- **Memory Management**: Advanced conversation memory with categorization

### 🔧 **ARCHITECTURE DECISIONS**

- **Direct API Integration**: We use direct GROQ/Anthropic API calls instead of a separate AI service class
- **Existing Database Schema**: We leverage existing Supabase tables instead of additional memory tracking tables
- **Integrated UI**: Mem0 is integrated into existing chat interface rather than separate components

---

## Architecture

### Current Tech Stack

```
Frontend: Next.js 15 + TypeScript + Tailwind
Backend: Next.js API Routes + Supabase
AI Providers: GROQ (primary) + Anthropic Claude (fallback)
Memory: Mem0.ai
Database: Supabase PostgreSQL
Authentication: Supabase Auth
```

### Data Flow

```
User Message → Chat API → AI Provider (GROQ/Claude) → Mem0 Storage → Response
                    ↓
              Memory Context Retrieved → Enhanced Response
```

---

## Environment Configuration

### Required Environment Variables

```env
# Mem0 Configuration
MEM0_API_KEY=your_mem0_api_key_here

# AI Service Configuration
GROQ_API_KEY=your_groq_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase Configuration (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Getting API Keys

1. **Mem0**: [mem0.ai](https://mem0.ai) → Sign up → API Settings → Generate key
2. **GROQ**: [console.groq.com](https://console.groq.com) → API Keys → Create new key
3. **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key

---

## Core Implementation

### Mem0 Service (`src/lib/mem0/client.ts`)

Our main Mem0 service handles all memory operations:

```typescript
export class MovieMemoryService {
  // Add conversation memories
  async addConversation(messages: Message[], userId: string, metadata = {})

  // Search for relevant memories
  async searchPreferences(query: string, userId: string, categories = [])

  // Get organized user preferences
  async getUserPreferences(userId: string)

  // Add specific movie preferences
  async addMoviePreference(userId, preferenceType, content, metadata = {})

  // Get recommendation context for AI
  async getRecommendationContext(userId: string, movieQuery?: string)

  // Update/delete preferences
  async updatePreference(memoryId: string, newContent: string)
  async deletePreference(memoryId: string)
}
```

### Key Features

- **TypeScript Types**: Complete type safety with proper interfaces
- **Error Handling**: Graceful fallback when Mem0 API fails
- **Memory Categorization**: Organized by genres, directors, themes, etc.
- **Context Building**: Intelligent context for AI conversations

---

## API Integration

### Chat API (`src/app/api/ai/chat/route.ts`)

Enhanced chat with Mem0 integration:

```typescript
// 1. Get Mem0 context for user
const mem0Messages: Message[] = chatHistory.map(msg => ({
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
}))

// 2. Store conversation in Mem0 (with error handling)
try {
  const memories = await movieMemoryService.addConversation(mem0Messages, user.id, {
    session_id: currentSessionId,
    conversation_type: 'preference_extraction',
  })

  recommendationContext = await movieMemoryService.getRecommendationContext(user.id)
} catch (mem0Error) {
  console.error('❌ Mem0 storage error (continuing without Mem0):', mem0Error)
  // Continue with traditional preference extraction
}
```

### Movies API (`src/app/api/movies/route.ts`)

Smart recommendations enhanced with Mem0:

```typescript
// Get Mem0 recommendation context
mem0Context = await movieMemoryService.getRecommendationContext(user.id)

// Combine traditional preferences with Mem0 insights
const mem0Genres = mem0Context?.preferences?.favorite_genres?.map(g => g.keyword) || []
const mem0Directors = mem0Context?.preferences?.favorite_directors?.map(d => d.keyword) || []

// Enhanced preference-based movie filtering
if (allPreferredGenres.length > 0) {
  query = query.overlaps('genre', allPreferredGenres)
}
```

### Memory API (`src/app/api/memories/route.ts`)

Full memory management endpoint:

```typescript
GET / api / memories // Get all user memories
POST / api / memories // Add manual memory
DELETE / api / memories // Delete specific memory
GET / api / memories / search // Search user memories
```

---

## Streaming Chat

### Real-time Streaming Implementation

We support streaming for both GROQ and Anthropic with proper chunk buffering:

```typescript
// Enhanced streaming with buffer for incomplete JSON chunks
let buffer = '' // Buffer for incomplete JSON chunks

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = new TextDecoder().decode(value)
  buffer += chunk

  const lines = buffer.split('\n')
  buffer = lines.pop() || '' // Keep incomplete lines in buffer

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const eventData = line.slice(6).trim()
      // Process complete JSON events...
    }
  }
}
```

### Fallback Mechanism

If streaming fails, we automatically fall back to non-streaming:

```typescript
try {
  await handleStreamingResponse(messageContent)
} catch (streamingError) {
  console.log('🔄 Streaming failed, falling back to non-streaming:', streamingError)

  // Fallback to non-streaming API call
  const response = await fetch('/api/ai/chat', {
    body: JSON.stringify({ message: messageContent, sessionId, stream: false }),
  })
}
```

---

## Frontend Integration

### Chat Interface (`src/components/ai/ChatInterface.tsx`)

Our chat interface handles both streaming and non-streaming responses:

```typescript
// Streaming event handling
const handleStreamingResponse = async (messageContent: string) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: messageContent, sessionId, stream: true }),
  })

  const reader = response.body?.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Process streaming events...
  }
}
```

### Memory Context Display

The interface shows when memories are being used:

```typescript
{memoriesUsed > 0 && (
  <p className="text-xs opacity-90">
    Using {memoriesUsed} memories from our past conversations
  </p>
)}
```

---

## Testing & Debugging

### Current Test Status ✅

1. **✅ Basic Conversation Memory**: Chat stores and retrieves memories
2. **🔧 Preference Extraction**: Fixed trigger logic for user requests ("save my preference")
3. **✅ Movie Recommendations**: Enhanced recommendations using Mem0 context
4. **✅ Streaming Chat**: Real-time responses with both GROQ and Claude (JSON parsing improved)
5. **✅ Error Handling**: Graceful fallback when Mem0 fails
6. **✅ Authentication**: User-specific memory storage
7. **🔧 Fixed Issues**: Improved preference extraction triggers, better logging, database upsert

### Debug Endpoints

Test Mem0 integration:

```bash
# Test chat with streaming
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I love sci-fi movies", "stream": true}'

# Test memory API
curl http://localhost:3000/api/memories

# Test enhanced movie recommendations
curl "http://localhost:3000/api/movies?smart=true&limit=5"
```

---

## Best Practices

### Memory Quality

- ✅ **Specific Content**: Store actionable, specific preferences
- ✅ **Categorization**: Organize memories by type (genre, director, theme)
- ✅ **Context Limiting**: Use only 5-10 most relevant memories per conversation
- ✅ **Error Resilience**: Always provide fallback when Mem0 fails

### Performance

- ✅ **Background Processing**: Memory extraction happens asynchronously
- ✅ **Caching**: Memory context is cached per conversation
- ✅ **Rate Limiting**: Built-in retry logic for failed requests

### Privacy & Security

- ✅ **User Isolation**: Memories are strictly user-specific
- ✅ **No Sensitive Data**: We only store movie preferences, not personal info
- ✅ **Easy Deletion**: Users can delete specific memories via API

---

## Troubleshooting

### Common Issues & Solutions

**Issue: "MEM0_API_KEY is required" error**

```bash
# Check environment variables
grep MEM0_API_KEY .env.local
# Restart dev server after adding key
npm run dev
```

**Issue: Memories not appearing in conversations**

```typescript
// Check if buildUserContext is returning memories
const context = await movieMemoryService.getRecommendationContext(userId)
console.log('Memory context:', context.memories.length)
```

**Issue: Streaming parsing errors**

```bash
# Check logs for JSON parsing errors
# Our implementation includes buffer handling for incomplete chunks
```

**Issue: High memory costs**

```typescript
// Implement memory importance filtering
const relevantMemories = await this.searchPreferences(query, userId, {
  limit: 5, // Limit context size
  threshold: 0.1, // Only high-relevance memories
})
```

### Debug Mode

Enable debug logging:

```typescript
// Add to mem0 service constructor
this.debug = process.env.NODE_ENV === 'development'

if (this.debug) {
  console.log('Memory operation:', { operation, userId, data })
}
```

---

## Current Implementation Summary

### ✅ **What's Working**

- Mem0 memory storage and retrieval
- Streaming chat with GROQ and Anthropic
- Enhanced movie recommendations with memory context
- User-specific preference storage
- Graceful error handling and fallback
- TypeScript type safety

### 🎯 **Architecture Highlights**

- **Integrated Approach**: Mem0 is seamlessly integrated into existing APIs
- **Robust Fallback**: System continues working even if Mem0 fails
- **Real-time Streaming**: Enhanced user experience with live responses
- **Type Safety**: Complete TypeScript implementation with proper interfaces

### 🚀 **Performance**

- Memory context limited to most relevant items (5-10 memories)
- Background processing for memory extraction
- Efficient caching and rate limiting
- Error resilience with multiple fallback layers

Your CineAI Movie App now has advanced AI memory capabilities that create truly personalized movie discovery experiences! 🎬✨
