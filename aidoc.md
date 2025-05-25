# **PRD: Conversational Preference Gathering with Llama via Groq**

## **Executive Summary**

Replace traditional preference forms with an AI-powered conversation using Llama via Groq that naturally discovers user movie preferences, creating a more engaging onboarding experience and gathering richer preference data.

---

## **1. Problem Statement**

### **Current State Pain Points:**
- **Form Fatigue:** Users abandon complex preference forms (industry average: 68% drop-off)
- **Limited Data:** Checkboxes capture surface-level preferences (genres) but miss nuanced tastes
- **Poor Matching:** Generic preferences lead to irrelevant recommendations
- **Cold Start Problem:** New users get poor recommendations due to insufficient data

### **Opportunity:**
Transform preference gathering from a chore into an engaging conversation, capturing 5-10x more preference data while improving user experience.

---

## **2. Solution Overview**

### **Core Concept:**
An AI-powered chat interface using Llama via Groq that conducts natural conversations about movies, extracting detailed preferences through storytelling rather than form-filling.

### **Key Differentiators:**
- **Conversational UI** vs. traditional forms
- **Deep preference extraction** vs. surface-level categories  
- **Contextual understanding** vs. rigid data collection
- **Engaging onboarding** vs. boring setup process
- **Fast responses** via Groq's high-speed inference

---

## **3. User Stories & Acceptance Criteria**

### **Epic: Conversational Preference Discovery**

#### **User Story 1: Initial Conversation**
**As a** new user  
**I want to** chat naturally about movies I love  
**So that** the app understands my taste without filling forms

**Acceptance Criteria:**
- [ ] Chat interface loads immediately after registration
- [ ] AI initiates conversation with engaging opening message
- [ ] User can type natural language responses
- [ ] AI asks follow-up questions based on user responses
- [ ] Conversation feels natural and engaging (qualitative testing)

#### **User Story 2: Preference Extraction**
**As a** user sharing movie preferences  
**I want** the AI to understand nuanced details from my stories  
**So that** I get better recommendations than generic genre matching

**Acceptance Criteria:**
- [ ] AI extracts genres from movie mentions
- [ ] AI identifies preferred actors, directors from conversations
- [ ] AI captures mood/emotional preferences
- [ ] AI recognizes viewing context preferences (date night, solo, etc.)
- [ ] AI saves structured preference data to database

#### **User Story 3: Conversation Flow Control**
**As a** user in conversation  
**I want** the AI to adapt to my engagement level  
**So that** I don't feel overwhelmed or bored

**Acceptance Criteria:**
- [ ] AI recognizes when user gives detailed vs. brief responses
- [ ] AI adjusts question complexity based on user engagement
- [ ] AI provides conversation exit points ("ready to see recommendations?")
- [ ] AI handles unclear or unrelated responses gracefully

#### **User Story 4: Preference Confirmation**
**As a** user completing preference gathering  
**I want to** review and confirm what the AI understood  
**So that** I trust the accuracy of my profile

**Acceptance Criteria:**
- [ ] AI summarizes extracted preferences in user-friendly format
- [ ] User can edit/correct AI's understanding
- [ ] User confirms preferences before saving
- [ ] System provides "add more preferences later" option

---

## **4. Technical Requirements**

### **4.1 Frontend Requirements**
- **Framework:** Next.js with React
- **UI Components:** Chat interface with message bubbles
- **Real-time Updates:** Fast streaming responses from Groq
- **Responsive Design:** Works on mobile, tablet, desktop
- **Loading States:** Minimal loading due to Groq's speed

### **4.2 Backend Requirements**
- **LLM Integration:** Groq API with Llama models (llama-3.1-70b-versatile recommended)
- **Database:** Supabase PostgreSQL for preference storage
- **API Endpoints:** Chat processing, preference extraction, data persistence
- **Session Management:** Maintain conversation context
- **Error Handling:** Graceful degradation when AI unavailable

### **4.3 Data Requirements**
- **Conversation Logs:** Store full conversation for analysis
- **Structured Preferences:** Extract and normalize preference data
- **User Context:** Link preferences to user profiles
- **Metadata Tracking:** Conversation quality metrics

---

## **5. System Design**

### **5.1 Architecture Overview**

```
User Interface (Next.js)
    ↓
API Routes (/api/chat/)
    ↓
Groq + Llama Processing Layer
    ↓
Preference Extraction Engine
    ↓
Supabase Database
```

### **5.2 Data Flow**

1. **User Input** → Frontend captures message
2. **API Call** → Send to /api/chat/process
3. **Context Building** → Retrieve conversation history
4. **Groq Request** → Generate AI response + extract preferences
5. **Data Storage** → Save conversation + preferences
6. **Response** → Stream AI reply to frontend (very fast with Groq)

