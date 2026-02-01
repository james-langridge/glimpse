# Glimpse

Temporary, secure photo sharing. Upload photos, create a short link, share it with someone, and it expires on your schedule. No accounts needed for viewers. No cloud photo services snooping on your images. Just a simple, private way to share photos with the people you choose.

![Glimpse admin dashboard](public/dashboard.png)

## What is Glimpse?

Glimpse is a self-hosted photo sharing app designed for one thing: letting you share photos privately and temporarily.

Here's how it works:

1. **You upload photos** to your personal Glimpse server through the admin panel.
2. **You create a share link** by selecting which photos to include and setting an expiry date (tomorrow, next week, whenever you want).
3. **You send the link** to whoever you want. They get a short URL with a 6-character code like `N59YCP`.
4. **They view the photos** by visiting the link or entering the code on the homepage. No sign-up, no app download, no account needed.
5. **The link expires** on the date you set. After that, the photos are no longer accessible. You can also revoke a link at any time if you change your mind.

That's it. You stay in control of what's shared, who sees it, and for how long.

### Why is it secure?

Unlike sharing photos through social media, messaging apps, or cloud storage services, Glimpse keeps you in control:

- **Your photos stay on your server.** They aren't uploaded to Google, Apple, Meta, or any third party. They live on a server that you own and control.
- **Links are unguessable.** Each share code is 6 characters picked at random from 36 possible characters (A–Z, 0–9), giving over 2 billion combinations. Codes are generated using a cryptographic random number generator, and code lookups are rate-limited — so even an automated attack would take centuries to stumble on a valid link.
- **Links expire automatically.** Every share link has an expiry date. Once it passes, the photos can't be accessed anymore. No "shared with link" that lives forever.
- **You can revoke access instantly.** Changed your mind? Revoke a link and it stops working immediately.
- **No viewer accounts.** The people you share with don't need to create accounts, hand over their email address, or download an app. Less data floating around means less risk.
- **Photos are cleaned up automatically.** Photos that aren't part of any active share link are automatically deleted after a configurable number of days (default 30). Nothing lingers on the server forgotten.
- **Download protection.** The gallery viewer prevents casual right-click saving and image dragging. (This won't stop a determined technical user, but it discourages casual copying.)
- **No tracking by third parties.** Glimpse doesn't embed analytics scripts, social media pixels, or advertising trackers. The built-in analytics use IP hashing so even the server admin can't see the real IP addresses of viewers.
- **Password-protected admin.** Only someone with the admin password can upload photos, create links, or view analytics. The login is rate-limited to prevent brute-force attacks.

### What can the admin do?

The admin panel lets you:

- **Upload and manage a pool of photos**

![Photo management](public/photos.png)

- **Create share links** with selected photos and an expiry date, and **see all active, expired, and revoked links** at a glance. Revoke or delete links at any time.

![Link management](public/links.png)

- **View analytics**: how many times a link was viewed, from which countries, what devices, and how long people spent looking

![Analytics](public/analytics.png)

---

## Technical Overview

Glimpse is a full-stack Next.js application with a PostgreSQL database and filesystem-based photo storage. It is designed to be self-hosted.

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
  db/                   # Database queries (schema, photos, links, analytics)
  lib/                  # Business logic (auth, storage, rate-limiting, cleanup)
```

**Key design decisions:**

- Database queries are isolated in `src/db/` with a `sql` tagged template for parameterized queries
- Side effects (file I/O, auth) live in `src/lib/`
- React Server Components handle data fetching; Client Components handle interactivity
- Photos are stored on the filesystem, metadata in PostgreSQL
- The database schema auto-initializes on server startup via `instrumentation.ts`

### Database Schema

Four tables:

- **photos** -- uploaded photo metadata (dimensions, blur placeholder, file size)
- **share_links** -- share codes, expiry dates, revocation status
- **share_link_photos** -- junction table linking photos to share links with display order
- **link_views** -- analytics records (hashed IP, geo, device, browser, session duration)

All foreign keys use `ON DELETE CASCADE`.

### API Endpoints

**Public (no auth required):**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/lookup/[code]` | Validate a share code |
| GET | `/api/shared-image/[code]/[filename]` | Serve a photo from an active link |
| POST | `/api/analytics/duration` | Record session duration (beacon) |

**Admin (session required):**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Authenticate with admin password |
| POST | `/api/auth/logout` | End session |
| GET | `/api/photos` | List all photos |
| POST | `/api/photos/upload` | Upload photos (multipart form data) |
| DELETE | `/api/photos/[id]` | Delete a photo |
| GET/POST | `/api/links` | List links / Create a link |
| PUT | `/api/links/[id]` | Update link expiry |
| DELETE | `/api/links/[id]` | Delete a link |
| POST | `/api/links/[id]/revoke` | Revoke a link |
| GET | `/api/analytics` | Fetch analytics data |

**System:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/cleanup` | Delete expired/unused photos (requires Bearer token) |

### Security

- **Password auth** with constant-time HMAC comparison (timing-safe)
- **Rate limiting** on login (5/min) and code lookup (10/min) via in-memory sliding window
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **Session encryption** via iron-session (httpOnly, sameSite=lax, secure in production)
- **IP hashing** with SHA-256 and a secret salt for analytics (raw IPs are never stored)
- **Parameterized queries** throughout (no string concatenation in SQL)

### Image Processing

On upload, Sharp extracts image dimensions and generates a 20x20px blur placeholder (base64 JPEG). The blur data is stored in the database and rendered as a CSS background while the full-resolution image loads. Photos are served with 1-hour cache headers.

---

## Self-Hosting

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A filesystem path for photo storage (persistent across deployments)

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Admin password for the Glimpse dashboard
ADMIN_PASSWORD=your-strong-password-here

# Secret for encrypting session cookies (minimum 32 characters)
SESSION_SECRET=at-least-32-characters-of-random-text

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/glimpse

# Filesystem path where uploaded photos are stored
PHOTO_STORAGE_PATH=/data/photos

# Base URL of your Glimpse instance (used for generating share links)
SITE_URL=https://photos.example.com

# Secret token for the cleanup endpoint (called by cron)
CLEANUP_SECRET=another-random-secret

# (Optional) Number of days before unlinked photos are eligible for cleanup
# Defaults to 30 if not set
CLEANUP_DAYS=30

# (Optional) IANA timezone for displayed times, e.g. in OG previews
# Defaults to the server timezone if not set
DISPLAY_TIMEZONE=Europe/London
```

### Setup

```bash
# Clone the repository
git clone https://github.com/james-langridge/glimpse.git
cd glimpse

# Install dependencies
npm install

# Create the photo storage directory
mkdir -p /data/photos

# Start the development server
npm run dev
```

The database tables are created automatically on first startup. No manual migration step is needed.

### Production Build

```bash
npm run build
npm start
```

The production server runs on port 3000 by default. Use a reverse proxy (Nginx, Caddy) to add HTTPS.

### Photo Cleanup

Glimpse includes an automatic cleanup endpoint that deletes photos older than `CLEANUP_DAYS` days (default 30) that aren't part of any active share link. Call it periodically with a cron job.

**Standard cron:**

```bash
# Run cleanup daily at 3 AM
0 3 * * * curl -sf -X POST https://photos.example.com/api/cleanup \
  -H "Authorization: Bearer YOUR_CLEANUP_SECRET"
```

**Railway:**

The repo includes a `Dockerfile.cleanup` for running cleanup as a scheduled Railway service:

1. Add a new service in your Railway project pointing at this repo
2. Set the Dockerfile path to `Dockerfile.cleanup`
3. Add the `SITE_URL` and `CLEANUP_SECRET` environment variables (matching the values on your main app service)
4. Enable a cron schedule in the service settings (e.g. `0 3 * * *` for daily at 3 AM UTC)
5. Set the watch path to `/Dockerfile.cleanup` so unrelated code changes don't trigger a redeploy

Railway runs the service's start command on the cron schedule, then the container exits until the next run.

### Reverse Proxy (Nginx Example)

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

### Docker (Example)

Here's a starting point for running the main app in Docker:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

Run with:

```bash
docker run -d \
  --name glimpse \
  -p 3000:3000 \
  -v /path/to/photos:/data/photos \
  -e DATABASE_URL="postgresql://user:pass@host:5432/glimpse" \
  -e ADMIN_PASSWORD="your-password" \
  -e SESSION_SECRET="your-session-secret" \
  -e PHOTO_STORAGE_PATH="/data/photos" \
  -e SITE_URL="https://photos.example.com" \
  -e CLEANUP_SECRET="your-cleanup-secret" \
  -e DISPLAY_TIMEZONE="Europe/London" \
  glimpse
```

Make sure the photo storage path inside the container matches `PHOTO_STORAGE_PATH` and is backed by a persistent volume.

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
