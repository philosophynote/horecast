# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages, API routes, and UI.
  - `api/…/route.ts`: API endpoints (Prisma → Supabase). Example: `src/app/api/races/[id]/route.ts`.
  - `components/`: Reusable React components. Example: `EntryTable.tsx`, `Header.tsx`.
  - Route pages: `page.tsx`, dynamic segments like `races/[id]/page.tsx`.
- `src/lib/`: Utilities (`utils.ts`, domain helpers).
- `prisma/`: Prisma schema and migrations (`schema.prisma`, `migrations/`).
- `public/`: Static assets.
- `supabase/`: Local Supabase config/migrations (keep in sync with Prisma).

## Build, Test, and Development Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start local dev server with Turbopack at `http://localhost:3000`.
- `npm run build`: Generate Prisma client, apply migrations (`deploy`), then `next build`.
- `npm start`: Run the production build.
- `npm run lint`: Lint with Next.js ESLint config.
- Prisma (local changes): `npx prisma migrate dev` and `npx prisma studio` as needed.

## Coding Style & Naming Conventions
- **Language**: TypeScript, React 19, Next.js 15 App Router.
- **Linting**: ESLint (`next/core-web-vitals`, `next/typescript`). Fix warnings before PRs.
- **Components**: PascalCase filenames/exports (e.g., `RaceCard.tsx`).
- **Routes/API**: Next.js conventions (`route.ts`, `page.tsx`, dynamic `[id]`).
- **General**: camelCase variables/functions; 2-space indentation; prefer named exports.
- **Styling**: Tailwind CSS utilities; keep classes readable and grouped by purpose.

## Testing Guidelines
- No unit/E2E tests are committed yet. When adding tests:
  - Place near source or mirror paths under `src/`.
  - Name as `*.test.ts`/`*.spec.tsx`.
  - Add an `npm test` script (Vitest/Playwright suggested) and document usage.

## Commit & Pull Request Guidelines
- **Commits**: Short, imperative subject; include context and PR number when applicable (e.g., `fix: race time display (#21)`). English or Japanese is fine; stay consistent.
- **PRs**: Provide a clear description, linked issues, before/after screenshots for UI, migration notes (Prisma/Supabase), and manual test steps.
- **Scope**: Keep changes focused; update docs when behavior or env vars change.

## Security & Configuration Tips
- Configure `.env.local`: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_API_URL`, optional GA ID.
- Never commit secrets. Verify migrations apply safely (`prisma migrate deploy`) before release.
- API routes should validate inputs and avoid leaking PII or internal errors.

