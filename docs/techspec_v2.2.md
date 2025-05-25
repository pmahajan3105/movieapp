# CineAI - Technical Specification v2.2

**Date**: December 2024  
**Status**: Core Complete, Search & Filtering Implementation  
**Stack**: Next.js 15, Supabase, Groq AI, TypeScript  
**Architecture**: Serverless, API-First

## 🎯 **Streamlined Scope Overview**

### **Core Features (Implemented)**

- ✅ Authentication system with email + OTP
- ✅ AI-powered chat interface for preference learning
- ✅ Movie recommendations with grid display
- ✅ Basic watchlist (add/remove, watch status, sorting)
- ✅ Quick rating system (like/dislike)

### **Final Phase: Advanced Search & Filtering**

- 🚧 Global movie search by title/director/actor
- 🚧 Multi-filter system (genre, year, rating)
- 🚧 Search within watchlist
- 🚧 Filter presets and search history

### **Explicitly Excluded Features**

- ❌ Enhanced movie details (cast/crew, trailers)
- ❌ Watchlist notes and ratings
- ❌ Mood-based discovery
- ❌ Social features and sharing
- ❌ Mobile optimization focus
- ❌ Export functionality

---

## 📊 **Updated Database Schema**

### **Enhanced Movies Table for Search**

```sql
-- Enhanced movies table with search optimization
ALTER TABLE movies ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create search indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_title_search
  ON movies USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_movies_director_search
  ON movies USING gin(to_tsvector('english', director));

CREATE INDEX IF NOT EXISTS idx_movies_actors_search
  ON movies USING gin(to_tsvector('english', array_to_string(actors, ' ')));

CREATE INDEX IF NOT EXISTS idx_movies_genre_gin
  ON movies USING gin(genre);

CREATE INDEX IF NOT EXISTS idx_movies_year_rating
  ON movies(year DESC, imdb_rating DESC);

CREATE INDEX IF NOT EXISTS idx_movies_combined_search
  ON movies USING gin((
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', coalesce(director, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(actors, ' ')), 'C')
  ));

-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION update_movies_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', NEW.title), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.director, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.actors, ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_movies_search_vector
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_movies_search_vector();
```

### **New Search History Table**

```sql
-- User search history for autocomplete and analytics
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_query ON search_history(query);
CREATE INDEX idx_search_history_searched_at ON search_history(searched_at DESC);

-- RLS for search history
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own search history" ON search_history
  FOR ALL USING (auth.uid() = user_id);
```

### **Filter Presets Table**

```sql
-- User's saved filter presets
CREATE TABLE filter_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_filter_presets_user_id ON filter_presets(user_id);

-- RLS for filter presets
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own filter presets" ON filter_presets
  FOR ALL USING (auth.uid() = user_id);
```

---

## 🔌 **New API Endpoints**

### **Search & Discovery Endpoints**

#### **GET /api/movies/search**

Advanced movie search with filtering capabilities

```typescript
interface SearchRequest {
  query?: string // "Inception" or "Christopher Nolan"
  genres?: string[] // ["Action", "Sci-Fi"]
  yearRange?: [number, number] // [2010, 2020]
  minRating?: number // 7.5
  maxRating?: number // 9.0
  directors?: string[] // ["Christopher Nolan"]
  actors?: string[] // ["Leonardo DiCaprio"]
  limit?: number // 20 (default)
  offset?: number // 0 (default)
  sortBy?: 'relevance' | 'rating' | 'year' | 'title'
  sortOrder?: 'asc' | 'desc'
}

interface SearchResponse {
  success: boolean
  data: {
    movies: Movie[]
    totalCount: number
    facets: {
      genres: { name: string; count: number }[]
      years: { year: number; count: number }[]
      directors: { name: string; count: number }[]
      ratingRanges: { range: string; count: number }[]
    }
    searchMeta: {
      query: string
      appliedFilters: Record<string, any>
      resultCount: number
      executionTime: number
    }
  }
  error?: string
}
```

#### **GET /api/movies/genres**

Get all available genres with movie counts

```typescript
interface GenresResponse {
  success: boolean
  data: {
    name: string
    count: number
  }[]
}
```

#### **GET /api/movies/autocomplete**

Search suggestions as user types

```typescript
interface AutocompleteRequest {
  query: string
  limit?: number // 10 (default)
}

interface AutocompleteResponse {
  success: boolean
  data: {
    movies: { id: string; title: string; year: number }[]
    directors: string[]
    actors: string[]
  }
}
```

#### **POST /api/search/history**

Save user search for history and analytics

