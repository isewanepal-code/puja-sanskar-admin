# Frontend Engineering Standards

The rules the shop website and the admin panel follow. Both apps start from
this repository's `setup` branch and keep a copy of this file; a change to it
goes through a `docs/*` branch and pull request first, then the code.

The API has its own standards (`docs/architecture/engineering-standards.md` in
`puja-sanskar-api`). Business rules live there; this file says how the
frontends use them.

---

## 1. What we are building

| App          | Repository           | Users                  | Address (production) | Local port |
| ------------ | -------------------- | ---------------------- | -------------------- | ---------- |
| API          | `puja-sanskar-api`   | Both apps              | `api.<domain>`       | 3000       |
| Shop website | `puja-sanskar-web`   | Customers, guests, SEO | `<domain>`           | 3001       |
| Admin panel  | `puja-sanskar-admin` | Staff, by role         | `admin.<domain>`     | 3002       |

Two apps, not one with an `/admin` area:

- Staff sessions live on their own origin, so a fault on the public site
  cannot reach them, and the admin can be kept out of search engines and
  restricted at the network edge.
- A broken release of one never takes the other down.
- The API already keeps them apart: separate logins, permission checks on
  every `/admin/*` route, and a CORS list that takes several origins.

| Concern  | Website                                      | Admin                                 |
| -------- | -------------------------------------------- | ------------------------------------- |
| Language | Nepali (default, no prefix) and English      | English only, through the same i18n   |
| Pages    | Server rendered for SEO, cached for a minute | Client heavy: tables, forms, dialogs  |
| Sign-in  | Customer email, Google, Facebook             | Staff email and password with captcha |
| Indexing | Sitemap, canonical URLs, hreflang            | `noindex` everywhere, no sitemap      |

## 2. Principles

1. **The API decides; the frontend shows.** Prices, VAT, discounts, delivery
   fees, stock, order status and what a user may do all come from the API. The
   frontend never recomputes them, it displays the API's numbers and codes.
2. **Server first.** Render on the server what does not need the browser;
   ship client components only for interaction.
3. **One way to do each thing.** One API client, one session, one money
   formatter, one table, one form pattern. Reuse before writing.
4. **Typed end to end.** API types are generated from the API's OpenAPI
   document, never written by hand.
5. **Every screen has three states.** Loading, empty and error, using the
   shared feedback components.

---

## 3. Stack

Shared by both apps; adding a library needs a reason in the pull request.

| Area      | Choice                                                  |
| --------- | ------------------------------------------------------- |
| Framework | Next.js 16 App Router, React 19, TypeScript strict      |
| Styling   | Tailwind CSS 4, shadcn/ui (Base UI), lucide-react       |
| i18n      | next-intl                                               |
| Data      | TanStack Query on the client, `fetch` in server code    |
| Forms     | React Hook Form with Zod                                |
| API types | `openapi-typescript` from the API's `/api/v1/docs-json` |
| Tests     | Vitest, React Testing Library, Playwright               |
| Quality   | ESLint, Prettier, Husky, commitlint, GitHub Actions     |

No global state library: server data lives in TanStack Query, the URL holds
filters and pages, and the rest is component state.

---

## 4. Architecture

### 4.1 Source layout

```text
src/
├── app/            routes only: pages, layouts, route handlers, metadata
├── features/       one folder per business area
├── components/     shared UI with no business rules
│   ├── ui/         shadcn primitives, changed only through the shadcn CLI
│   ├── layout/     Container, Section, page shells
│   ├── feedback/   loading, empty and error states
│   └── media/      images and audio
├── lib/            technical building blocks
│   ├── api/        client, generated types, error mapping
│   ├── session/    cookies, refresh, current user (server only)
│   ├── env/        validated environment
│   ├── format/     money, dates, numbers
│   ├── seo/        metadata, canonical, hreflang (website)
│   └── routes.ts   every path the app links to
├── i18n/           routing, navigation, messages
├── config/         static configuration
├── hooks/          shared client hooks
├── providers/      app-wide providers
└── test/           test setup and render helpers
```

### 4.2 Feature template

```text
src/features/<feature>/
├── api/            query keys, server fetchers, client queries and mutations
├── components/     the feature's UI
├── schemas/        Zod schemas for its forms
├── hooks/          client hooks used only here
└── index.ts        what other code may import
```

