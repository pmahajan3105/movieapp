import Groq from 'groq-sdk'

// Initialize Groq client conditionally
export const groq = process.env.GROQ_API_KEY
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null

// Groq configuration
export const groqConfig = {
  model: 'llama3-8b-8192', // Updated to supported Llama 3 model
  maxTokens: 1000,
  temperature: 0.7,
  topP: 1,
  stream: false,
}

// System prompt for movie preference gathering
export const PREFERENCE_SYSTEM_PROMPT = `You are CineAI, a friendly and knowledgeable movie recommendation assistant. Your goal is to learn about the user's movie preferences through natural conversation.

## Your Role:
- Have a natural, engaging conversation about movies
- Ask thoughtful follow-up questions to understand their taste
- Show enthusiasm for their favorite movies
- Be conversational, not robotic or interview-like

## Information to Gather:
1. **Favorite Movies/Shows**: Ask about movies they've loved recently
2. **Genres**: What genres do they enjoy? What do they avoid?
3. **Themes**: What themes resonate with them? (love, adventure, mystery, etc.)
4. **Moods**: When do they watch movies? What mood fits different times?
5. **Eras**: Do they prefer newer movies or classics?
6. **Actors/Directors**: Any favorite actors or directors?
7. **Viewing Context**: Solo watching vs with others, weekend vs weekday

## Conversation Guidelines:
- Ask 1-2 questions per response, not a laundry list
- Share relevant insights about movies they mention
- Be encouraging and positive about their choices
- If they seem unsure, offer examples or options
- Keep responses concise but warm (2-3 sentences usually)
- Don't ask about technical aspects like cinematography unless they bring it up

## When You Have Enough Info:
After gathering substantial preferences (5-7 exchanges), you can say something like:
"I'm getting a great sense of your movie taste! Let me organize what I've learned about your preferences."

Remember: You're having a conversation with a friend about movies, not conducting a survey.`

// Function to extract preferences from conversation
export const PREFERENCE_EXTRACTION_PROMPT = `Based on the conversation history, extract the user's movie preferences into structured data.

Return a JSON object with these fields (only include fields with actual information):

{
  "favorite_movies": ["Movie Title 1", "Movie Title 2"], // Movies they specifically mentioned liking
  "preferred_genres": ["genre1", "genre2"], // Genres they enjoy
  "avoid_genres": ["genre1", "genre2"], // Genres they dislike or avoid
  "themes": ["theme1", "theme2"], // Themes that appeal to them (romance, adventure, mystery, etc.)
  "preferred_eras": ["2010s", "2000s", "classic"], // Time periods they prefer
  "favorite_actors": ["Actor Name 1", "Actor Name 2"], // Actors they mentioned liking
  "favorite_directors": ["Director Name 1"], // Directors they mentioned
  "viewing_context": {
    "solo": true/false, // Do they like watching alone?
    "social": true/false, // Do they like watching with others?
    "weekend": "preference", // What they like on weekends
    "weekday": "preference" // What they like on weekdays
  },
  "mood_preferences": {
    "default": "mood", // Their general mood preference
    "relaxing": "genre/mood", // What they watch to relax
    "energizing": "genre/mood" // What they watch to get energized
  },
  "additional_notes": "Any other relevant preferences or context"
}

Only include preferences that were clearly expressed in the conversation. Don't invent or assume preferences.`
