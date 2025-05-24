CineAI - Personal Movie Recommendation App
Version: 2.0
Date: November 2024
Owner: PM-turned-Founder
Status: Ready for Development
1.1 Executive Summary
CineAI is a personal AI-powered movie recommendation web application that uses conversational AI to understand user preferences and provides personalized movie suggestions through an intuitive swipe interface. Built for personal use (creator + friends), it prioritizes recommendation quality over scale.
Key Differentiators

AI-First: Uses open-source LLMs (via Groq) for all recommendations
Conversational Onboarding: Natural language preference gathering
Swipe Interface: Tinder-like UX for movie discovery
Personal Watchlist: Integrated movie tracking system
No Ads/Analytics: Clean, focused experience

1.2 Product Goals & Success Metrics
Primary Goals

Eliminate Choice Paralysis: Make movie selection effortless and enjoyable
Personalized Discovery: Surface movies that genuinely match user taste
Efficient Tracking: Simple watchlist management

Success Metrics (for Personal Use)

Engagement: 3+ swipes per session
Quality: 60%+ "like" rate on recommendations
Utility: 50%+ of watchlist movies actually watched
Retention: Weekly usage by all users

1.3 User Personas
Primary User: The Curator (You)

Film enthusiast with diverse taste
Values thoughtful recommendations over popular picks
Wants to track movies efficiently
Appreciates good UX/UI

Secondary Users: Close Friends (3-5 people)

Casual to moderate movie watchers
Trust your movie taste
Want quick, quality recommendations
Mobile-first usage

1.4 Core Features (MVP)
4.1 Authentication (P0)
Feature ID: AUTH-01
Description: Simple, secure email-based authentication
Requirements:

Email + OTP login (no passwords)
Session persistence
Auto-logout after 30 days
"Remember me" option

User Flow:

Enter email → Receive OTP → Enter OTP → Access granted
Returning users auto-login if session valid

4.2 AI Preference Chat (P0)
Feature ID: AI-CHAT-01
Description: Conversational interface to gather movie preferences
Requirements:

Natural language conversation with AI
Extract structured preferences from chat
Confirm and save preferences
Allow preference updates anytime

Sample Conversation Flow:
AI: "Hi! I'm CineAI. Tell me about some movies you've loved recently?"
User: "I really enjoyed Interstellar and Arrival"
AI: "Great choices! You seem to enjoy thought-provoking sci-fi. What did you like about them?"
User: "The emotional depth and the mind-bending concepts"
AI: "Perfect! Any genres you typically avoid?"
[...continues until preferences captured...]
Extracted Data Structure:
json{
"favorite_movies": ["Interstellar", "Arrival"],
"preferred_genres": ["sci-fi", "drama"],
"themes": ["time", "space", "emotional depth"],
"avoid_genres": ["horror", "musical"],
"preferred_eras": ["modern"],
"mood_preferences": {
"default": "thought-provoking",
"weekend": "light-hearted"
}
}
4.3 Swipe-Based Recommendations (P0)
Feature ID: SWIPE-01
Description: Tinder-style interface for movie discovery
Requirements:

One movie card at a time
Swipe right = Like (save preference)
Swipe left = Dislike (save preference)
Swipe up = Add to watchlist
Tap = View details

Card Information:

Movie poster (high quality)
Title & Year
IMDb rating
Brief tagline
Genre tags
AI's reason for recommending

Queue Management:

Generate 15-20 recommendations on-demand
Trigger new generation when 5 remain
Learn from swipe patterns

4.4 Movie Details (P0)
Feature ID: DETAIL-01
Description: Comprehensive movie information page
Requirements:

Full plot summary
Cast & crew
Ratings (IMDb, RT if available)
Runtime & release year
Trailer link (YouTube)
Similar movie suggestions
Add/remove from watchlist
"Not interested" option

4.5 Watchlist (P0)
Feature ID: WATCH-01
Description: Personal movie tracking system
Requirements:

Add from swipe or detail page
Mark as watched/unwatched
Personal notes/rating
Filter by genre/year
Sort by date added/rating/year
Export functionality
"Pick for me" AI suggestion

Watchlist Views:

