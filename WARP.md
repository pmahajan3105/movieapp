# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: CineAI (Next.js App Router, TypeScript, Supabase, Tailwind/DaisyUI, Anthropic)
Preferred deployment: Vercel

What matters most here
- Follow existing patterns. Keep changes minimal and focused (see CLAUDE.md and .cursor/rules/customrules.mdc).
- UI styling uses Tailwind v4 + DaisyUI 5. Prefer component classes over custom CSS. Avoid inline styles.
- API routes are thin; core logic lives in src/lib (services, ai, repositories). Reuse those layers.
- Path alias @ maps to ./src (see tsconfig.json). Import from '@/...' instead of relative chains.

Common commands
- Install and run
  - npm ci
  - cp env.example .env.local
  - npx supabase start         # optional: run local Supabase
  - npm run dev                # dev server (Turbopack enabled)
- Build and serve
  - npm run build
  - npm run start              # serve production build
  - ANALYZE=true npm run build # bundle analysis
- Lint, format, types
  - npm run lint
  - npm run lint:fix
  - npm run format
  - npm run format:check
  - npm run type-check
- Tests (Jest, jsdom)
  - npm test                   # all tests
  - npm run test:watch
  - npm run test:api           # API tests
  - npm run test:components    # component tests
  - npm run test:integration   # integration tests
  - npm run test:coverage      # HTML coverage report
  - npm run coverage:open      # open coverage report
  - Run a single test file: npm test -- src/__tests__/components/movies-page.test.tsx
  - Run tests by name: npm test -- -t "<substring>"
- Database/Supabase
  - npm run db:migrate         # supabase db push
  - npm run db:reset           # destructive reset
  - npm run db:seed            # seed helper (scripts/)
  - npm run generate:types     # generate types to src/types/supabase-generated.ts
- Health and security
  - npm run health:check       # hits /api/healthz
  - npm run security:check     # audit + outdated
- Deploy (Vercel)
  - npm run deploy:staging
  - npm run deploy:production  # vercel --prod

High‑level architecture (big picture)
- App Router (src/app)
  - UI routes: dashboard/, movies/, onboarding/, search/, auth/...
  - API routes under app/api/... implement thin HTTP controllers that:
    1) validate/coerce input
    2) authenticate via Supabase
    3) delegate to lib/services and lib/ai
    4) return uniform JSON with error handling (see lib/error-handling)
- Services and repositories (src/lib, src/repositories)
  - src/lib/services/* encapsulate domain operations (movie-service, preference-service, recommendation-service, watchlist-service, session-service, etc.)
  - src/repositories/* provide DB access patterns (MovieRepository, WatchlistRepository)
  - src/lib/supabase/* centralizes clients for server, route, browser and typed helpers
  - Error handling patterns live in src/lib/error-handling, logger in src/lib/logger.ts
- AI layer (src/lib/ai)
  - Orchestrators, engines and helpers compose recommendation flows:
    - ai-recommendation-engine, personalized-recommender, user-personalization-engine
    - smart/semantic/thematic engines, progressive-analysis, reliability/performance managers
    - conversation memory, enhanced context/synthesis services
  - API routes under app/api/ai/* and recommendations/* call into this layer
- UI and state
  - React components in src/components (feature folders: ai/, dashboard/, movies/, chat/, ui/, etc.)
  - Providers in src/components/providers (QueryProvider, HydratedAuthProvider, ClientProviders)
  - State/data fetching with @tanstack/react-query; contexts in src/contexts (AuthContext, ThemeContext, etc.)
- Types and utilities
  - src/types/* includes API, AI, Supabase (generated), testing types
  - Shared utilities in src/lib/utils and src/lib/constants
- Middleware and security
  - next.config.ts sets strict security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) and remote image allowlist (TMDB, Unsplash, Amazon images)
  - API rate limiting pattern in src/lib/api/middleware/rate-limiter.ts
  - RLS enforced in Supabase; clients use anon vs service role appropriately

Testing layout and behavior
- Jest configured via jest.config.js (jsdom). Global setup: jest.setup.js loads @testing-library/jest-dom and fetch polyfill.
- Test env vars are set in jest.env.js so tests don’t require local secrets.
- Tests live under src/__tests__ with domain folders (api/, components/, hooks/, integration/, lib/...).
- To focus a failing test quickly, prefer running a single file or using -t.

Configuration highlights
- Path alias: '@/*' -> './src/*' (tsconfig.json)
- TypeScript strict mode is enabled with additional safety flags (noUncheckedIndexedAccess, etc.)
- ESLint is permissive during development; warnings won’t block builds (eslint.config.mjs)
- next.config.ts
  - Security headers and CSP
  - Optimized Turbopack settings and svg transform
  - Remote image patterns for TMDB/others
- vercel.json
  - Route passthrough for /api
  - Function timeout for app/api/**/*.ts (maxDuration 30s)
  - Region pinned to iad1

Supabase and data
- Local development: npx supabase start (docker required). Migrations in supabase/migrations.
- Edge functions under supabase/functions/* (e.g., movie-enricher). A GitHub workflow auto-deploys movie-enricher on changes.
- Generate/types: npm run generate:types to sync DB types into src/types.

API documentation
- REST endpoints are documented in docs/API_DOCUMENTATION.md and the OpenAPI spec at docs/openapi.yaml.
- Most consumer routes live under app/api/ with subdomains: auth/, movies/, recommendations/, ai/, preferences/, watchlist/, ratings/, user/.

CI/CD
- .github/workflows/ci.yml
  - Node 20, npm ci, lint/type-check as non-blocking, unit tests (in-band) on pushes/PRs.
- .github/workflows/deploy-edge.yml
  - Deploys Supabase edge function movie-enricher on changes; requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.
- .github/workflows/e2e-tests.yml
  - Manual workflow that installs Playwright and runs browser tests (chromium) against a build.

Environment
- Copy env.example to .env.local and fill:
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (server-only uses)
  - TMDB_API_KEY, ANTHROPIC_API_KEY
  - NEXT_PUBLIC_SITE_URL (http://localhost:3000 for dev)
  - Optional AI model names (defaults are sensible)

Rules from CLAUDE.md and .cursor/rules (applied here)
- Keep changes minimal; avoid over-engineering and large abstractions.
- Split components if they grow too large or mix concerns.
- Test complex business logic (hooks, API) over simple presentational pieces.
- Context first: understand the system, follow existing patterns, respect env/config.
- Styling: Tailwind/DaisyUI components first; avoid custom CSS unless necessary.

Deployment (Vercel preferred)
- One-time setup: npx vercel login && npx vercel link
- Staging deploy: npm run deploy:staging
- Production deploy: npm run deploy:production
- Ensure required env vars are configured in Vercel Project Settings.
