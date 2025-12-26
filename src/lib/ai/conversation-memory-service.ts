import { anthropic } from '@/lib/anthropic/config'
import { logger } from '../logger'

export class ConversationMemoryService {
  constructor(private enableTTS: boolean = false) {}

  /**
   * Generate a conversational AI response based on the user input.
   *
   * 1. Builds a compact prompt via `buildPrompt`.
   * 2. Calls Anthropic Claude with safe defaults.
   * 3. Returns the trimmed text or a fallback message on error.
   *
   * @param userInput - Raw text spoken/typed by the user.
   * @returns AI response (plain text, ≤ 3 sentences).
   */
  async generateAIResponse(userInput: string): Promise<string> {
    try {
      const prompt = this.buildPrompt(userInput)

      const resp = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 400,
      })

      // resp.content is Anthropic content blocks; treat as any to access .text safely
      return (resp as any).content?.[0]?.text || 'Sorry, I had trouble coming up with an answer.'
    } catch (err) {
      logger.error('Claude generation failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return 'Sorry, I am having some trouble right now.'
    }
  }

  /**
   * Text-to-speech is currently disabled.
   * This method is kept for compatibility but always returns null.
   */
  async maybeTextToSpeech(text: string): Promise<string | null> {
    return null
  }

  private buildPrompt(userInput: string): string {
    return `You are CineAI, a friendly movie expert. Respond conversationally (under 3 sentences) to the user who said: "${userInput}". Always end with an engaging question about their tastes.`
  }

  /**
   * Extract structured "memories" (user preferences) from a single exchange and persist them.
   *
   * Flow:
   * 1. Ask Claude to parse the exchange and emit JSON `{ extracted_memories: [...] }`.
   * 2. For each memory: upsert into `conversational_memory` table, incrementing `times_reinforced`.
   * 3. Returns the list of extracted memories so the caller can act on them (e.g. UI badges).
   *
   * @param userId       - Auth.user.id (foreign-key to conversation tables).
   * @param sessionId    - Conversation session UUID.
   * @param userTranscript - User's actual message.
   * @param aiResponse     - AI's response text.
   * @returns Array of memories that were stored.
   */
  async extractAndStoreMemories(
    userId: string,
    sessionId: string,
    userTranscript: string,
    aiResponse: string
  ): Promise<any[]> {
    try {
      const prompt = this.buildMemoryPrompt(userTranscript, aiResponse)

      const resp = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      })

      let extracted: any[] = []
      try {
        extracted = JSON.parse((resp as any).content?.[0]?.text || '{}').extracted_memories || []
      } catch {
        logger.warn('Memory extraction JSON parse failed')
      }

      if (extracted.length === 0) return []

      const supabase = await (await import('@/lib/supabase/server-client')).createServerClient()

      for (const mem of extracted) {
        const { memory_type, memory_key, preference_strength, memory_text, confidence_score } = mem
        if (!memory_type || !memory_key) continue

        // check existing
        const { data: existing } = await supabase
          .from('conversational_memory')
          .select('id, times_reinforced')
          .eq('user_id', userId)
          .eq('memory_type', memory_type)
          .eq('memory_key', memory_key)
          .single()

        if (existing) {
          await supabase
            .from('conversational_memory')
            .update({
              preference_strength,
              memory_text,
              confidence_score,
              times_reinforced: (existing.times_reinforced || 1) + 1,
              last_reinforced_at: new Date().toISOString(),
              source_exchange_id: sessionId,
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('conversational_memory').insert({
            user_id: userId,
            memory_type,
            memory_key,
            preference_strength,
            memory_text,
            confidence_score,
            source_conversation_id: sessionId,
            times_reinforced: 1,
          })
        }
      }

      return extracted
    } catch (err) {
      logger.warn('Memory extraction failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return []
    }
  }

  private buildMemoryPrompt(user: string, ai: string): string {
    return `Analyze this conversation exchange and extract any movie preferences.\nUser: "${user}"\nAI: "${ai}"\nReturn JSON with {\"extracted_memories\": [...]}`
  }
} 