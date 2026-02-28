## Cursor Cloud specific instructions

This is the `poli-app` monorepo: a cross-platform civic engagement app.

### Current state

- Monorepo with pnpm workspaces
- Apps: `apps/web` (Next.js), `apps/mobile` (Expo React Native)
- Shared packages: `packages/types`, `packages/lib`, `packages/ui`
- Backend: Supabase (migrations + Edge Functions in `supabase/`)
- Language: TypeScript strict mode

### Commands

- `pnpm install` - Install dependencies
- `pnpm dev:web` - Start Next.js dev server
- `pnpm dev:mobile` - Start Expo dev server
- `pnpm typecheck` - Run TypeScript checks across all packages
- `pnpm test` - Run unit tests (vitest)
- `pnpm lint` - Run ESLint
- `pnpm build:web` - Build Next.js for production

### Notes

- Edge Functions are Deno-based (in `supabase/functions/`)
- `.env.example` at root has all required env vars
- All Supabase tables have RLS enabled
- No secrets should be committed
