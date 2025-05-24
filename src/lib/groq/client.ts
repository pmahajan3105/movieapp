import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const GROQ_CONFIG = {
  model: 'gemma-7b-it' as const,
  temperature: 0.7,
  maxTokens: 1000,
  rateLimit: {
    requestsPerMinute: 30,
    tokensPerMinute: 10000,
  },
}

export { groq }
