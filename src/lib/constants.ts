// Application Constants
export const API_ENDPOINTS = {
  MOVIES: '/api/movies',
  WATCHLIST: '/api/watchlist',
  PREFERENCES: '/api/preferences',
  USER_PROFILE: '/api/user/profile',
  AI_RECOMMENDATIONS: '/api/ai/recommendations',
  AI_CHAT: '/api/ai/chat',
  AUTH_OTP: '/api/auth/request-otp',
  AUTH_VERIFY: '/api/auth/verify-otp',
} as const

export const API_TIMEOUT = 30000 // 30 seconds

export const RATE_LIMITS = {
  AI_REQUESTS: 10, // per minute
  SEARCH_REQUESTS: 60, // per minute
  WATCHLIST_UPDATES: 30, // per minute
} as const

// Movie Configuration
export const MOVIE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'TV Movie',
  'Thriller',
  'War',
  'Western',
] as const

export const RATING_SCALE = {
  min: 1,
  max: 5,
} as const

export const IMAGE_SIZES = {
  poster_small: 'w185',
  poster_medium: 'w342',
  poster_large: 'w500',
  backdrop_small: 'w300',
  backdrop_medium: 'w780',
  backdrop_large: 'w1280',
} as const

// UI Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

export const THEME_SETTINGS = {
  DEFAULT_THEME: 'light',
} as const

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Cache Configuration
export const CACHE_DURATIONS = {
  MOVIES: 300000, // 5 minutes
  USER_PROFILE: 600000, // 10 minutes
  PREFERENCES: 900000, // 15 minutes
  TRENDING: 1800000, // 30 minutes
} as const

export const CACHE_KEYS = {
  TRENDING_MOVIES: 'trending_movies',
  USER_PREFERENCES: 'user_preferences',
  MOVIE_DETAILS: 'movie_details',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please try again.',
  UNAUTHORIZED: 'You must be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
} as const

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  AI_RECOMMENDATIONS: true,
  REAL_TIME_UPDATES: true,
  ADVANCED_FILTERING: true,
  SOCIAL_FEATURES: false,
  BETA_FEATURES: false,
} as const

// Validation Rules
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
} as const

export const LENGTH_LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  REVIEW_MAX: 1000,
  BIO_MAX: 500,
} as const

// External Services
export const EXTERNAL_SERVICES = {
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',
  TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
} as const