Website features: `catalogue`, `pujas`, `kits`, `content`, `search`, `cart`,
`checkout`, `account`, `orders`, `auth`. Admin features follow the admin
screens: `catalogue`, `inventory`, `orders`, `billing`, `customers`,
`promotions`, `settings`, `reports`, `staff`, `activity`, `storefront`.

### 4.3 Dependency rules

```text
app → features → components, lib
```

- `app/` files stay thin: read params, call one feature, render it.
- A feature imports another only through its `index.ts`, never its folders.
- `components/` and `lib/` never import from `features/`.
- `lib/session` and anything holding a token is server only
  (`import 'server-only'`).
- An ESLint `no-restricted-imports` rule enforces this once the first
  feature lands.

### 4.4 Server and client components

- Pages and layouts are server components. `'use client'` goes on the
  smallest component that needs state, effects or browser APIs.
- Server components fetch their own data; a client component gets its first
  data as props or through TanStack Query, never both for the same thing.
- Secrets and tokens never cross into a client component's props.

---

## 5. Talking to the API

### 5.1 Types

- `npm run api:types` reads `http://localhost:3000/api/v1/docs-json` and writes
  `src/lib/api/schema.d.ts`. The file is committed and regenerated in the same
  pull request that uses a changed endpoint.
- Request and response types come from that file. Hand-written API types and
  per-endpoint response schemas are not allowed: they drift.
- Zod is for what users type (forms). The client checks only the envelope at
  run time.

### 5.2 Responses

The API wraps everything:

```json
{ "success": true, "message": "…", "data": {} }
{ "success": false, "message": "…", "error": { "code": "CART_NOT_READY", "details": [] }, "requestId": "…" }
```

| Topic      | Rule                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Lists      | `data.items` and `data.meta` (`page`, `limit`, `total`, `totalPages`); `limit` at most 100        |
| Errors     | Shown by `error.code`: the message comes from `errors.<CODE>` in the messages, else a generic one |
| Validation | `VALIDATION_ERROR` details are `{ field, code, message }`; forms put each on its field            |
| Request id | Unexpected errors show the `requestId`, so a customer or staff member can quote it                |
| 401        | `AUTH_TOKEN_INVALID` triggers one refresh (7.2); anything else signs out                          |
| 429        | "Too many attempts, wait a minute"; never retried automatically                                   |

The website never shows the API's English `message` to a shopper; the admin
may, as a fallback when a code has no text yet.

### 5.3 Data rules

| Data     | Rule                                                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money    | Strings with two decimals (`"1250.00"`), VAT included. Never `parseFloat` for arithmetic; display with `formatMoney`                                                                                           |
| Dates    | ISO from the API; shown in `Asia/Kathmandu` with `lib/format`. Bills carry their own BS date; never convert it again                                                                                           |
| IDs      | UUIDs in admin URLs, slugs in website URLs                                                                                                                                                                     |
| Moved    | A catalogue read answering `301` (`…_MOVED`) gives the new slug in `error.details[0].slug`; the page calls `permanentRedirect` to it. Server fetches use `redirect: 'manual'` so the browser's URL changes too |
| Money in | Admin money inputs are strings checked with the API's pattern `^\d{1,13}(\.\d{1,2})?$`                                                                                                                         |

### 5.4 Caching

| Read                                      | How                                                               |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Public catalogue, content, home           | Server `fetch` with `next: { revalidate: 60 }`, as the API caches |
| Anything personal (cart, account, orders) | `cache: 'no-store'`, or TanStack Query on the client              |
| Admin                                     | TanStack Query; a mutation invalidates the exact keys it changed  |

Query keys come from one factory per feature (`productKeys.list(filters)`),
never inline arrays.

### 5.5 Writes

- Payments, refunds and counter sales send an `Idempotency-Key`: one
  `crypto.randomUUID()` per user action, kept across retries of that action.
- Submit buttons are disabled while the request runs.
- Shared carts change under the user: send the cart `version` at checkout and
  show `409 CART_CHANGED` as "the cart changed, check it again".

---

## 6. Routes

### 6.1 Website paths the API links to

The API writes these into emails, chat messages, the sitemap and search
results. They are fixed; changing one is an API change first.

