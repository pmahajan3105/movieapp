// Centralized Jest mocks for CineAI tests
// -------------------------------------------------
// Importing this file sets up global mocks for Supabase, Next.js, Lucide icons
// and common browser APIs so individual test files don't need custom mocks.

/* eslint-disable @typescript-eslint/no-explicit-any */

//---------------------------------------------
// Mock React Query
//---------------------------------------------
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: null, error: null, isLoading: false })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

//---------------------------------------------
// Helper: create a minimal Supabase client mock
//---------------------------------------------
export const createMockSupabaseClient = () => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid' } }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => builder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}

//---------------------------------------------
// Mock Next.js navigation + server utilities
//---------------------------------------------
const mockRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}))

jest.mock('next/server', () => {
  class MockNextResponse {
    private _data: any
    status: number

    constructor(data: any, status = 200) {
      this._data = data
      this.status = status
    }

    get ok() {
      return this.status >= 200 && this.status < 300
    }

    async json() {
      return this._data
    }

    async text() {
      return JSON.stringify(this._data)
    }
  }

  return {
    NextRequest: jest.fn(),
    NextResponse: {
      json: (data: any, init?: { status?: number }) => new MockNextResponse(data, init?.status),
    },
  }
})

//---------------------------------------------
// Supabase packages
//---------------------------------------------
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => createMockSupabaseClient()),
  createServerClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: () => createMockSupabaseClient(),
  createClientComponentClient: () => createMockSupabaseClient(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}))

//---------------------------------------------
// Mock Lucide React icons
//---------------------------------------------
jest.mock('lucide-react', () => {
  const MockIcon = () => null
  return new Proxy({}, { get: () => MockIcon })
})

//---------------------------------------------
// Browser API shims (jsdom lacks these)
//---------------------------------------------
;(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Safely set up window.matchMedia only if window exists (JSDOM environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

//---------------------------------------------
// Utility exports for tests
//---------------------------------------------
export { mockRouter, mockSearchParams }

//---------------------------------------------
// Mock environment helpers (isProduction, isDevelopment)
//---------------------------------------------
jest.mock('@/lib/env', () => ({
  isProduction: () => false,
  isDevelopment: () => true,
}))

//---------------------------------------------
// Polyfill NextResponse.json() for route unit tests
//---------------------------------------------
// next/server exports NextResponse which extends Response but route tests treat returned instance
// like fetch Response and call .json(). Add a shim when running in Jest.
// import { NextResponse } from 'next/server'
// if (typeof (NextResponse as any).prototype.json !== 'function') {
//   ;(NextResponse as any).prototype.json = async function () {
//     // Work with internal body or fallback to text()
//     // body is a ReadableStream in web Response; easiest: use this.text()
//     const text = await (this as Response).text()
//     try {
//       return JSON.parse(text || '{}')
//     } catch {
//       return {}
//     }
//   }
// }
