# 🤖 CineAI Chat Interface Setup

Complete AI-powered chat interface for movie preference gathering using Groq and natural conversation.

## 🚀 Quick Start

### 1. Environment Variables

Add to your `.env.local` file:

```env
# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key

# Existing Supabase config...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

Run the updated SQL schema from `src/lib/supabase/config.ts` in your Supabase SQL editor to add the `chat_sessions` table.

### 3. Get Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Create an account and get your API key
3. Add it to your environment variables

### 4. Test the System

```bash
npm run dev
# Visit http://localhost:3000/dashboard/preferences
```

## 📋 Features Implemented

### ✅ **Natural Conversation Flow**
- **Conversational AI** - Feels like chatting with a knowledgeable friend
- **Context-aware** - Remembers previous messages in the conversation
- **Smart questioning** - Asks follow-up questions to understand preferences
- **Preference extraction** - Automatically detects when enough info is gathered

### ✅ **Beautiful Chat Interface**
- **Real-time messaging** - Instant message exchange
- **Typing indicators** - Shows when AI is "thinking"
- **Auto-scroll** - Smooth scrolling to latest messages
- **Message timestamps** - Shows when each message was sent
- **Error handling** - Graceful error states with retry options

### ✅ **Smart Preference Detection**
- **Automatic extraction** - AI determines when to extract preferences
- **Structured data** - Converts conversation to organized preferences
- **Visual summary** - Beautiful display of learned preferences
- **Database storage** - Saves preferences to user profile

### ✅ **Production Ready**
- **Session management** - Maintains conversation context
- **Error handling** - Comprehensive error management
- **Loading states** - Beautiful loading animations
- **Responsive design** - Works on all devices

## 🎯 How It Works

### **1. Conversation Flow**
```
User visits preferences → AI welcomes → Natural chat → Preferences extracted → Summary shown
```

### **2. AI Processing**
```
User message → Add to history → Send to Groq → AI response → Check for extraction → Update UI
```

### **3. Preference Extraction**
```
Monitor conversation → Detect completion signals → Extract structured data → Update database
```

## 🎨 Components Overview

### **ChatInterface**
- Main container managing conversation state
- Handles message history and API calls
- Shows completion state and preference extraction
- Auto-scrolls and manages loading states

### **ChatMessage**
- Individual message display with avatars
- Supports typing indicators with animation
- Responsive design with timestamps
- Different styles for user vs AI messages

### **ChatInput**
- Text input with send button
- Enter key support and character limits
- Loading states and disabled states
- Beautiful send icon with animations

### **PreferenceSummary**
- Visual display of extracted preferences
- Organized by categories with color coding
- Action buttons for continuing or editing
- Handles empty states gracefully

## 🔧 API Integration

### **POST /api/ai/chat**

**Request:**
```json
{
  "message": "I love sci-fi movies like Interstellar",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Great choice! Interstellar is amazing. What did you love most about it?",
  "sessionId": "uuid-session-id",
  "preferencesExtracted": false
}
```

**When preferences are extracted:**
```json
{
  "success": true,
  "message": "Perfect! I've learned your preferences.",
  "sessionId": "uuid-session-id",
  "preferencesExtracted": true,
  "preferences": {
    "favorite_movies": ["Interstellar"],
    "preferred_genres": ["sci-fi"],
    "themes": ["space", "time travel"],
    "preferred_eras": ["2010s"]
  }
}
```

## 🧠 AI Configuration

### **Groq Model**
- **Model**: `gemma-7b-it` (Gemma for consistency)
- **Temperature**: 0.7 (balanced creativity)
- **Max tokens**: 1000 (sufficient for responses)
- **Context window**: Maintains full conversation

### **System Prompt**
The AI is trained to:
- Be conversational and friendly, not robotic
- Ask thoughtful follow-up questions
- Show enthusiasm for user's choices
- Gather comprehensive preference data
- Know when to stop and extract preferences

### **Preference Categories**
- **Favorite Movies** - Specific titles mentioned
- **Genres** - Both preferred and avoided
- **Themes** - Story elements that appeal
- **Eras** - Time periods (classic, 2000s, etc.)
- **People** - Favorite actors and directors
- **Context** - Solo vs social, weekend vs weekday
- **Moods** - Default, relaxing, energizing preferences

## 💾 Database Schema

### **chat_sessions Table**
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  preferences_extracted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Message Format**
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}
```