Grid view (posters)
List view (detailed)
Stats dashboard (genres, years, etc.)

4.6 Mood-Based Discovery (P1)
Feature ID: MOOD-01
Description: Quick recommendations based on current mood
Requirements:

Text input for mood
Quick 5-movie suggestions
One-tap add to watchlist
History of mood searches

Example Moods:

"Something uplifting"
"Mind-bending thriller"
"90s nostalgia"
"Date night"

1.5 User Journeys
First-Time User Journey

Landing → Welcome screen with app preview
Sign Up → Email + OTP verification
Onboarding → AI chat to gather preferences (5-10 min)
First Swipes → Immediate recommendations based on chat
Engagement → Like/dislike/watchlist actions
Return → Check watchlist or continue swiping

Returning User Journey

Auto-login → Direct to home screen
Choose Action:

Continue swiping
Check watchlist
Mood-based search
Update preferences

Engage → Swipe/watch/rate
AI Learning → Better recommendations each session

1.6 Design Requirements
Visual Design

Theme: Clean, modern, light mode only
Colors:

Primary: Subtle blue (#3B82F6)
Success: Green (#10B981)
Danger: Red (#EF4444)
Neutral: Grays

Typography: Inter or system fonts
Components: Shadcn/ui design system

Responsive Design

Mobile First: Optimized for phone swiping
Tablet: Comfortable browsing
Desktop: Full experience with keyboard shortcuts

Animations

Smooth card swipe animations
Subtle hover effects
Loading skeletons
Success/error feedback

1.7 Technical Constraints
Performance

Initial load < 3 seconds
Swipe response < 100ms
AI generation < 5 seconds

Browser Support

Modern browsers only (Chrome, Safari, Firefox, Edge)
No IE11 support

Data Limits

Max 1000 pre-seeded movies
Max 30 recommendations per generation
Max 500 movies in watchlist

const GROQ_CONFIG = {
apiKey: process.env.GROQ_API_KEY,
model: 'gemma-7b-it', // Single model for consistency
temperature: 0.7,
maxTokens: 1000,
rateLimit: {
requestsPerMinute: 30,
tokensPerMinute: 10000
}
}

## 📝 Implementation Updates (v2.1)

**Date**: December 2024  
**Status**: Implemented & Tested

### **Simplified Approach Adopted**

#### **Dashboard-First Design**
- **Grid-based layout** instead of single-card swipe interface
- **Integrated chat** directly in dashboard for better UX
- **Quick stats** showing recommendations and top movies
- **Multiple movie cards** visible simultaneously for faster browsing

#### **Streamlined Rating System**
- **Simple like/dislike** buttons instead of complex swipe gestures
- **Immediate feedback** with visual confirmation
- **Quick rating** for faster preference learning

#### **Practical AI Integration**
- **Embedded chat interface** in main dashboard
- **Real-time conversation** with typing indicators
- **Automatic preference extraction** without complex flows
- **Context-aware responses** based on user history

#### **Technical Improvements**
- **Comprehensive testing** with Jest and React Testing Library
- **Code quality tools** including ESLint, Prettier, Husky
- **Environment validation** with Zod schemas
- **Error handling** and loading states throughout

### **What Changed from Original Plan**

| Original Plan | Implemented Solution | Reason |
|---------------|---------------------|---------|
| Single-card swipe interface | Grid-based dashboard | Better discoverability |
| Separate onboarding flow | Integrated chat | Smoother UX |
| Complex swipe gestures | Simple like/dislike buttons | More intuitive |
| Separate chat page | Embedded chat widget | Better accessibility |
| Complex mood system | Simplified AI chat | Easier to use |

### **Current Implementation Status**

✅ **Authentication System** - Complete with OTP  
✅ **AI Chat Interface** - Natural conversation flow  
✅ **Movie Recommendations** - Grid-based display  
✅ **Quick Rating System** - Like/dislike functionality  
✅ **Dashboard Interface** - Modern, responsive design  
✅ **Testing Infrastructure** - Comprehensive test suite  
✅ **Code Quality** - Linting, formatting, pre-commit hooks  

🚧 **Next Phase Features**
- Enhanced movie details page
- Watchlist functionality
- Advanced filtering options
- Movie search capabilities
