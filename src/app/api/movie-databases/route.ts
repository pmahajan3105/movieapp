import { NextRequest, NextResponse } from 'next/server'
import { 
  databaseSelector, 
  getDatabaseForTask, 
  getDefaultDatabase, 
  AVAILABLE_MOVIE_DATABASES,
  checkDatabasesHealth,
  type MovieProvider,
  type DatabaseCapability,
  type MovieDatabaseConfig
} from '@/lib/movie-databases/config'

// GET /api/movie-databases - List available databases and current configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const capability = searchParams.get('capability')

    let databases = Object.values(AVAILABLE_MOVIE_DATABASES)

    // Filter by provider if specified
    if (provider) {
      databases = databaseSelector.getDatabasesByProvider(provider as MovieProvider)
    }

    // Filter by capability if specified
    if (capability) {
      databases = databases.filter(database => 
        database.capabilities.includes(capability as DatabaseCapability)
      )
    }

    // Get current task assignments
    const taskAssignments = {
      search: getDatabaseForTask('search'),
      trending: getDatabaseForTask('trending'),
      recommendations: getDatabaseForTask('recommendations'),
      detailed_info: getDatabaseForTask('detailed_info'),
      fallback: getDatabaseForTask('fallback'),
      default: getDefaultDatabase(),
    }

    // Check API key configuration
    const apiKeyStatus = databaseSelector.checkApiKeyConfiguration()

    // Check database health
    const healthStatus = await checkDatabasesHealth()

    return NextResponse.json({
      success: true,
      availableDatabases: databases,
      currentAssignments: taskAssignments,
      apiKeyStatus,
      healthStatus,
      summary: {
        totalDatabases: databases.length,
        providers: [...new Set(databases.map(db => db.provider))],
        recommendedDatabases: databases.filter(db => db.recommended),
        freeDatabases: databases.filter(db => db.capabilities.includes('free-tier')),
        realTimeDatabases: databases.filter(db => db.capabilities.includes('real-time')),
      }
    })

  } catch (error) {
    console.error('❌ Movie Databases API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch movie databases' },
      { status: 500 }
    )
  }
}

// POST /api/movie-databases/test - Test database configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { databaseId, testType = 'basic' } = body

    if (!databaseId) {
      return NextResponse.json(
        { success: false, error: 'Database ID is required' },
        { status: 400 }
      )
    }

    const database = AVAILABLE_MOVIE_DATABASES[databaseId]
    if (!database) {
      return NextResponse.json(
        { success: false, error: `Database ${databaseId} not found` },
        { status: 404 }
      )
    }

    // Test database connection and functionality
    const testResults = await testDatabaseConnection(database, testType)

    return NextResponse.json({
      success: true,
      database: {
        id: database.id,
        name: database.name,
        provider: database.provider,
        description: database.description,
        capabilities: database.capabilities,
        dataQuality: database.dataQuality,
        requiresApiKey: database.requiresApiKey
      },
      test: testResults
    })

  } catch (error) {
    console.error('❌ Database test error:', error)
    return NextResponse.json(
      { success: false, error: 'Database test failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Helper function to test database connections
async function testDatabaseConnection(database: MovieDatabaseConfig, testType: string) {
  const startTime = Date.now()
  
  try {
    let testResult = {
      connected: false,
      responseTime: 0,
      apiKeyValid: false,
      supportsSearch: false,
      supportsTrending: false,
      dataQuality: database.dataQuality,
      estimatedCostPer1k: database.costPer1kRequests
    }

    switch (database.provider) {
      case 'tmdb':
        testResult = await testTMDBConnection(database, testType)
        break
      
      case 'local':
        testResult = await testLocalConnection(database, testType)
        break
      
      default:
        testResult = {
          connected: false,
          responseTime: 0,
          apiKeyValid: false,
          supportsSearch: false,
          supportsTrending: false,
          dataQuality: database.dataQuality,
          estimatedCostPer1k: 0
        }
    }

    testResult.responseTime = Date.now() - startTime
    return testResult

  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      apiKeyValid: false,
      supportsSearch: false,
      supportsTrending: false
    }
  }
}

async function testTMDBConnection(database: MovieDatabaseConfig, testType: string) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    throw new Error('TMDB API key not configured')
  }

  // Test basic connection with configuration endpoint
  const configResponse = await fetch(`${database.apiUrl}/configuration?api_key=${apiKey}`)
  
  if (!configResponse.ok) {
    throw new Error(`TMDB API error: ${configResponse.status}`)
  }

  const result = {
    connected: true,
    responseTime: 0,
    apiKeyValid: true,
    supportsSearch: true,
    supportsTrending: true,
    dataQuality: database.dataQuality,
    estimatedCostPer1k: 0
  }

  // Extended test - try searching for a popular movie
  if (testType === 'extended') {
    const searchResponse = await fetch(`${database.apiUrl}/search/movie?api_key=${apiKey}&query=inception`)
    const searchData = await searchResponse.json()
    
    result.supportsSearch = searchResponse.ok && searchData.results?.length > 0
    
    // Test trending endpoint
    const trendingResponse = await fetch(`${database.apiUrl}/trending/movie/week?api_key=${apiKey}`)
    const trendingData = await trendingResponse.json()
    
    result.supportsTrending = trendingResponse.ok && trendingData.results?.length > 0
  }

  return result
}

async function testLocalConnection(database: MovieDatabaseConfig, testType: string) {
  // Local database should always be available
  const result = {
    connected: true,
    responseTime: 0,
    apiKeyValid: true, // No API key needed
    supportsSearch: true,
    supportsTrending: false, // No real trending in local DB
    dataQuality: database.dataQuality,
    estimatedCostPer1k: 0
  }

  // Extended test - check if we can query the database
  if (testType === 'extended') {
    try {
      const { createServerClient } = await import('@/lib/supabase/client')
      const supabase = await createServerClient()
      
      const { data, error } = await supabase
        .from('movies')
        .select('id, title')
        .limit(1)
        
      result.supportsSearch = !error && !!data && data.length > 0
    } catch {
      result.supportsSearch = false
      result.connected = false
    }
  }

  return result
} 