| Path                                                               | Page                                     |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `/pujas/:slug`, `/samagri/:slug`, `/products/:slug`, `/kits/:slug` | Catalogue pages                          |
| `/festivals/:slug`, `/guides/:slug`, `/blog/:slug`, `/pages/:slug` | Content pages                            |
| `/pay/:token`                                                      | Quick pay: amount due and QR             |
| `/bills/:token`                                                    | A bill, with a link to the printable one |
| `/account/orders/:id`                                              | One of the customer's orders             |
| `/reset-password?token=`                                           | New password, for customers and staff    |
| `/verify-email?token=`                                             | Email confirmation                       |

English pages add `/en` in front; Nepali has no prefix. `GET /sitemap.xml` on
the website serves the API's sitemap rather than building its own.

### 6.2 Building links

Paths are built only in `lib/routes.ts` (`routes.product(slug)`), and links use
`Link` from `@/i18n/navigation` so the language is kept.

---

## 7. Sessions and access

### 7.1 Where tokens live

Tokens never reach browser JavaScript: no `localStorage`, no readable cookies.

```text
Browser ──(same origin, cookies)──▶ Next route handlers ──(Bearer)──▶ API
```

| Piece         | Rule                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Sign in / out | Route handlers call the API and set or clear the cookies                                           |
| Cookies       | Access and refresh token, `httpOnly`, `Secure`, `SameSite=Lax`, path `/`, prefix from `siteConfig` |
| Calls         | Server components read the cookie directly; client calls go through one proxy route handler        |
| Guest cart    | The `X-Cart-Token` is kept in an `httpOnly` cookie and added by the server                         |
| API address   | Server only (`API_URL`); the browser never calls the API itself                                    |

### 7.2 Refreshing

- Access tokens last 15 minutes, refresh tokens 7 days, and every refresh
  rotates the pair.
- The API treats a reused refresh token as theft and ends every session of
  that user. So a session refreshes **once at a time**: concurrent requests
  wait for the one refresh in flight, and an old refresh token is never sent
  again.
- A failed refresh clears the cookies and sends the user to sign in, back to
  the page they were on afterwards.

### 7.3 Sign-in rules

| Case                    | Behaviour                                                                   |
| ----------------------- | --------------------------------------------------------------------------- |
| `AUTH_CAPTCHA_REQUIRED` | Show the Cloudflare Turnstile widget and resend with `captchaToken`         |
| `AUTH_ACCOUNT_LOCKED`   | Say the account is locked for a while; offer password reset                 |
| Wrong email or password | One message for both, as the API gives                                      |
| Customer after sign-in  | `POST /carts/mine/merge` with the guest cart, then continue where they were |

### 7.4 Permissions (admin)

- `GET /auth/me` gives the staff member's roles and permissions; the admin
  reads it once per session.
- Navigation entries, buttons and pages declare the permission they need
  (`catalogue:write`); a `can(permission)` helper and `<Can>` component hide
  what the user lacks.
- Hiding is for convenience. The API refuses anyway (`403`), and the admin
  shows that refusal plainly.
- A role change reaches the token at the next refresh, within 15 minutes.

---

## 8. Forms

- React Hook Form with a Zod schema from the feature's `schemas/`.
- Lengths and formats copy the API's DTOs, so the browser rejects what the API
  would; the API still has the last word and its field errors land on the
  same inputs.
- Create and edit use one form component; edit sends only changed fields
  (`PATCH`).
- Destructive actions confirm in a dialog that names what is lost. Prefer
  deactivating (`isActive: false`) where the API offers it; `DELETE` exists
  only to remove mistakes.

---

## 9. UI

| Topic         | Rule                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Components    | Compose shadcn primitives in feature components; `components/ui` changes only through `npx shadcn add`      |
| Colours, type | Only the tokens in `globals.css`; no hex values or one-off font sizes in components                         |
| States        | `LoadingState`, `EmptyState`, `ErrorState` for every async view; skeletons where layout must hold           |
| Images        | `MediaImage` with the size presets in `config/media.ts`; the API's `thumb`, `medium` and `large` WebP files |
| Accessibility | Labels on every input, visible focus, keyboard reachable dialogs and menus, `alt` from the API's alt text   |
| Mobile        | Website designed for phones first; admin usable on a tablet                                                 |

---

## 10. Website

