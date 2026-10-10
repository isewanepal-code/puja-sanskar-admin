# Puja Sanskar Web

The Puja Sanskar shop website. It runs on the [Puja Sanskar API](https://github.com/isewanepal-code/puja-sanskar-api); the admin panel is a separate app.

## Tech Stack

| Area      | Tools                                                  |
| --------- | ------------------------------------------------------ |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling   | Tailwind CSS v4, shadcn/ui (Base UI), lucide-react     |
| i18n      | next-intl (Nepali default, English)                    |
| Data      | TanStack Query, typed `apiClient` with Zod validation  |
| Forms     | React Hook Form, Zod                                   |
| Testing   | Vitest, React Testing Library, Playwright              |
| Quality   | ESLint, Prettier, Husky, commitlint, GitHub Actions    |

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm 10+

## Getting Started

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Start the API first (it listens on port 3000), then open [http://localhost:3001](http://localhost:3001). `npm ci` also installs the Git hooks.

## Environment Variables

| Variable               | Description          | Default                        |
| ---------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Backend API base URL | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Public website URL   | `http://localhost:3001`        |

Public variables are validated in `src/lib/env/client.ts`, server-only variables in `src/lib/env/server.ts` (import it directly; it is not re-exported, so it can never reach the client bundle). Add new variables to the schema and to `.env.example`.

## Scripts

| Script                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server                 |
| `npm run build`         | Create a production build                    |
| `npm run start`         | Serve the production build                   |
| `npm run lint`          | Run ESLint                                   |
| `npm run typecheck`     | Generate route types and run the TS compiler |
| `npm run format`        | Format files with Prettier                   |
| `npm run format:check`  | Verify formatting                            |
| `npm test`              | Run unit and component tests                 |
| `npm run test:watch`    | Run tests in watch mode                      |
| `npm run test:coverage` | Run tests with a coverage report             |
| `npm run test:e2e`      | Run Playwright end-to-end tests              |

Before running E2E tests for the first time, install the browser with `npx playwright install chromium`.

## Project Structure

```
e2e/                      Playwright end-to-end tests
src/
  app/
    [locale]/             Localized root layout, error and not-found boundaries
      (site)/             Pages and their loading boundary
      [...rest]/          Sends unknown paths to the localized 404
    robots.ts, sitemap.ts
  components/
    feedback/             Loading, empty and error states
    i18n/                 LocaleSwitcher
    layout/               Container, Section
    media/                MediaImage, AudioPlayer
    theme/                ThemeScript, ThemeToggle
    ui/                   shadcn/ui primitives
  config/                 Static configuration (site, media)
  hooks/                  Reusable client hooks
  i18n/                   Routing, navigation, request config, messages
  lib/
    api/                  API client, error contract, response schemas
    auth/                 Auth types and constants
    env/                  Validated environment variables
    forms/                Form helpers
    media/                Media utilities
    seo/                  Metadata, canonical and hreflang helpers
    theme/                Theme persistence and inline script
  providers/              App-level React providers
  test/                   Test setup and render utilities
  proxy.ts                Locale routing
```

## Conventions

### Pages

Add pages under `src/app/[locale]/(site)/`. Every page and layout resolves the locale first, which validates it and keeps the route statically rendered:

```tsx
import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/server';
import { createMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/pujas'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas' });

  return createMetadata({
    locale,
    pathname: '/pujas',
    title: t('title'),
    description: t('description'),
  });
}

export default async function PujasPage({ params }: PageProps<'/[locale]/pujas'>) {
  await resolveLocale(params);
  // ...
}
```

Call `notFound()` before any `await` that suspends, otherwise the response streams with a `200` status.

### Translations

- Messages live in `src/i18n/messages/<locale>.json`. `ne.json` is the source of truth for types; a test fails if any locale is missing a key.
- Use `useTranslations` in components and `getTranslations` in async server code.
- Use `Link`, `useRouter` and `redirect` from `@/i18n/navigation`, not from `next/*`, so the locale is preserved.
- Default-locale URLs have no prefix (`/pujas`); others are prefixed (`/en/pujas`).

### Other

- **Imports** use the `@/` alias for `src/`. Each module exposes its public API through an `index.ts`.
- **API calls** go through `apiClient` with a Zod schema; failures surface as `ApiError`.
- **Images** use `MediaImage` or `next/image`. Size presets and allowed qualities live in `src/config/media.ts`. Remote image hosts must be added to `images.remotePatterns` in `next.config.ts`.
- **Theme** is applied by an inline script before paint. Use `useTheme` or `ThemeToggle`; colours come from the CSS variables in `globals.css`.
- **Tests** are colocated as `*.test.ts(x)` and import `render` from `@/test/render`, which provides translations (English), the query client and a `user` instance.
- **UI primitives** are added with `npx shadcn add <component>`.

## Git Workflow

- `main` — production
- `development` — integration branch; feature branches target it
- `setup` — the reusable project foundation, kept free of business logic

Commits follow [Conventional Commits](https://www.conventionalcommits.org), e.g. `feat(cart): add quantity selector`. The pre-commit hook lints and formats staged files, and the commit-msg hook validates the message.

CI runs commit linting, formatting, lint, typecheck, unit tests, a production dependency audit, build and E2E tests on every pull request to `main` and `development`.

## Reusing This Setup

The `setup` branch contains no business logic and can start a new project:

1. Copy the branch into a new repository and update `name` in `package.json`.
2. Update `src/config/site.ts` (name, cookie prefix).
3. Update locales in `src/i18n/routing.ts` and `src/i18n/locales.ts`, then the files in `src/i18n/messages/`.
4. Update the brand colours in `src/app/globals.css` and the fonts in `src/app/[locale]/layout.tsx`.
5. Update `.env.example` and the defaults in `src/lib/env/client.ts`.
6. Replace `src/app/favicon.ico` and this README's project description.