---

## **6. Implementation Plan**

### **Phase 1: Foundation (Week 1-2)**

#### **Core Setup & Basic Chat**
- [ ] Set up Groq API account and keys
- [ ] Configure environment variables in Next.js
- [ ] Create basic chat UI components
- [ ] Set up Supabase tables for conversations
- [ ] Create chat message components
- [ ] Implement message input field
- [ ] Add minimal loading states (Groq is very fast)
- [ ] Style chat interface with modern design

#### **API Integration**
- [ ] Create /api/chat/send endpoint
- [ ] Integrate Groq API with Llama model
- [ ] Implement basic request/response flow
- [ ] Add error handling and fallbacks
- [ ] Test response speed and quality

### **Phase 2: Conversation Intelligence (Week 2-3)**

#### **Conversation Context**
- [ ] Implement conversation history storage
- [ ] Create session management for ongoing chats
- [ ] Build context management system
- [ ] Add conversation persistence across page refreshes

#### **AI Prompt Engineering**
- [ ] Design system prompts for movie preference gathering
- [ ] Create conversation flow templates optimized for Llama
- [ ] Implement dynamic question generation
- [ ] Test and refine AI responses for natural flow
- [ ] Optimize prompts for Llama's specific capabilities

### **Phase 3: Intelligence & Polish (Week 3-4)**

#### **Preference Extraction**
- [ ] Build preference parsing system
- [ ] Create structured data schemas
- [ ] Implement movie/actor/genre recognition
- [ ] Add mood and context extraction
- [ ] Design preference database schema
- [ ] Implement preference storage APIs
- [ ] Create user preference profiles
- [ ] Add preference update mechanisms

#### **User Experience Polish**
- [ ] Add conversation summary feature
- [ ] Implement preference confirmation flow
- [ ] Create smooth transition to recommendations
- [ ] Conduct user testing sessions
- [ ] Optimize prompts based on testing feedback
- [ ] Implement analytics tracking

---

## **7. Technical Implementation Details**

### **7.1 Database Schema**

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  preference_extraction_complete BOOLEAN DEFAULT FALSE
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- store additional message data
);

-- Extracted preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id),
  preference_type TEXT NOT NULL, -- 'genre', 'actor', 'director', 'mood', etc.
  preference_value TEXT NOT NULL,
  confidence_score FLOAT, -- AI confidence in extraction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_type, preference_value)
);
```

### **7.2 API Endpoints**

#### **POST /api/chat/send**
```typescript
// Request
{
  message: string;
  conversationId?: string;
}

// Response
{
  reply: string;
  conversationId: string;
  extractedPreferences?: PreferenceData[];
  conversationComplete?: boolean;
}
```

#### **POST /api/chat/complete**
```typescript
// Request
{
  conversationId: string;
  confirmedPreferences: PreferenceData[];
}

// Response
{
  success: boolean;
  preferencesSaved: number;
  redirectUrl: string; // to recommendations page
}
```

### **7.3 Groq Integration**

```typescript
// Groq API configuration
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const RECOMMENDED_MODEL = "llama-3.1-70b-versatile"; // Best balance of speed and capability

// Example API call
const chatCompletion = await groq.chat.completions.create({
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage }
  ],
  model: RECOMMENDED_MODEL,
  temperature: 0.7,
  max_tokens: 500,
  stream: true // Enable streaming for faster perceived response
});
```

### **7.4 Llama System Prompt**

```typescript
const SYSTEM_PROMPT = `You are a friendly movie recommendation assistant helping users discover their movie preferences through natural conversation.

GOALS:
- Have an engaging, natural conversation about movies
- Extract detailed preferences (genres, actors, directors, moods, viewing contexts)
- Adapt your questions based on user engagement level
- Make the conversation feel fun, not like an interrogation

CONVERSATION FLOW:
1. Start with an engaging opening about movies they love
2. Ask follow-up questions about what made those movies special
3. Explore different aspects: mood, setting, themes, style
4. Gradually build a complete preference profile
5. Summarize and confirm understanding

EXTRACTION TARGETS:
- Genres (obvious and hidden)
- Favorite actors/directors
- Mood preferences (comfort viewing vs. challenging)
- Viewing contexts (date night, solo viewing, family)
- Themes and storytelling preferences
- Visual/audio preferences

IMPORTANT: Keep responses conversational, enthusiastic, and under 100 words unless the user wants detailed discussion. Be direct and helpful - you're powered by Llama via Groq for fast, efficient responses.`;
```

