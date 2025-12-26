# Repository Guidelines

Quick reference for contributing to CineAI while keeping the Next.js 15 app stable and performant.

## Project Structure & Module Organization
- App Router lives in `src/app` (routes, layouts, error boundaries, global styles). Reusable UI sits in `src/components`; state/data wiring in `contexts`, `hooks`, `repositories`, with shared helpers in `lib`/`utils`.
- Tests mirror the code under `src/__tests__` (api, components, hooks, integration, services) plus `*.test.tsx` support. Public assets sit in `public`; Supabase artifacts in `supabase`; environment sample in `env.example`.
- Scripts for setup/backups/DB tasks live in `scripts/`; configuration defaults in `config/`; docs and migration notes in `docs/`.

## Build, Test, and Development Commands
- Install: `npm install`. Run locally: `npm run dev` (use `dev:clean` if caches misbehave). Build/serve: `npm run build` then `npm run start`.
- Quality gates: `npm run type-check`, `npm run lint` (or `lint:fix`), `npm run format:check` (or `format`).
- Tests: `npm test` for the suite; targeted runs via `test:components`, `test:api`, etc.; CI/coverage via `npm run test:ci` or `npm run test:coverage` (`coverage:open` to view HTML).
- Supabase & ops: `npm run db:start`, `db:migrate`, `db:seed`, `db:reset`, `db:types`; health ping with `npm run health:check`.

## Coding Style & Naming Conventions
- TypeScript + Next.js with strict mode; prefer typed props and `@/` absolute imports. Components/hooks use PascalCase files (`MovieCard.tsx`) and `useX` hook names; functions/variables stay camelCase.
- Formatting is enforced by Prettier (Tailwind plugin) with 2-space indentation. Run `npm run lint` before commits; console logs belong only in `src/components/debug` or `src/lib/logger.ts`.

## Testing Guidelines
- Jest with `jsdom` and React Testing Library; shared setup in `jest.setup.js` and mocks in `src/__tests__/setupMocks.ts`. Co-locate tests under `src/__tests__` or as `*.test.tsx`.
- Cover utilities/hooks with unit tests and key flows (auth, recommendations, watchlist) with integration tests. Keep coverage strong (CI collects it) and add regressions for fixed bugs.

## Commit & Pull Request Guidelines
- Follow the Conventional Commit style in history (`feat:`, `perf:`, `fix:`, `chore:`). Keep messages imperative and scoped to one change.
- For PRs, add a concise intent summary, key changes, and tests run; attach screenshots/GIFs for UI changes. Link issues and flag any breaking or schema changes.

## Security & Configuration Tips
- Copy `env.example` to `.env.local` and fill API keys (OpenAI, Anthropic, TMDB, Supabase). Never commit secrets or `.env.local`.
- Use `npm run setup:cloud` for hosted workflows or `npm run setup:local` for full local mode; keep Supabase running when testing database-backed features.
