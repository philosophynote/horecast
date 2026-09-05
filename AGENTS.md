# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains App Router pages, API routes, and UI components.
- `src/app/api/**/route.ts` defines server endpoints (race list, race detail, navigation, statistics).
- `src/app/components/` holds feature components; `src/app/components/ui/` holds reusable UI primitives.
- Shared helpers live in `src/lib/` and `src/app/lib/`.
- Database schema and migrations are in `prisma/` (`schema.prisma`, `migrations/`); connection and migration settings live in `prisma.config.ts`.
- Static files are in `public/` (images, icons, JSON data under `public/data/`).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local development server with Turbopack (`http://localhost:3000`).
- `npm run lint`: run ESLint directly (`eslint .`) with `eslint-config-next` (`core-web-vitals` + TypeScript rules). Next 16 removed `next lint`.
- `npm test`: run the Vitest suite once (`vitest run`); `npm run test:watch` keeps it in watch mode.
- `npm run build`: run `prisma generate`, apply deploy migrations, then build Next.js.
- `npm run start`: run the production build locally.

## Coding Style & Naming Conventions
- Use TypeScript and functional React components.
- Keep names descriptive and aligned with domain terms (race, entry, payout, predict).
- Follow existing Next.js file conventions: `page.tsx`, `layout.tsx`, `route.ts`.
- Use `PascalCase` for component files (for example, `RaceCard.tsx`) and `camelCase` for utility functions.
- Match surrounding style in edited files; keep comments short and focused on intent.

## Testing Guidelines
- Vitest is the test runner; configuration lives in `vitest.config.mts` (node environment, `@/*` alias).
- Place tests next to the code under test with `*.test.ts(x)` naming under `src/`.
- For every change, run `npm run lint` and `npm test` for fast feedback.
- `.github/workflows/test.yml` runs lint and tests on pushes to `main` and on pull requests.
- Validate key flows manually: top page, `/races/[id]`, and related API responses.

## Commit & Pull Request Guidelines
- Keep commits small and focused; use concise summaries (Japanese or English).
- Existing history often uses issue references like `(#31)` and occasional prefixes like `fix:` or `feat:`.
- PRs should include: purpose, scope, screenshots for UI changes, migration impact (`prisma/migrations`), and verification steps.

## Security & Configuration Tips
- Never commit secrets or `.env` contents.
- `DATABASE_URL` and `DIRECT_URL` are required for Prisma-backed operations.
- Avoid logging sensitive values and avoid raw user input in SQL/command contexts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
