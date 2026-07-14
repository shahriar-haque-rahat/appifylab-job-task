# Buddy Script — Appifylab Full-Stack Task

A secure, scale-aware social feed built from the provided **Login / Register / Feed** HTML-CSS design.
Users register, log in, and share **public / private** posts with images, then **like, comment,
reply, and see who liked** any post, comment, or reply.

- **Frontend:** Next.js 16 (App Router) · Redux Toolkit · RTK Query · the provided CSS reused as-is
- **Backend:** Node.js · Express 5 — a **modular monolith** with a strict **repository pattern**
- **Database:** PostgreSQL via **Prisma** · **Redis** (ioredis) for sessions, rate limiting, feed cache
- **Auth:** JWT access token (httpOnly cookie) + **rotating refresh tokens** (Redis source of truth,
  Postgres backstop) + **double-submit CSRF**
- **Images:** **Cloudinary** for live uploads; seed images served locally

---

## Table of contents

1. [Features](#features) · 2. [Repo structure](#repo-structure) · 3. [Quick start (local)](#quick-start-local)
· 4. [Environment variables](#environment-variables) · 5. [Demo accounts](#demo-accounts)
· 6. [Architecture & decisions](#architecture--decisions) · 7. [API](#api-reference)
· 8. [Security checklist](#security-checklist) · 9. [Scale checklist](#scale-checklist)
· 10. [Design deviations](#design-deviations) · 11. [Deployment](#deployment)
· 12. [How it was verified](#how-it-was-verified)

---

## Features

Everything under the brief's **Feed → Required functionalities** is implemented:

| # | Feature | Where |
|---|---|---|
| 1 | Create posts with **text and image** | `PostComposer` → `POST /uploads/image` (Cloudinary) → `POST /posts` |
| 2 | Feed shows **newest first** | keyset order `(createdAt DESC, id DESC)` |
| 3 | **Like / unlike** with correct state | `ReactionBar` (optimistic) → `POST/DELETE /likes/post/:id` |
| 4 | **Comments, replies, and their like/unlike** | recursive `CommentThread` → `/comments`, `/comments/:id/replies`, `/likes/comment/:id` |
| 5 | **Who liked** a post / comment / reply | `LikeAvatarStack` → `GET /likes/:type/:id` |
| 6 | **Private** (author-only) & **Public** posts | visibility filtered **inside the query** |

Plus: secure register/login, **Google sign-in** (Google Identity Services → an app-issued JWT
session, no parallel auth system), protected feed with server-side redirect, token refresh + immediate
logout, per-route rate limiting, cursor-based infinite scroll, and edit/delete of your own posts &
comments (ownership enforced server-side). Every mutating interaction — like/unlike (post, comment,
reply), comment/reply create, edit, delete, and post create/edit/delete — is **optimistic** (the UI
updates instantly, then reconciles or rolls back with a non-blocking toast on failure).

---

## Repo structure

```
appifylab-job-task/
├── backend/                 # Express modular monolith
│   ├── prisma/              # schema.prisma, migrations, seed.js
│   ├── seed-assets/images/  # local seed images (served at /seed-assets/images/*)
│   └── src/
│       ├── config/          # env (zod), prisma, redis, cloudinary
│       ├── middlewares/     # authenticate, requireOwnership, rateLimiter, validate, csrf, errorHandler
│       ├── utils/           # tokens, cookies, sanitize, cursor, ApiError, selects, schemas
│       ├── cache/           # feedCache
│       ├── modules/         # auth · users · posts · comments · likes · uploads
│       │   └── <mod>/       # repository → service → controller → routes → validation
│       ├── routes/          # mounts /api/*
│       ├── app.js           # helmet, cors, cookies, static seed images, error handling
│       └── server.js
├── frontend/                # Next.js App Router
│   ├── app/                 # layout, /login /register /feed, and globals.css (single stylesheet)
│   ├── components/          # ui/ · auth/ · layout/ · feed/ · icons
│   ├── store/               # RTK store, authSlice, api/ (RTK Query endpoints)
│   ├── lib/                 # types, config, apiError, format, auth-cookies
│   └── proxy.ts             # server-side route protection (Next 16 "proxy" convention)
├── docker-compose.yml       # local Postgres + Redis
└── README.md
```

**Repository pattern:** services depend only on repositories; **only** repositories import Prisma.
The private-post filter and all query logic live in the repositories, called from wherever needed.

---

## Quick start (local)

**Prerequisites:** Node 20+ and either Docker (for Postgres + Redis) **or** hosted Neon + Upstash.

### 1) Start Postgres + Redis

```bash
cd appifylab-job-task
docker compose up -d          # Postgres :5432, Redis :6379
```

> No Docker? Point `DATABASE_URL` / `DATABASE_URL` at a free [Neon](https://neon.tech) database and
> `REDIS_URL` at a free [Upstash](https://upstash.com) Redis instead — no code changes.

### 2) Backend

```bash
cd backend
cp .env.example .env          # then edit if needed (defaults match docker-compose)
npm install
npx prisma generate
npx prisma migrate dev --name init # apply migrations (or: npm run prisma:migrate for dev)
npx tsx prisma/seed.js             # demo users, posts, comments, replies, likes
npm run dev                        # http://localhost:8000  (health: /api/health)
```

Cloudinary is **optional** — leave the three `CLOUDINARY_*` vars blank and image upload still works
via a built-in **local-disk fallback** (files are written to `backend/uploads/` and served at
`/uploads/*`). Fill the vars from a free [Cloudinary](https://cloudinary.com) account to store uploads
in Cloudinary instead — recommended before deploying to an ephemeral host (Render/Railway), where
local disk does not persist across restarts.

`UPLOAD_STORAGE=auto` selects Cloudinary only when all three credentials are present. Set it to
`local` to explicitly use disk in development, or `cloudinary` to require the provider (the API key
must have permission to create assets). Provider calls are bounded by `UPLOAD_TIMEOUT_MS`; rejected
or unavailable uploads return the safe `UPLOAD_FAILED` API code without exposing provider details.

### 3) Frontend

```bash
cd ../frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev                   # http://localhost:3000
```

Open **http://localhost:3000**, register a new account, or log in with a demo account below.

---

## Environment variables

Both apps ship a committed `.env.example`. Key variables:

**backend/.env** — `DATABASE_URL`, `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET` (≥32 chars),
`CORS_ORIGIN` (frontend URL), optional `CLOUDINARY_*`, optional `GOOGLE_CLIENT_ID` (enables Google
sign-in), `PUBLIC_BACKEND_URL` (used to build seed image URLs), and cookie tuning
(`COOKIE_SAMESITE`, `COOKIE_SECURE`, `TRUST_PROXY`).

**frontend/.env.local** — `NEXT_PUBLIC_API_URL` (the backend URL **including** `/api`) and optional
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value as the backend `GOOGLE_CLIENT_ID`).

### Google Sign-In setup (optional)

Google sign-in is off until you supply an OAuth client id (email/password works regardless). To enable it:

1. In the [Google Cloud console](https://console.cloud.google.com) → **APIs & Services → Credentials**,
   create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins** add your frontend origin (e.g. `http://localhost:3000`, and
   your deployed URL). No redirect URI is needed — this uses the Google Identity Services **ID-token**
   flow, not a redirect/code flow.
3. Put the client id in **both** `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env.local`
   (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`). No client **secret** is required.

**How it works:** the browser gets a signed Google **ID token**, POSTs it to `/api/auth/google`; the
backend verifies its signature + audience with `google-auth-library`, links it to an existing account
by verified email (or provisions a new one with an unusable password hash), then issues **our own**
session (the same JWT access + rotating refresh + CSRF as email/password login). So Google users flow
through the exact same `authenticate` middleware and protected routes — there is **no** second auth
system.

Cookie defaults are environment-aware: **dev** uses `SameSite=Lax; Secure=false` (same-site
`localhost`); **prod** uses `SameSite=None; Secure=true` so the Vercel↔Render cross-domain cookie
flow works. Never commit real secrets.

---

## Demo accounts

`npm run seed` creates these (all share the password **`Password123!`**):

| Email | Name |
|---|---|
| `dylan@demo.test` | Dylan Field |
| `karim@demo.test` | Karim Saif |
| `radovan@demo.test` | Radovan Novak |
| `ayesha@demo.test` | Ayesha Khan |
| `marcus@demo.test` | Marcus Lee |

The seed includes **private** posts by Karim and Dylan — log in as another user to confirm they are
genuinely invisible (and try to `GET /api/posts/<that-id>` directly: it returns **404**).

---

## Architecture & decisions

### Auth — access + rotating refresh + CSRF
- **Access token:** short-lived (15 min) HS256 JWT in an **httpOnly** cookie. The `authenticate`
  middleware is the real authorization boundary on every protected route.
- **Refresh token:** opaque `"<jti>.<secret>"`; only its SHA-256 hash is stored — in **Redis**
  (source of truth, TTL) and **Postgres** `refresh_tokens` (durability/audit backstop). It lives in
  an httpOnly cookie **path-scoped to `/api/auth`** (least exposure).
- **Rotation & theft detection:** every refresh **rotates** the token (old one revoked immediately).
  Replaying an already-rotated token is treated as theft → **all** of that user's sessions are
  revoked. If Redis is cold but Postgres shows the token valid, it still works (durability backstop).
- **CSRF:** double-submit token on every state-changing request. The backend sets a `csrf_token`
  cookie **and** returns the same token in the login/register/refresh **response body**; the frontend
  stores that and echoes it in an `x-csrf-token` header. Delivering it via the body (not only the
  cookie) is what makes it work in the **cross-site** production deploy, where the frontend origin
  can't read a cookie set by the API origin — the browser still sends the cookie, so the backend's
  cookie-vs-header check passes. Login/register are exempt; `refresh`/`logout`/all mutations are
  protected.
- **Route protection:** `proxy.ts` does an edge **server-side redirect** using a non-sensitive
  `bs_auth` hint cookie (set on the frontend domain so it works cross-domain in prod); `<AuthGuard>`
  additionally verifies the live session via `/users/me`. The API is the true boundary, so a forged
  hint reveals no data.

### Data model (Prisma)
`User`, `RefreshToken`, `Post` (visibility enum, denormalized `likesCount`/`commentsCount`),
`Comment` (self-relation `parentId` → replies), `Like` (polymorphic `targetType`/`targetId` with a
unique `(userId, targetType, targetId)`). Replies are `Comment` rows with a non-null `parentId` and
render through **one recursive component** (`CommentThread`).

### Privacy
The visibility rule lives in **one place** (the posts repository) and is applied **inside the SQL**:
`WHERE visibility = 'PUBLIC' OR authorId = :viewer`. Hidden posts 404 (existence never revealed), and
you cannot comment on / like / list likers of a post you can't see.

### Scale
- **Denormalized counters** updated by atomic `increment`/`decrement` in the same transaction as the
  like/comment write — never `COUNT(*)` on read.
- **Keyset (cursor) pagination**, not `OFFSET`, ordered `(createdAt DESC, id DESC)` for total order.
- **Composite indexes** matching the real queries: `(visibility, createdAt DESC)` and
  `(authorId, createdAt DESC)` on posts; `(postId, createdAt)` and `(parentId)` on comments;
  `(targetType, targetId, createdAt)` on likes.
- **Redis feed cache:** the first feed page is cached **per viewer** (the feed is visibility-filtered,
  so a shared cache could leak private posts) with a short TTL. A user's own new post/comment/like
  busts their own cache immediately; other users' new public posts appear within the TTL. This
  *eventually-consistent* approach is chosen deliberately over "bust every user's cache on every new
  post," which does not scale to millions of posts/reads.

### Image handling (seed vs live)
Per the plan's two options, this project uses a **hybrid, documented** approach:
- **Seed images → served locally** by the API at `/seed-assets/images/*` (option **b**). This means
  the demo feed is fully populated **without needing a Cloudinary account**.
- **Live uploads → Cloudinary when configured, else local disk.** The client sends the file to
  `POST /uploads/image`; the server validates mime/size and either streams it to Cloudinary (option
  **a**, when `CLOUDINARY_*` is set) **or** writes it to `backend/uploads/` with a random UUID name
  and returns a `${PUBLIC_BACKEND_URL}/uploads/<file>` URL served statically. The local-disk fallback
  keeps the required "create post with image" feature working end-to-end with **zero external setup**;
  Cloudinary is the durable path for production. Post creation only accepts image URLs from an
  **allow-list** of our own hosts (our Cloudinary cloud and/or our `/uploads/` origin) — never
  arbitrary/SSRF URLs.
- **Delivery sharpness:** Cloudinary URLs are rendered through a `c_limit,w_,dpr_2.0,f_auto,q_auto:good`
  transform (`lib/img.ts`) so images are served right-sized and crisp (never upscaled); local/seed
  images are served at full resolution. Post images also have an `onError` fallback so a broken URL
  shows a clean empty state rather than a broken-image icon.

---

## API reference

All under `/api`, all (except auth) require the access cookie; mutations require `x-csrf-token`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` · `/auth/login` | create session (sets cookies) |
| POST | `/auth/google` | verify a Google ID token, create/link account, issue our session |
| POST | `/auth/refresh` · `/auth/logout` | rotate / end session |
| GET | `/users/me` · `/users/:id` | current user / public profile |
| GET | `/posts?cursor=&limit=` | visibility-filtered feed page |
| POST | `/posts` | create post `{ text, visibility, imageUrl? }` |
| GET/PATCH/DELETE | `/posts/:id` | read / edit / delete (own) |
| GET | `/comments?postId=&cursor=` | top-level comments |
| GET | `/comments/:id/replies` | replies |
| POST/PATCH/DELETE | `/comments`, `/comments/:id` | create / edit / delete (own) |
| POST/DELETE/GET | `/likes/:type/:id` | like / unlike / **who liked** (`type` = post \| comment) |
| POST | `/uploads/image` | Cloudinary upload (multipart `image`) |

---

## Security checklist

- ✅ Server-generated UUIDs; zod strips client-supplied `id`/`authorId`/counters
- ✅ `authorId`/`userId` always from `req.user.id`, never the body
- ✅ `visibility` validated against a strict enum
- ✅ Access JWT: short-lived, httpOnly + secure + sameSite cookie
- ✅ Refresh token: opaque, hashed in Redis + Postgres, rotated every use, reuse → revoke-all
- ✅ Logout deletes the Redis entry immediately (real invalidation)
- ✅ Redis-backed rate limits: login 5/15m (IP+email), register 10/h (IP), refresh 20/15m,
  post/comment 20/m (user), general 100/m (IP)
- ✅ Helmet + CORS locked to the frontend origin with `credentials: true`
- ✅ Zod validation on every body/params/query
- ✅ `sanitize-html` on all post/comment text before storage
- ✅ Double-submit CSRF for cookie auth
- ✅ bcrypt cost 12
- ✅ `requireOwnership` on every edit/delete route
- ✅ Private-post filtering inside the repository query
- ✅ Cross-user edit/delete and private-post reads blocked at the API (not just the UI)

## Scale checklist

- ✅ Denormalized counters (increment/decrement, never `COUNT(*)`)
- ✅ Composite indexes matching the feed queries
- ✅ Cursor (keyset) pagination
- ✅ Redis feed caching, per-viewer, invalidated on the actor's writes (+ short TTL)
- ✅ Neon pooled connection (`DATABASE_URL`) + direct connection (`DATABASE_URL`) for migrations

---

## Design deviations

The provided template's **markup and class names** are reused verbatim (fonts, images, and the
original `_`-prefixed class names). The four legacy stylesheets (`bootstrap.min/common/main/responsive.css`)
were **removed and consolidated into a single `app/globals.css`**: the rules the app actually renders
were tree-shaken (rules whose selectors reference classes that never appear in the app are dropped —
they could never match) and merged under an `@layer template` block, with Tailwind's theme + utilities
layered on top and the app-specific globals on top of that. Net effect is visually identical, one
stylesheet instead of five. The full `feed.html` shell is reproduced — desktop header (logo, search, home,
friend-requests, notifications **with dropdown**, messages), the floating **dark/light theme toggle**,
both the **left** (Explore / Suggested People / Events) and **right** (You Might Like / Your Friends)
sidebars, and the **mobile** top bar + bottom navigation — all using the original class names so the
template CSS applies. Only the following minimal, brief-required additions/adaptations were made — no
existing element was restyled:

1. **Registration:** added **First name / Last name** fields (styled with the existing
   `_social_registration_input` classes).
2. **Feed composer & post:** added a **Public / Private visibility selector** (the template shows a
   static "Public" label) — a small dropdown; the post header shows a lock/globe + Public/Private
   label instead of the static "Public" anchor.
3. **Replies:** the template only depicts a reply input, so real one-level reply threading reuses the
   existing comment card styling, indented, via the same recursive `CommentThread`.
4. **Theme toggle** toggles the template's shipped `_dark_wrapper` dark theme on `<body>` (persisted
   to `localStorage`); the original toggles it via `custom.js`, which we don't ship.
5. **Sidebars & mobile nav** reproduce the template markup as **static** widgets (Suggested People,
   Events, Your Friends, etc. are decorative placeholders — the brief scopes real functionality to the
   feed). Decorative links are inert (`href="#"`); the mobile bottom bar wires a real **Log Out**.
   The **Settings**, **Help & Support**, friend-requests, messages and **Share** controls are present
   for parity but are no-ops (no such subsystems are in scope). The **notification dropdown** is
   populated with realistic **seeded sample notifications** (e.g. "X liked your post", "Y commented on
   your post", "Z replied to your comment") rendered in the template's notification card, with an
   unread badge on the bell — static demo data, not a live notification subsystem.
6. **Who-liked:** the reactor-avatar stack (`likePreview`, ≤3 recent likers batched per feed page via
   a window query) renders the design's `_react_img` row; clicking it opens the full paginated liker
   list.
7. Icons in the design are inline SVGs; the prominent ones (home, friend-requests, bell, chat, plus
   like/comment/share/menu and the theme moon/sun) reuse the template's exact paths, the rest are
   clean equivalents.
8. **UX additions** not in the static template: skeleton loaders (feed/comments/replies), a
   determinate image-upload **progress bar**, and inline form validation. `next.config.ts` sets
   `devIndicators: false` to hide the dev-only overlay indicator.
9. **Blanket optimistic UI** (RTK Query `updateQueryData` + rollback): likes/unlikes (post, comment,
   reply) update the button, count **and** the "who liked" avatar stack instantly; new comments,
   replies and posts render immediately (temp row swapped for the server row on success); edits and
   deletes apply instantly. On any API failure the change rolls back and a **non-blocking toast** is
   shown — no blocking `alert()`/`confirm()` anywhere.
10. **Post edit / delete** use a styled, theme-aware **modal** (edit) and a destructive **confirm
    dialog** (delete) consistent with the Tailwind design system, replacing the native dialogs.
11. **Auth pages**: a working **Google sign-in** button (falls back to a disabled hint when no client
    id is configured), submit buttons that never wrap their label, and layout tuned to fit the viewport
    without scrolling on typical screens.

---

## Deployment

Free-tier friendly: **Frontend → Vercel**, **Backend → Render/Railway**, **DB → Neon**,
**Redis → Upstash**, **Images → Cloudinary**.

- Backend: set all `backend/.env.example` vars; `DATABASE_URL` = Neon **pooled**, `DATABASE_URL` = Neon
  **direct**; `CORS_ORIGIN` = your Vercel URL; `TRUST_PROXY=1`; leave cookie SameSite/Secure blank
  (prod defaults to `None`/`Secure`). Build/start: `npm ci && npm run prisma:deploy && npm start`
  (run `npm run seed` once if you want demo data).
- Frontend: set `NEXT_PUBLIC_API_URL=https://<backend>/api`; deploy.

---

## How it was verified

- Backend: full require-graph load, per-file syntax checks, and unit smoke tests of the pure logic
  (cursor round-trip, HTML sanitization, token parse/hash, constant-time compare) all pass.
- Frontend: `tsc --noEmit`, `eslint`, and `next build` all pass clean.
- The whole codebase was then put through an **adversarial multi-agent review** (auth/authz/data
  integrity/API-contract/frontend-logic/hardening). All confirmed correctness/security findings were
  fixed, including: a fatal rate-limiter crash, cross-site CSRF delivery, clearing cached private data
  on a same-tab user switch, a `PUBLIC→PRIVATE` feed-cache privacy leak, orphaned like rows on delete,
  `commentsCount` drift, and the comment-list pagination/refetch behavior.
- Full end-to-end runtime requires a live Postgres + Redis (via Docker or Neon/Upstash as above).

### Known trade-offs (low severity, deliberate)

- **Feed eventual consistency:** other users' new/edited/deleted *public* posts appear within the
  cache TTL (~30 s). A `PUBLIC→PRIVATE` downgrade is the one case that bumps a global cache
  generation for **immediate** invalidation (privacy-critical); the rest ride the short TTL.
- **Refresh rotation across tabs:** the frontend single-flight mutex prevents concurrent refreshes in
  a tab; two tabs refreshing at the exact same instant could briefly mint one extra valid token,
  self-healing on the next rotation/TTL.
- **Register enumeration:** registration intentionally returns a clear "email already registered"
  message (UX) rather than hiding it — login is fully hardened against enumeration.
