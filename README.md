# Glimpse

Temporary, secure photo sharing. Upload photos, create a short link, share it with someone, and it expires on your schedule. No accounts needed for viewers. No cloud photo services snooping on your images. Just a simple, private way to share photos with the people you choose.

![Glimpse admin dashboard](public/dashboard.png)

## What is Glimpse?

Glimpse is a self-hosted photo sharing app designed for one thing: letting you share photos privately and temporarily.

Here's how it works:

1. **You upload photos** to your personal Glimpse server through the admin panel.
2. **You create a share link** by selecting which photos to include and setting an expiry date (tomorrow, next week, whenever you want).
3. **You send the link** to whoever you want. They get a unique, unguessable URL.
4. **They view the photos** by visiting the link. No sign-up, no app download, no account needed.
5. **The link expires** on the date you set. After that, the photos are no longer accessible. You can also revoke a link at any time if you change your mind.

That's it. You stay in control of what's shared, who sees it, and for how long.

### Why is it secure?

Unlike sharing photos through social media, messaging apps, or cloud storage services, Glimpse keeps you in control:

- **Your photos stay on your server.** They aren't uploaded to Google, Apple, Meta, or any third party. They live on a server that you own and control.
- **Links are unguessable.** Each share link uses a cryptographically random 22-character code with over 128 bits of entropy — the same level of security used by GitHub and other major platforms. Brute-force guessing is computationally infeasible.
- **Links expire automatically.** Every share link has an expiry date. Once it passes, the photos can't be accessed anymore. No "shared with link" that lives forever.
- **You can revoke access instantly.** Changed your mind? Revoke a link and it stops working immediately.
- **No viewer accounts.** The people you share with don't need to create accounts, hand over their email address, or download an app. Less data floating around means less risk.
- **Photos are cleaned up automatically.** Photos that aren't part of any active share link are automatically deleted after a configurable number of days (default 30). Cleanup runs on a built-in scheduler — no cron job required. Nothing lingers on the server forgotten.
- **Download protection.** The gallery viewer prevents casual right-click saving and image dragging. (This won't stop a determined technical user, but it discourages casual copying.)
- **Email-gated downloads.** When configured with a Resend API key, Glimpse requires recipients to provide their email address before downloading photos. A time-limited download token is sent to their inbox, creating an accountability trail. The admin can see which email addresses downloaded which photos.
- **Per-link download control.** The admin can enable or disable downloads on each share link individually. When downloads are disabled, the gallery is view-only.
- **Invisible watermarking.** When photos are downloaded through a share link, Glimpse embeds three layers of invisible watermark: EXIF metadata (survives lossless operations), QIM pixel-domain (survives format conversion), and DCT frequency-domain (survives JPEG re-compression and mild resizing). Each watermark encodes the download ID, so leaked photos can be traced back to the specific download event. The admin panel includes a watermark extraction tool to check any image.
- **No tracking by third parties.** Glimpse doesn't embed analytics scripts, social media pixels, or advertising trackers. The built-in analytics use IP hashing so even the server admin can't see the real IP addresses of viewers.
- **Password-protected admin.** Only someone with the admin password can upload photos, create links, or view analytics. The login is rate-limited to prevent brute-force attacks.

### What can the admin do?

The admin panel lets you:

- **Upload and manage a pool of photos** — see view counts, download counts, and link usage at a glance, and drill into per-photo detail pages showing which links include each photo and download history

![Photo management](public/photos.png)

- **Create share links** with selected photos, an expiry date, optional captions, and per-link download permissions. **See all active, expired, and revoked links** at a glance. Bulk select to revoke or delete multiple links at once.

![Link management](public/links.png)

- **View analytics**: how many times a link was viewed, from which countries, what devices, and how long people spent looking

![Analytics](public/analytics.png)

- **Check watermarks**: upload any photo to the watermark checker to extract the embedded download ID and trace it back to the original download event

![Watermark checker](public/watermark.png)

- **Configure settings**: manage runtime settings like cleanup retention period from the admin panel

![Settings](public/settings.png)

---

## Getting Started

### Railway (one-click)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/glimpse?referralCode=0QW2XU&utm_medium=integration&utm_source=template&utm_campaign=generic)

One-click deploy to [Railway](https://railway.com) with a pre-configured app, PostgreSQL database, and persistent volume. Admin password and session secret are auto-generated — just click and go.

### Vercel (free tier)

Deploy to Vercel with a Neon PostgreSQL database and Vercel Blob for photo storage. Everything runs on Vercel's free tier.

1. Fork or import this repo into Vercel
2. Create a [Neon](https://neon.tech) PostgreSQL database and add `DATABASE_URL` to your Vercel environment variables
3. In your Vercel project, go to **Storage** → **Create** → **Blob** to add a blob store (`BLOB_READ_WRITE_TOKEN` is auto-configured)
4. Set these environment variables in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ADMIN_PASSWORD` | Your admin password |
| `SESSION_SECRET` | Random string, 32+ characters |
| `SITE_URL` | Your Vercel app URL (e.g. `https://glimpse.vercel.app`) |

> **Note:** Vercel has a 4.5 MB request body limit on the free tier, so upload roughly one photo at a time. Photo cleanup on Vercel runs via a daily cron job (`/api/cleanup`) instead of the built-in scheduler.

### Docker Compose

The quickest way to self-host Glimpse on your own machine. Docker Compose handles everything — the app, PostgreSQL, and persistent storage — in a single command. All you need is a machine with [Docker](https://docs.docker.com/get-docker/) installed.

```bash
git clone https://github.com/james-langridge/glimpse.git
cd glimpse

# Copy the example env file
cp .env.example .env
```

Edit `.env` and set these three values:

```env
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=at-least-32-characters-of-random-text
POSTGRES_PASSWORD=a-strong-database-password
```

Then start everything:

```bash
docker compose up -d
```

Glimpse will be available at `http://localhost:3000`. The database and photo storage use Docker named volumes, so your data persists across container restarts.

To update after pulling new changes:

```bash
git pull
docker compose up -d --build
```

**Optional settings** you can add to `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `SITE_URL` | Public URL for share links | `http://localhost:3000` |
| `CLEANUP_DAYS` | Days before unlinked photos are deleted (0 to disable) | `30` |
| `RESEND_API_KEY` | Resend API key for email-gated downloads | |
| `EMAIL_FROM` | Sender address for download emails | `onboarding@resend.dev` |
| `DISPLAY_TIMEZONE` | IANA timezone for displayed times | Server timezone |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (uses Blob storage instead of filesystem) | |

### Manual Setup (without Docker)

If you prefer to run Glimpse directly with Node.js, you'll need to provide your own PostgreSQL instance and manage the process yourself.

**Prerequisites:** Node.js 18+, PostgreSQL 14+, a persistent filesystem path for photo storage (or set `BLOB_READ_WRITE_TOKEN` to use Vercel Blob instead).

Create a `.env.local` file:

```env
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=at-least-32-characters-of-random-text
DATABASE_URL=postgresql://user:password@localhost:5432/glimpse
PHOTO_STORAGE_PATH=/data/photos
SITE_URL=https://photos.example.com
```

```bash
git clone https://github.com/james-langridge/glimpse.git
cd glimpse
npm install
mkdir -p /data/photos
npm run build
npm start
```

The database tables are created automatically on first startup. The production server runs on port 3000 by default. Use a reverse proxy (Nginx, Caddy) to add HTTPS.

### Photo Cleanup

Glimpse automatically cleans up photos that are older than `CLEANUP_DAYS` days (default 30) and aren't part of any active share link. Set `CLEANUP_DAYS=0` to disable cleanup and store photos indefinitely.

For Docker and Railway deployments, cleanup runs automatically — 60 seconds after server startup, then every 24 hours. No configuration needed. On Vercel, cleanup runs via a daily cron job (`/api/cleanup`, secured by `CRON_SECRET`). The last cleanup time is shown on the admin photos page.

### Reverse Proxy (Nginx Example)

If you're running Glimpse behind a reverse proxy (common with both Docker Compose and manual setups), here's an Nginx example:

```nginx
server {
    listen 443 ssl;
    server_name photos.example.com;

    ssl_certificate     /etc/letsencrypt/live/photos.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/photos.example.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The `X-Forwarded-For` header is important -- Glimpse uses it for rate limiting and analytics geolocation.

> **Security note:** Glimpse trusts the first IP in the `X-Forwarded-For` header for rate limiting. A reverse proxy that sets this header is required in production -- without one, clients can spoof the header to bypass rate limits. Railway and Vercel set this header automatically. For Docker or manual deployments, always run behind a reverse proxy (Nginx, Caddy, Traefik) that overwrites `X-Forwarded-For` with the real client IP.

---

## Technical Overview

Glimpse is a full-stack Next.js application with a PostgreSQL database and filesystem or Vercel Blob photo storage.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL |
| Auth | iron-session (encrypted cookies) |
| Image Processing | Sharp |
| Analytics | geoip-lite, ua-parser-js, Recharts |

### Architecture

```
app/                    # Next.js App Router (pages + API routes)
  admin/                # Admin panel pages (dashboard, photos, links, analytics)
  api/                  # REST API endpoints
  [code]/               # Public share gallery (dynamic route)

src/
  components/           # React client components
  db/                   # Database queries (schema, photos, links, analytics, downloads, settings)
  lib/                  # Business logic (auth, storage, rate-limiting, cleanup)
```

**Key design decisions:**

- Database queries are isolated in `src/db/` with a `sql` tagged template for parameterized queries
- Side effects (file I/O, auth) live in `src/lib/`
- React Server Components handle data fetching; Client Components handle interactivity
- Photos are stored on the filesystem or Vercel Blob (selected by `BLOB_READ_WRITE_TOKEN`), metadata in PostgreSQL
- The database schema auto-initializes on server startup via `instrumentation.ts`, which also schedules automatic photo cleanup

### Database Schema

Seven tables:

- **photos** -- uploaded photo metadata (dimensions, blur placeholder, file size, captions)
- **share_links** -- share codes, expiry dates, revocation status, download permissions
- **share_link_photos** -- junction table linking photos to share links with display order and per-link captions
- **link_views** -- analytics records (hashed IP, geo, device, browser, session duration)
- **settings** -- runtime configuration (e.g. cleanup retention period)
- **photo_downloads** -- download analytics with optional email and token linkage
- **download_tokens** -- email-gated download tokens with expiry and consumption tracking

All foreign keys use `ON DELETE CASCADE`.

### API Endpoints

**Public (no auth required):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/shared-image/[code]/[filename]` | Serve a photo from an active link |
| GET | `/api/download/[code]/[filename]` | Download a watermarked photo from an active link |
| POST | `/api/download-request` | Request a download token via email |
| GET | `/api/download-token/[token]` | Validate and consume a download token |
| POST | `/api/analytics/duration` | Record session duration (beacon) |
| GET | `/api/cleanup` | Run photo cleanup (Vercel cron, requires `CRON_SECRET`) |

**Admin (session required):**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Authenticate with admin password |
| POST | `/api/auth/logout` | End session |
| GET | `/api/photos` | List all photos (with view/link counts) |
| POST | `/api/photos/upload` | Upload photos (multipart form data) |
| GET | `/api/photos/[id]/detail` | Photo detail (metadata, links, view stats) |
| PATCH | `/api/photos/[id]` | Update photo metadata |
| DELETE | `/api/photos/[id]` | Delete a photo |
| GET | `/api/photos/[id]/analytics` | Photo analytics (views, downloads) |
| GET | `/api/photos/[id]/image` | Serve photo image for admin preview |
| POST | `/api/photos/bulk-delete` | Bulk delete photos |
| POST | `/api/photos/watermark/extract` | Extract watermark from an uploaded image |
| GET/POST | `/api/links` | List links / Create a link |
| GET | `/api/links/[id]` | Link detail (metadata, photos) |
| PUT | `/api/links/[id]` | Update link (expiry, title, photos, downloads) |
| DELETE | `/api/links/[id]` | Delete a link |
| PATCH | `/api/links/[id]/revoke` | Revoke a link |
| GET | `/api/links/[id]/analytics` | Link analytics (views, devices, geo) |
| POST | `/api/links/[id]/duplicate` | Duplicate a link |
| PUT | `/api/links/[id]/photos/[photoId]/caption` | Set per-link photo caption |
| POST | `/api/links/bulk-delete` | Bulk delete links |
| POST | `/api/links/bulk-revoke` | Bulk revoke links |
| GET | `/api/analytics` | Fetch analytics data |
| GET/PUT | `/api/settings` | Read/update admin settings |

### Security

- **Password auth** with constant-time HMAC comparison (timing-safe)
- **Rate limiting** on login (5/min) and code lookup (10/min) via in-memory sliding window
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **Session encryption** via iron-session (httpOnly, sameSite=lax, secure in production)
- **IP hashing** with SHA-256 and a secret salt for analytics (raw IPs are never stored)
- **Parameterized queries** throughout (no string concatenation in SQL)

### Image Processing

On upload, Sharp extracts image dimensions and generates a 20x20px blur placeholder (base64 JPEG). The blur data is stored in the database and rendered as a CSS background while the full-resolution image loads. Photos are served with 1-hour cache headers.

On download, photos are watermarked with three layers of increasing robustness:

1. **EXIF metadata** — `ImageDescription` tag with the download ID. Instant to read, stripped by re-saving.
2. **QIM pixel-domain** — Quantization Index Modulation on the blue channel of 120 PRNG-selected pixels. Survives lossless operations, destroyed by JPEG re-compression.
3. **DCT frequency-domain** — 2D Discrete Cosine Transform on 120 random 8×8 luminance blocks, modifying a mid-frequency coefficient. Survives JPEG re-compression at quality 70+ and mild resizing.

Extraction tries each layer in order (cheapest first) and returns the first successful match. All watermark logic is in `src/lib/watermark.ts` with no external dependencies beyond Sharp.

---

## Development

```bash
# Start the dev server (with hot reload)
npm run dev

# Lint
npm run lint

# Build for production
npm run build
```

### Project Conventions

- **Database queries** go in `src/db/` using the `sql` tagged template from `src/lib/db.ts`
- **Business logic** (pure functions, utilities) goes in `src/lib/`
- **React components** go in `src/components/` with the `"use client"` directive for interactive components
- **API routes** go in `app/api/` following Next.js App Router conventions
- Path alias `@/*` maps to the project root

### Adding a New Feature

1. If it needs new tables, add them to `src/db/schema.ts` (they auto-create on startup)
2. Add query functions in a new or existing `src/db/*.ts` file
3. Add API routes under `app/api/`
4. Add UI components in `src/components/` and pages in `app/`

## License

MIT — see [LICENSE](LICENSE) for details.
