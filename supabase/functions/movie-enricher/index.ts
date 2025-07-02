/**
 * Supabase Edge Function: movie-enricher
 *
 * Cron: nightly (set in supabase.toml or dashboard) – fetches missing storyline embeddings, review sentiment, social buzz.
 *
 * Environment vars required:
 *  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (injected automatically)
 *  - TMDB_API_KEY
 *  - PUSHSHIFT_BASE_URL (default https://api.pushshift.io)
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

// deno-lint-ignore-file

// Ambient declarations for Deno context (silences TS errors in Node tooling)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

// @ts-ignore Deno URL import
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4'

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
const PUSHSHIFT_BASE_URL = Deno.env.get('PUSHSHIFT_BASE_URL') || 'https://api.pushshift.io'

if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY env var required')

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key)
}

async function fetchMovieFromTMDBWithCache(tmdbId: number, supabase: any) {
  // try cache first (24h TTL)
  const { data: cached } = await supabase
    .from('tmdb_cache')
    .select('data, fetched_at')
    .eq('tmdb_id', tmdbId)
    .single()

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < 86_400_000) {
    return cached.data
  }

  const base = 'https://api.themoviedb.org/3'
  const params = `?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=keywords,reviews,credits`
  const res = await fetch(`${base}/movie/${tmdbId}${params}`)
  const details = await res.json()
  // TMDB returns embedded objects when using append_to_response
  const keywords = details.keywords?.keywords || details.keywords?.results || []
  const reviews = (details.reviews?.results || []).slice(0, 5)

  const data = { details, keywords, reviews }

  // upsert cache
  await supabase
    .from('tmdb_cache')
    .upsert({ tmdb_id: tmdbId, data, fetched_at: new Date().toISOString() })

  return data
}

function buildStorylineText(data: any) {
  const plot = data.details?.overview || ''
  const keywordNames = (data.keywords || []).map((k: any) => k.name).join(', ')
  const reviewSnippets = (data.reviews || []).map((r: any) => r.content).join('\n')
  return `${plot}\nKeywords: ${keywordNames}\nReviews: ${reviewSnippets}`.trim()
}

function simpleSentiment(reviews: any[]): { critics: number; audience: number } {
  // naive placeholder: positive if contains "good", negative if "bad"
  const critic = reviews.filter(r => r.author_details?.rating).map(r => r.author_details.rating)
  const criticsScore = critic.length > 0 ? critic.reduce((a, b) => a + b, 0) / (10 * critic.length) : 0.5
  const text = reviews.map(r => r.content.toLowerCase()).join(' ')
  const positives = (text.match(/good|great|amazing|excellent/g) || []).length
  const negatives = (text.match(/bad|poor|terrible|awful/g) || []).length
  const audienceScore = (positives + 1) / (positives + negatives + 2)
  return { critics: Number(criticsScore.toFixed(2)), audience: Number(audienceScore.toFixed(2)) }
}

async function fetchSocialBuzz(title: string): Promise<number> {
  const url = `${PUSHSHIFT_BASE_URL}/reddit/search/submission/?q=${encodeURIComponent(title)}&subreddit=movies&after=30d&size=0&metadata=true`
  try {
    const resp = await fetch(url)
    const json = await resp.json()
    const count = json.metadata?.total_results || 0
    return Math.min(1, count / 50)
  } catch {
    return 0
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  // For now, call embedding-service RPC (internal) or return zero vector
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('generate_embedding', { input_text: text }) // hypothetical RPC
    if (error) throw error
    return data as number[]
  } catch {
    return new Array(1536).fill(0)
  }
}

serve(async () => {
  const supabase = getSupabaseClient()

  // 1. Fetch movies lacking storyline_embedding
  const { data: movies } = await supabase
    .from('movies')
    .select('id, tmdb_id, title')
    .eq('enrichment_status', 'pending')
    .limit(20) // safety limit per run

  for (const movie of movies ?? []) {
    try {
      const tmdbId = movie.tmdb_id
      if (!tmdbId) continue
      const tmdbData = await fetchMovieFromTMDBWithCache(tmdbId, supabase)
      const contentText = buildStorylineText(tmdbData)
      const embedding = await generateEmbedding(contentText)
      const sentiment = simpleSentiment(tmdbData.reviews)
      const buzz = await fetchSocialBuzz(movie.title)

      await supabase
        .from('movies')
        .update({
          storyline_embedding: embedding,
          review_sentiment: sentiment,
          social_buzz_score: buzz,
          enrichment_status: 'ok',
        })
        .eq('id', movie.id)

      console.log(`Enriched movie ${movie.id}`)
    } catch (err) {
      console.error('Enrichment failed for', movie.id, err)
      await supabase.from('movies').update({ enrichment_status: 'failed' }).eq('id', movie.id)
      await supabase.from('movie_enrichment_retry').upsert({
        movie_id: movie.id,
        attempts: supabase.literal('attempts + 1'),
        last_attempt_at: new Date().toISOString(),
      })
    }
  }

  return new Response('ok')
}) 