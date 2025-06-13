CineAI - Personal Movie Recommendation App
Version: 2.0
Date: November 2024
Owner: PM-turned-Founder
Status: Ready for Development

## 🚫 PROJECT CONSTRAINTS & SCOPE

**IMPORTANT: These constraints must be followed for all future development and suggestions.**

### ❌ EXPLICITLY OUT OF SCOPE

- **NO Mobile App Development**: This is a web-only application. Do not suggest mobile app features, React Native, or mobile-specific optimizations
- **NO Enhanced Recommendation Categories**: The current recommendation system is sufficient. Do not suggest mood-based categories, social recommendations, or complex recommendation algorithms beyond behavioral analysis

### ✅ CONFIRMED SCOPE

- **Personal Use Only**: No privacy concerns, full data utilization allowed
- **Web Application**: Responsive design for desktop and mobile browsers
- **Behavioral Intelligence**: Real-time learning from user ratings and watchlist behavior
- **Memory System**: Mem0 integration for storing user preferences and behavioral patterns
- **Real-time Updates**: Immediate learning from user interactions

## Vision

Create the ultimate personal movie recommendation experience that understands user preferences better than any existing platform by learning from ALL user interactions across platforms.

## 🚫 PROJECT SCOPE & CONSTRAINTS

**IMPORTANT: These constraints define the permanent scope of this project and must be followed for all future development.**

### ❌ EXPLICITLY OUT OF SCOPE

- **NO Mobile App Development**: This is a web-only application. Do not suggest mobile app features, React Native, mobile optimizations, or Progressive Web App features
- **NO Enhanced Recommendation Categories**: The current AI recommendation system is sufficient. Do not suggest mood-based recommendations, social recommendations, or additional recommendation engines

### ✅ APPROVED SCOPE

- Web application functionality and optimization
- Core movie recommendation system using AI
- User preference learning and memory systems
- Watchlist and viewing history management
- AI chat interface improvements
- Bug fixes and performance optimization
- Search and filtering functionality

**These constraints are permanent project decisions and should not be revisited or suggested as enhancements.**

---

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

## 📝 Implementation Updates (v2.2)

**Date**: December 2024  
**Status**: Core Features Complete, Focusing on Search & Filtering

### **Streamlined Scope (Updated)**

Based on practical usage and feedback, the scope has been refined to focus on core functionality without feature bloat.

#### **Current Implementation Status**

✅ **Authentication System** - Complete with OTP authentication  
✅ **AI Chat Interface** - Natural conversation flow with preference extraction  
✅ **Movie Recommendations** - Grid-based display with AI-powered suggestions  
✅ **Quick Rating System** - Like/dislike functionality for preference learning  
✅ **Dashboard Interface** - Modern, responsive design with embedded chat  
✅ **Basic Watchlist** - Add/remove movies, mark watched/unwatched, basic sorting  
✅ **Testing Infrastructure** - Comprehensive test suite with high coverage  
✅ **Code Quality** - ESLint, Prettier, Husky pre-commit hooks

### **Final Phase - Search & Discovery Enhancement**

🚧 **Priority Features (Next Implementation)**

#### **Advanced Search & Filtering (SEARCH-01)**

**Description**: Comprehensive movie search and filtering system
**Requirements**:

- **Global movie search** by title, director, actor, or keyword
- **Genre-based filtering** with multi-select options
- **Year range filtering** (e.g., 1990-2000, 2010-2020)
- **Rating-based filtering** (e.g., 8.0+ IMDb rating)
- **Combined filters** that work together
- **Search history** and saved filter presets
- **Quick filter buttons** for popular categories

**Implementation Details**:

```typescript
// Search API endpoint
POST /api/movies/search
{
  query?: string,           // "Inception" or "Christopher Nolan"
  genres?: string[],        // ["Action", "Sci-Fi"]
  yearRange?: [number, number], // [2010, 2020]
  minRating?: number,       // 8.0
  limit?: number           // 20
}

// Filter presets
const QUICK_FILTERS = {
  "Recent Hits": { yearRange: [2020, 2024], minRating: 7.5 },
  "Classic Cinema": { yearRange: [1950, 1990], minRating: 8.0 },
  "Hidden Gems": { minRating: 7.8, maxPopularity: 50000 }
}
```

#### **Enhanced Movie Discovery**

- **Search suggestions** as you type
- **Filter result counts** showing how many movies match each filter
- **Clear all filters** and **save filter preset** options
- **Search within watchlist** functionality

### **Explicitly Removed Features**

❌ **Not Implementing** (Scope Reduction):

- Enhanced movie details (cast/crew, trailers, similar movies)
- Watchlist notes and rating system
- Export functionality
- Mood-based discovery
- Mobile touch gestures optimization
- Social features and sharing
- Progressive Web App features

### **Technical Implementation Plan**

#### **Database Updates Needed**

```sql
-- Add search indexes for performance
CREATE INDEX idx_movies_title_search ON movies USING gin(to_tsvector('english', title));
CREATE INDEX idx_movies_director_search ON movies USING gin(to_tsvector('english', director));
CREATE INDEX idx_movies_actors_search ON movies USING gin(to_tsvector('english', array_to_string(actors, ' ')));
CREATE INDEX idx_movies_genre_gin ON movies USING gin(genre);
CREATE INDEX idx_movies_year_rating ON movies(year, imdb_rating);
```

#### **API Endpoints to Implement**

1. `GET /api/movies/search` - Advanced search with filters
2. `GET /api/movies/genres` - Available genres list
3. `GET /api/movies/filters/stats` - Filter statistics (counts)
4. `POST /api/user/search-history` - Save search history
5. `GET /api/user/filter-presets` - User's saved filter presets

#### **Frontend Components to Build**

1. `SearchInterface` - Main search input with autocomplete
2. `FilterPanel` - Advanced filtering sidebar
3. `FilterChips` - Active filter display with remove buttons
4. `SearchResults` - Paginated search results grid
5. `QuickFilters` - Preset filter buttons

### **Success Criteria**

The app will be considered **feature-complete** when:

- ✅ Users can search any movie by title/director/actor instantly
- ✅ Multiple filters can be applied simultaneously
- ✅ Search results load in < 1 second
- ✅ Filter combinations show accurate result counts
- ✅ Search within personal watchlist works seamlessly

### **Final Architecture**
