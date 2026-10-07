# Puja Sanskar Web

Frontend for Puja Sanskar — puja materials, puja services and packages.

## Tech Stack

| Area      | Tools                                                  |
| --------- | ------------------------------------------------------ |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling   | Tailwind CSS v4, shadcn/ui (Base UI), lucide-react     |
| Data      | TanStack Query, typed `apiClient` with Zod validation  |
| Forms     | React Hook Form, Zod                                   |
| Testing   | Vitest, React Testing Library, Playwright              |
| Quality   | ESLint, Prettier, GitHub Actions                       |

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

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable               | Description          | Default                        |
| ---------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Backend API base URL | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Public website URL   | `http://localhost:3000`        |

Variables are validated at startup in `src/lib/env`. Add new variables to the schema and to `.env.example`.

## Scripts

| Script                  | Description                      |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start the development server     |
| `npm run build`         | Create a production build        |
| `npm run start`         | Serve the production build       |
| `npm run lint`          | Run ESLint                       |
| `npm run typecheck`     | Run the TypeScript compiler      |
| `npm run format`        | Format files with Prettier       |
| `npm run format:check`  | Verify formatting                |
| `npm test`              | Run unit and component tests     |
| `npm run test:watch`    | Run tests in watch mode          |
| `npm run test:coverage` | Run tests with a coverage report |
| `npm run test:e2e`      | Run Playwright end-to-end tests  |

Before running E2E tests for the first time, install the browser with `npx playwright install chromium`.

## Project Structure

```
e2e/                    Playwright end-to-end tests
src/
  app/                  Routes, layouts, error/loading boundaries, robots, sitemap
  components/
    feedback/           Loading, empty and error states
    layout/             Container, Section
    media/              MediaImage, AudioPlayer
    ui/                 shadcn/ui primitives
  config/               Static app configuration (layout, media)
  hooks/                Reusable client hooks
  lib/
    api/                API client, error contract, response schemas
    auth/               Auth types and constants
    env/                Validated environment variables
    forms/              Form helpers
    media/              Media utilities
    seo/                Metadata and canonical URL helpers
  providers/            App-level React providers
  test/                 Test setup and render utilities
```

## Conventions

- **Imports** use the `@/` alias for `src/`. Each module exposes its public API through an `index.ts`.
- **API calls** go through `apiClient` with a Zod schema; failures surface as `ApiError`.
- **Images** use `MediaImage` or `next/image`. Size presets and allowed qualities live in `src/config/media.ts`. Remote image hosts must be added to `images.remotePatterns` in `next.config.ts`.
- **Tests** are colocated as `*.test.ts(x)` and import `render` from `@/test/render`, which provides app providers and a `user` instance.
- **UI primitives** are added with `npx shadcn add <component>`.

## Git Workflow

- `main` — production
- `development` — integration branch; feature branches target it
- Commits follow [Conventional Commits](https://www.conventionalcommits.org), e.g. `feat(cart): add quantity selector`

CI runs formatting, lint, typecheck, unit tests, a production dependency audit, build and E2E tests on every pull request to `main` and `development`.
