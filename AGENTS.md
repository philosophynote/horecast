# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains App Router pages, API routes, and UI components.
- `src/app/api/**/route.ts` defines server endpoints (race list, race detail, navigation, statistics).
- `src/app/components/` holds feature components; `src/app/components/ui/` holds reusable UI primitives.
- Shared helpers live in `src/lib/` and `src/app/lib/`.
- Database schema and migrations are in `prisma/` (`schema.prisma`, `migrations/`).
- Static files are in `public/` (images, icons, JSON data under `public/data/`).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local development server with Turbopack (`http://localhost:3000`).
- `npm run lint`: run Next.js ESLint checks (`next/core-web-vitals` + TypeScript rules).
- `npm run build`: run `prisma generate`, apply deploy migrations, then build Next.js.
- `npm run start`: run the production build locally.

## Coding Style & Naming Conventions
- Use TypeScript and functional React components.
- Keep names descriptive and aligned with domain terms (race, entry, payout, predict).
- Follow existing Next.js file conventions: `page.tsx`, `layout.tsx`, `route.ts`.
- Use `PascalCase` for component files (for example, `RaceCard.tsx`) and `camelCase` for utility functions.
- Match surrounding style in edited files; keep comments short and focused on intent.

## Testing Guidelines
- There is currently no dedicated automated test suite in this repository.
- For every change, run `npm run lint` first for fast feedback.
- Validate key flows manually: top page, `/races/[id]`, and related API responses.
- If adding non-trivial logic, add tests with `*.test.ts(x)` naming and document the run command in `package.json`.

## Commit & Pull Request Guidelines
- Keep commits small and focused; use concise summaries (Japanese or English).
- Existing history often uses issue references like `(#31)` and occasional prefixes like `fix:` or `feat:`.
- PRs should include: purpose, scope, screenshots for UI changes, migration impact (`prisma/migrations`), and verification steps.

## Security & Configuration Tips
- Never commit secrets or `.env` contents.
- `DATABASE_URL` and `DIRECT_URL` are required for Prisma-backed operations.
- Avoid logging sensitive values and avoid raw user input in SQL/command contexts.