| Topic       | Rule                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| Text        | Every word in `messages/ne.json` and `en.json`; `ne.json` is the source of the types                         |
| Metadata    | Every page calls `createMetadata` with its path; canonical and hreflang come with it                         |
| Rendering   | Catalogue and content pages are static with a 60 s revalidate; cart, checkout and account render per request |
| Structured  | Product and kit pages add JSON-LD (`Product`, `Offer` from the API price)                                    |
| Markdown    | Festival and article bodies render through one sanitising Markdown component                                 |
| Search      | `GET /search` as the user types, debounced 300 ms, from the second character                                 |
| Shared cart | Poll `GET /carts/:id` every few seconds while the page is visible; refetch when `version` moves              |
| Checkout    | `GET …/checkout-options` drives the choices; quick pay opens the returned `chatUrl`                          |
| Speed       | Largest content paint under 2.5 s on a mid-range phone; no client component bigger than it needs to be       |

## 11. Admin

| Topic      | Rule                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Text       | English through next-intl with one locale and no prefix, so adding Nepali later is configuration                |
| Indexing   | `robots: noindex`, `X-Robots-Tag: noindex` and no sitemap                                                       |
| Navigation | One config lists every section with its path, label, icon and permission; the sidebar renders what `can` allows |
| Tables     | One `DataTable`: server pagination, sort and filters held in the URL and sent as the API's `page`, `limit`, `q` |
| Detail     | List → detail → edit on the same record id; back keeps the list's filters                                       |
| Exports    | Report `…/export` files download through the proxy                                                              |
| Headers    | A strict Content Security Policy and `frame-ancestors 'none'`                                                   |

The screens and the endpoints behind them are listed in `docs/api/screens.md`
in the API repository.

---

## 12. Coding rules

- TypeScript strict; no `any`, no `@ts-ignore`, no `!` outside tests.
- Files `kebab-case.tsx`; components `PascalCase`; hooks `useX`; one exported
  component per file.
- Named exports everywhere except the files Next.js requires to default
  export (`page`, `layout`, `route`, `error`, `not-found`).
- Each folder exposes its public surface through `index.ts`.
- Environment only through `lib/env`; never `process.env` elsewhere.
- No magic strings for paths, query keys or permissions: `routes`, key
  factories and the permission list.
- Comments explain _why_ in one line, only when the code cannot. No JSDoc
  restating the code, no commented-out code, no `console.log`.
- Commits: conventional commits written by and for people; no tool or AI
  attribution. Next.js agent files stay off (`agentRules: false`).

---

## 13. Testing

| Level     | Where                    | What                                                           |
| --------- | ------------------------ | -------------------------------------------------------------- |
| Unit      | `*.test.ts` next to code | Formatters, route builders, error mapping, query key factories |
| Component | `*.test.tsx`             | Behaviour through `@/test/render`: what the user sees and does |
| E2E       | `e2e/`                   | Real browser against a local API with test data                |

E2E must cover, at least: website browse → cart → checkout → pay page, sign
in and out, language switch; admin sign in with captcha, create a product
with a pack, record a payment, permission-hidden actions.

Test names describe behaviour: `should show the price the API sends`.

---

## 14. Workflow

```text
development ── feature/<feature> ── PR ──▶ development ── release PR ──▶ main
```

- Never commit directly to `main`, `development` or `setup`.
- One feature per branch and pull request, merged with a merge commit.
- `setup` holds only the reusable foundation, with no business logic.

### Definition of done

- [ ] Follows the layout and dependency rules above
- [ ] API types regenerated if an endpoint changed
- [ ] Loading, empty and error states present
- [ ] Every string translated (website) or in messages (admin)
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` pass
- [ ] Checked on a phone-sized screen
- [ ] Docs updated if behaviour or these standards changed

---

## 15. Before the first feature

The foundation needs these once, in `setup`, before any page is built:

| Step         | What                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| API types    | `openapi-typescript`, the `api:types` script and the generated file                       |
| API client   | Typed by the generated paths; envelope check, error mapping by code, `redirect: 'manual'` |
| Session      | Cookie helpers, sign-in/out route handlers, the proxy route, single-flight refresh        |
| API address  | `NEXT_PUBLIC_API_URL` becomes the server-only `API_URL`                                   |
| Formatters   | `formatMoney`, `formatDate` in `lib/format`                                               |
| Routes       | `lib/routes.ts` with the paths in 6.1                                                     |
| Images       | `images.remotePatterns` for the API's media address                                       |
| Import rules | ESLint `no-restricted-imports` for 4.3                                                    |
| Sitemap      | `app/sitemap.ts` replaced by a route serving the API's `GET /sitemap.xml` (website)       |