```typescript
interface SaveSearchRequest {
  query: string
  filters: Record<string, any>
  resultsCount: number
}
```

#### **GET /api/search/history**

Get user's recent searches

```typescript
interface SearchHistoryResponse {
  success: boolean
  data: {
    id: string
    query: string
    filters: Record<string, any>
    resultsCount: number
    searchedAt: string
  }[]
}
```

#### **POST /api/filters/presets**

Save filter preset

```typescript
interface SavePresetRequest {
  name: string
  filters: Record<string, any>
  isDefault?: boolean
}
```

#### **GET /api/filters/presets**

Get user's saved filter presets

```typescript
interface FilterPresetsResponse {
  success: boolean
  data: {
    id: string
    name: string
    filters: Record<string, any>
    isDefault: boolean
    createdAt: string
  }[]
}
```

### **Enhanced Watchlist Search**

#### **GET /api/watchlist/search**

Search within user's watchlist

```typescript
interface WatchlistSearchRequest {
  query?: string
  watched?: boolean
  genres?: string[]
  yearRange?: [number, number]
  sortBy?: 'added_at' | 'title' | 'year'
  sortOrder?: 'asc' | 'desc'
}
```

---

## 🎨 **Frontend Components Architecture**

### **Search Interface Components**

#### **1. SearchInterface**

```typescript
// Main search component with autocomplete
interface SearchInterfaceProps {
  onSearch: (query: string, filters: SearchFilters) => void
  initialQuery?: string
  placeholder?: string
  showAutocomplete?: boolean
}

// Features:
// - Real-time autocomplete suggestions
// - Search history dropdown
// - Voice search (optional)
// - Clear search button
```

#### **2. FilterPanel**

```typescript
// Advanced filtering sidebar
interface FilterPanelProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  facets: SearchFacets
  isLoading?: boolean
}

// Features:
// - Genre multi-select with counts
// - Year range slider
// - Rating range slider
// - Director/Actor autocomplete
// - Clear all filters
// - Save as preset
```

#### **3. FilterChips**

```typescript
// Active filters display
interface FilterChipsProps {
  filters: SearchFilters
  onRemoveFilter: (filterKey: string, value?: any) => void
  onClearAll: () => void
}

// Features:
// - Chip for each active filter
// - Individual remove buttons
// - Clear all button
// - Filter count display
```

#### **4. SearchResults**

```typescript
// Paginated search results grid
interface SearchResultsProps {
  movies: Movie[]
  totalCount: number
  currentPage: number
  onPageChange: (page: number) => void
  onMovieClick: (movie: Movie) => void
  onRate: (movieId: string, rating: boolean) => void
  loading?: boolean
}

// Features:
// - Infinite scroll or pagination
// - Grid/list view toggle
// - Sort options
// - Results count display
// - Loading skeletons
```

#### **5. QuickFilters**

```typescript
// Preset filter buttons
interface QuickFiltersProps {
  presets: FilterPreset[]
  onPresetClick: (preset: FilterPreset) => void
  onCreatePreset: () => void
}

// Built-in presets:
const BUILT_IN_PRESETS = {
  'Recent Hits': { yearRange: [2020, 2024], minRating: 7.5 },
  'Classic Cinema': { yearRange: [1950, 1990], minRating: 8.0 },
  'Hidden Gems': { minRating: 7.8, maxPopularity: 50000 },
  'Action Blockbusters': { genres: ['Action'], minRating: 7.0 },
  'Indie Darlings': { genres: ['Drama', 'Independent'], minRating: 7.5 },
}
```

---

## ⚡ **Performance Optimizations**

### **Database Performance**

```sql
-- Materialized view for popular searches
CREATE MATERIALIZED VIEW popular_movies AS
SELECT m.*, COUNT(s.id) as like_count
FROM movies m
LEFT JOIN swipes s ON m.id = s.movie_id AND s.action = 'like'
GROUP BY m.id
ORDER BY like_count DESC, m.imdb_rating DESC;

CREATE UNIQUE INDEX idx_popular_movies_id ON popular_movies(id);
REFRESH MATERIALIZED VIEW popular_movies;

-- Function to refresh periodically
CREATE OR REPLACE FUNCTION refresh_popular_movies()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW popular_movies;
END;
$$ LANGUAGE plpgsql;
```

### **Search Query Optimization**

