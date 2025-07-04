import { requireAuth, withError, ok, fail } from '@/lib/api/factory'
import { z } from 'zod'

// GET /api/ratings – get user's ratings with movie details for filtering
export const GET = withError(
  requireAuth(async ({ supabase, user }) => {
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(`
        movie_id, 
        rating, 
        interested, 
        rated_at,
        movies:movie_id (
          title,
          year,
          tmdb_id
        )
      `)
      .eq('user_id', user.id)
      .order('rated_at', { ascending: false })

    if (error) {
      return fail('Failed to fetch ratings', 500)
    }

    // Transform the data to include movie_data for compatibility with QuickRatingWidget
    const ratingsWithMovieData = (ratings || []).map((rating: any) => ({
      movie_id: rating.movie_id,
      rating: rating.rating,
      interested: rating.interested,
      rated_at: rating.rated_at,
      movie_data: rating.movies ? {
        title: rating.movies.title,
        year: rating.movies.year,
        tmdb_id: rating.movies.tmdb_id
      } : null
    }))

    return ok({ 
      ratings: ratingsWithMovieData, 
      count: ratingsWithMovieData.length 
    })
  })
)

// Movie data schema for external movies
const movieDataSchema = z.object({
  title: z.string(),
  year: z.number().optional(),
  genre: z.array(z.string()).optional(),
  director: z.array(z.string()).optional(),
  plot: z.string().optional(),
  poster_url: z.string().optional(),
  rating: z.number().optional(),
  tmdb_id: z.number().optional(),
  imdb_id: z.string().optional(),
})

const ratingSchema = z.object({
  movie_id: z.string().uuid().optional(), // UUID for existing database movies
  movie_data: movieDataSchema.optional(), // Movie data for external movies
  interested: z.boolean().optional(), // like/dislike toggle
  rating: z.number().min(1).max(5).optional(), // 1-5 stars (future)
}).refine(data => data.movie_id || data.movie_data, {
  message: "Either movie_id or movie_data must be provided"
})

// POST /api/ratings – insert/update rating by movie/user
export const POST = withError(
  requireAuth(async ({ request, supabase, user }) => {
    const json = await request.json().catch(() => null)
    const parsed = ratingSchema.safeParse(json)

    if (!parsed.success) {
      return fail(parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400)
    }

    const { movie_id, movie_data, interested, rating } = parsed.data
    let finalMovieId = movie_id

    // If no movie_id provided, find or create the movie in database
    if (!movie_id && movie_data) {
      try {
        // Try to find existing movie by title and year first
        let query = supabase
          .from('movies')
          .select('id')
          .eq('title', movie_data.title)
        
        if (movie_data.year) {
          query = query.eq('year', movie_data.year)
        } else {
          query = query.is('year', null)
        }
        
        const { data: existingMovie } = await query.single()

        if (existingMovie) {
          finalMovieId = existingMovie.id
        } else {
          // Try to find by external IDs
          let foundMovie = null
          if (movie_data.tmdb_id) {
            const { data } = await supabase
              .from('movies')
              .select('id')
              .eq('tmdb_id', movie_data.tmdb_id)
              .single()
            foundMovie = data
          }
          
          if (!foundMovie && movie_data.imdb_id) {
            const { data } = await supabase
              .from('movies')
              .select('id')
              .eq('imdb_id', movie_data.imdb_id)
              .single()
            foundMovie = data
          }

          if (foundMovie) {
            finalMovieId = foundMovie.id
          } else {
            // Create new movie in database
            const { data: newMovie, error: movieError } = await supabase
              .from('movies')
              .insert([{
                title: movie_data.title,
                year: movie_data.year,
                genre: movie_data.genre,
                director: movie_data.director,
                plot: movie_data.plot,
                poster_url: movie_data.poster_url,
                rating: movie_data.rating,
                tmdb_id: movie_data.tmdb_id,
                imdb_id: movie_data.imdb_id,
              }])
              .select('id')
              .single()

            if (movieError) {
              return fail(`Failed to create movie: ${movieError.message}`, 500)
            }

            finalMovieId = newMovie.id
          }
        }
      } catch (error) {
        return fail(`Failed to process movie: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
      }
    }

    if (!finalMovieId) {
      return fail('Could not determine movie ID', 400)
    }

    // Try to update existing rating first, then insert if not found
    let data, error
    
    // Check if rating already exists
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', finalMovieId)
      .single()
    
    if (existingRating) {
      // Update existing rating
      const updateResult = await supabase
        .from('ratings')
        .update({
          interested: interested ?? true,
          rating,
          rated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('movie_id', finalMovieId)
        .select('*')
        .single()
      
      data = updateResult.data
      error = updateResult.error
    } else {
      // Insert new rating
      const insertResult = await supabase
        .from('ratings')
        .insert({
          user_id: user.id,
          movie_id: finalMovieId,
          interested: interested ?? true,
          rating,
          rated_at: new Date().toISOString(),
        })
        .select('*')
        .single()
      
      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      return fail(error.message, 500)
    }

    return ok(data)
  })
)