## 🎨 Styling & UX

### **Chat Bubbles**
- **User messages**: Blue bubbles, right-aligned
- **AI messages**: Gray bubbles, left-aligned with CineAI avatar
- **Rounded corners** with proper spacing
- **Responsive sizing** for mobile and desktop

### **Typing Animation**
- **Three dots** with staggered bounce animation
- **Smooth transitions** between states
- **Proper timing** that feels natural

### **Color Coding**
- **Blue**: User messages and primary actions
- **Purple**: AI branding and avatars
- **Green**: Success states and completion
- **Red**: Error states and warnings
- **Gray**: Secondary information

## 🔄 User Experience Flow

### **First Visit**
1. User lands on preferences page
2. Sees welcoming AI message
3. Types natural response about movie preferences
4. AI asks thoughtful follow-up questions
5. Conversation builds understanding
6. AI automatically detects completion
7. Shows beautiful preference summary
8. User continues to movie discovery

### **Error Handling**
- **Network errors**: Retry with helpful messages
- **AI errors**: Graceful fallbacks with retry options
- **Invalid input**: Clear validation messages
- **Session issues**: Automatic recovery

## 🚦 Usage Examples

### **Basic Integration**
```tsx
import { ChatInterface } from '@/components/ai/ChatInterface'

function PreferencesPage() {
  const handlePreferencesExtracted = (preferences) => {
    console.log('Extracted:', preferences)
    // Handle the extracted preferences
  }

  return (
    <div className="h-[600px]">
      <ChatInterface onPreferencesExtracted={handlePreferencesExtracted} />
    </div>
  )
}
```

### **With Summary Display**
```tsx
import { PreferenceSummary } from '@/components/ai/PreferenceSummary'

function PreferencesResult({ preferences }) {
  return (
    <PreferenceSummary
      preferences={preferences}
      onContinue={() => router.push('/dashboard')}
      onEdit={() => setShowChat(true)}
    />
  )
}
```

## 🎯 Conversation Examples

### **Natural Flow**
```
AI: "Hi there! I'm CineAI. Tell me about a movie you recently enjoyed!"

User: "I loved Dune, the visuals were incredible"

AI: "Dune is absolutely stunning! The cinematography is breathtaking. Do you enjoy other sci-fi epics, or was it more about the visual spectacle for you?"

User: "I love sci-fi in general, especially space operas"

AI: "Space operas are fantastic! Do you prefer the classic ones like Star Wars, or more modern takes like Dune and Blade Runner 2049?"
```

## 🔧 Advanced Configuration

### **Custom Prompts**
You can modify the system prompts in `src/lib/groq/config.ts`:
- `PREFERENCE_SYSTEM_PROMPT` - Main conversation behavior
- `PREFERENCE_EXTRACTION_PROMPT` - How to extract structured data

### **Model Settings**
Adjust AI behavior in `groqConfig`:
- **Temperature**: Higher = more creative, Lower = more focused
- **Max tokens**: Response length limit
- **Top P**: Nucleus sampling parameter

### **Extraction Triggers**
The system extracts preferences when:
- User has sent 3+ messages AND AI mentions "organize" or "learned"
- User has sent 5+ messages (automatic extraction)
- AI determines conversation is complete

## 🎉 Ready to Chat!

Your AI chat interface is now complete and ready to have natural conversations about movies. The system will automatically learn user preferences and provide a beautiful summary for onboarding.

## 🔄 Next Steps

1. **Test conversations** - Try different movie preferences
2. **Customize prompts** - Adjust AI personality to match your brand
3. **Monitor usage** - Check chat sessions in your database
4. **Expand features** - Add more preference categories as needed

---

**The AI chat system provides a delightful, human-like onboarding experience that makes discovering movie preferences fun and engaging!** 🎬🤖✨ 