```typescript
// Optimized search query with proper indexing
const searchMovies = async (params: SearchRequest) => {
  const query = supabase.from('movies').select(`
      id, title, year, genre, plot, poster_url, 
      imdb_rating, runtime, director, actors
    `)

  // Full-text search
  if (params.query) {
    query.textSearch('search_vector', params.query, {
      type: 'websearch',
      config: 'english',
    })
  }

  // Apply filters efficiently
  if (params.genres?.length) {
    query.overlaps('genre', params.genres)
  }

  if (params.yearRange) {
    query.gte('year', params.yearRange[0]).lte('year', params.yearRange[1])
  }

  if (params.minRating) {
    query.gte('imdb_rating', params.minRating)
  }

  // Efficient pagination
  const { from, to } = getPaginationRange(params.offset, params.limit)
  query.range(from, to)

  return query
}
```

### **Frontend Performance**

```typescript
// Debounced search with caching
const useSearchMovies = () => {
  const [searchCache, setSearchCache] = useState(new Map())

  const debouncedSearch = useMemo(
    () =>
      debounce(async (params: SearchRequest) => {
        const cacheKey = JSON.stringify(params)

        if (searchCache.has(cacheKey)) {
          return searchCache.get(cacheKey)
        }

        const result = await searchAPI(params)

        setSearchCache(prev => new Map(prev).set(cacheKey, result))
        return result
      }, 300),
    [searchCache]
  )

  return debouncedSearch
}
```

---

## 🧪 **Testing Strategy**

### **Search API Tests**

```typescript
describe('Search API', () => {
  test('should search movies by title', async () => {
    const response = await request(app)
      .get('/api/movies/search')
      .query({ query: 'Inception' })
      .expect(200)

    expect(response.body.data.movies).toHaveLength(1)
    expect(response.body.data.movies[0].title).toBe('Inception')
  })

  test('should filter by multiple genres', async () => {
    const response = await request(app)
      .get('/api/movies/search')
      .query({ genres: 'Action,Sci-Fi' })
      .expect(200)

    response.body.data.movies.forEach(movie => {
      expect(movie.genre).toEqual(expect.arrayContaining(['Action', 'Sci-Fi']))
    })
  })

  test('should respect pagination limits', async () => {
    const response = await request(app)
      .get('/api/movies/search')
      .query({ limit: 5, offset: 0 })
      .expect(200)

    expect(response.body.data.movies).toHaveLength(5)
  })
})
```

### **Search Component Tests**

```typescript
describe('SearchInterface', () => {
  test('should show autocomplete suggestions', async () => {
    render(<SearchInterface onSearch={mockSearch} />)

    const input = screen.getByPlaceholderText(/search movies/i)
    await user.type(input, 'Inc')

    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
  })

  test('should apply filters correctly', async () => {
    render(<SearchInterface onSearch={mockSearch} />)

    // Open filter panel
    await user.click(screen.getByText(/filters/i))

    // Select genre
    await user.click(screen.getByText('Action'))

    // Apply filters
    await user.click(screen.getByText(/apply/i))

    expect(mockSearch).toHaveBeenCalledWith('', {
      genres: ['Action']
    })
  })
})
```

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Database & API Foundation (Week 1)**

1. ✅ Add search indexes to movies table
2. ✅ Create search_history and filter_presets tables
3. ✅ Implement basic search API endpoint
4. ✅ Add autocomplete API endpoint

### **Phase 2: Core Search Interface (Week 2)**

1. 🚧 Build SearchInterface component with autocomplete
2. 🚧 Create FilterPanel with genre and year filtering
3. 🚧 Implement SearchResults grid with pagination
4. 🚧 Add FilterChips for active filter display

### **Phase 3: Advanced Features (Week 3)**

1. 📋 Add search within watchlist functionality
2. 📋 Implement filter presets and quick filters
3. 📋 Add search history and suggestions
4. 📋 Performance optimization and caching

### **Phase 4: Polish & Testing (Week 4)**

1. 📋 Comprehensive testing coverage
2. 📋 Performance monitoring and optimization
3. 📋 Error handling and edge cases
4. 📋 Documentation and deployment

---

## 📊 **Success Metrics**

### **Performance Targets**

- Search response time: < 500ms
- Autocomplete response: < 200ms
- Filter application: < 300ms
- Page load with results: < 1.5s

### **User Experience Goals**

- Search relevance: 90%+ user satisfaction
- Filter accuracy: 100% correct results
- Autocomplete usefulness: 80%+ click-through rate
- Overall search success: 85%+ find target movie

### **Technical Metrics**

- API uptime: 99.9%
- Database query efficiency: < 100ms avg
- Cache hit rate: > 70%
- Error rate: < 1%

---

This updated technical specification focuses exclusively on delivering robust search and filtering capabilities while maintaining the clean, efficient architecture you've built. The scope is realistic and achievable while providing significant value to users! 🎯
