# SlideShare — System Architecture

A document-sharing platform for academic classes. Users browse PDFs, presentations, and notes organized by class. Uploaders publish files directly to AWS S3; the backend only handles metadata and auth tokens.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Component Architecture](#2-component-architecture)
3. [Database Schema](#3-database-schema)
4. [API Reference](#4-api-reference)
5. [Authentication & Authorization Flow](#5-authentication--authorization-flow)
6. [File Upload Flow](#6-file-upload-flow)
7. [File Download Flow](#7-file-download-flow)
8. [Request Lifecycle](#8-request-lifecycle)
9. [S3 Storage Structure](#9-s3-storage-structure)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Security Model](#12-security-model)
13. [Capacity & Traffic Analysis](#13-capacity--traffic-analysis)
14. [Bottlenecks & Scaling Path](#14-bottlenecks--scaling-path)

---

## 1. High-Level Overview

```
                         ┌──────────────────────────────────────┐
                         │             USER BROWSER              │
                         │                                       │
                         │  React SPA (Vite + Tailwind)         │
                         │  Zustand state  │  axios HTTP client  │
                         └────────┬────────┴──────────┬──────────┘
                                  │                   │
                     REST API     │                   │  Direct PUT (file bytes)
                  (JWT Bearer)    │                   │  via presigned S3 URL
                                  ▼                   ▼
               ┌──────────────────────┐   ┌───────────────────────┐
               │    NGINX (port 80)   │   │      AWS S3 BUCKET     │
               │                      │   │                        │
               │  /api/* → backend    │   │  classes/              │
               │  /*     → index.html │   │   {class}/             │
               └──────────┬───────────┘   │     {type}/            │
                           │              │       {uuid}-{file}    │
                           ▼              └───────────────────────┘
               ┌──────────────────────┐
               │  EXPRESS BACKEND      │
               │  Node.js (port 4000)  │
               │                      │
               │  helmet · cors       │
               │  rate-limit · zod    │
               │  bcrypt · JWT        │
               │  Prisma ORM          │
               └──────────┬───────────┘
                           │
                           ▼
               ┌──────────────────────┐
               │   POSTGRESQL (v16)    │
               │                      │
               │  User                │
               │  Class               │
               │  Document            │
               │  RefreshToken        │
               └──────────────────────┘
```

**Core design principle:** File bytes never pass through the Express server. The backend issues a presigned URL; the browser uploads directly to S3. This keeps the server CPU/memory footprint tiny and offloads bandwidth costs entirely to S3.

---

## 2. Component Architecture

```
SlideShare/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Class grid (browse all classes)
│   │   │   ├── ClassDetail.jsx  # Documents inside a class + tab filter
│   │   │   ├── Dashboard.jsx    # Uploader: view & delete own documents
│   │   │   ├── AdminUsers.jsx   # Uploader: admin view
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ClassCard.jsx
│   │   │   ├── DocumentList.jsx
│   │   │   ├── TabFilter.jsx    # PDF / PPT / NOTES tabs
│   │   │   └── UploadForm.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios instance + auto-refresh interceptor
│   │   ├── store/
│   │   │   └── authStore.js     # Zustand: user, accessToken, refreshToken
│   │   └── hooks/
│   │       └── useAuthLogout.js # Listens for auth:logout event
│   ├── nginx.conf               # SPA fallback + /api proxy
│   └── Dockerfile               # Multi-stage: Node build → nginx serve
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── app.js               # Middleware stack + route mounting
│   │   ├── server.js            # HTTP server bootstrap
│   │   ├── config/
│   │   │   ├── env.js           # Env validation + exports
│   │   │   └── prisma.js        # Singleton Prisma client
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── class.routes.js
│   │   │   └── document.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── class.controller.js
│   │   │   └── document.controller.js
│   │   ├── middleware/
│   │   │   ├── authenticate.js  # JWT verify → req.user
│   │   │   ├── requireRole.js   # Role-based gate
│   │   │   └── errorHandler.js  # Centralised error shaping
│   │   ├── services/
│   │   │   └── s3.service.js    # Presign, delete, public URL builder
│   │   ├── validators/
│   │   │   ├── auth.validator.js
│   │   │   └── document.validator.js
│   │   └── utils/
│   │       ├── keyGenerator.js  # S3 key: classes/{class}/{type}/{uuid}-{name}
│   │       ├── apiError.js
│   │       └── logger.js        # Pino structured logger
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js              # Default classes seeded on every boot
│   │   └── migrations/
│   ├── scripts/
│   │   └── sync-s3-db.js       # Admin: reconcile S3 ↔ DB records
│   └── Dockerfile
│
├── docker-compose.yml           # Production: backend + frontend
└── docker-compose.dev.yml       # Dev: postgres + pgadmin only
```

---

## 3. Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                          User                                    │
├──────────────┬──────────────────────────────────────────────────┤
│ id           │ UUID (PK)                                         │
│ name         │ String                                            │
│ email        │ String  UNIQUE                                    │
│ password     │ String  (bcrypt hash, cost=12)                    │
│ role         │ Enum: UPLOADER | VIEWER   default=VIEWER          │
│ createdAt    │ DateTime                                          │
└──────┬───────┴──────────────────────────────────────────────────┘
       │ 1                                                  1
       │                                                    │
       │ N                                                  │ N
┌──────▼───────────────────────────┐   ┌────────────────────▼──────┐
│           Document               │   │       RefreshToken         │
├──────────────────────────────────┤   ├───────────────────────────┤
│ id          UUID (PK)            │   │ id        UUID (PK)        │
│ title       String               │   │ token     String  UNIQUE   │
│ s3Key       String               │   │ userId    String  (FK)     │
│ s3Url       String               │   │ expiresAt DateTime         │
│ fileType    Enum: PDF|PPT|NOTES  │   │ createdAt DateTime         │
│ classId     String (FK → Class)  │   └───────────────────────────┘
│ uploaderId  String (FK → User)   │
│ deletedAt   DateTime? (soft del) │
│ createdAt   DateTime             │
└──────────────┬───────────────────┘
               │ N
               │
               │ 1
┌──────────────▼───────────────────┐
│             Class                │
├──────────────────────────────────┤
│ id          UUID (PK)            │
│ name        String  UNIQUE       │
│ description String?              │
│ createdAt   DateTime             │
└──────────────────────────────────┘
```

### Key Schema Decisions

| Decision | Reason |
|---|---|
| Soft delete (`deletedAt`) on Document | Allows recovery; S3 object is hard-deleted but DB record is preserved for audit |
| RefreshToken table | Enables server-side token revocation and rotation — a stolen refresh token can be invalidated |
| UUIDs as primary keys | Avoids sequential ID enumeration attacks; safe to expose in URLs |
| `role` on User, not a separate roles table | Only two roles exist; a join table would be premature complexity |

---

## 4. API Reference

### Auth — `/auth` (rate-limited: 30 req / 15 min)

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | — | `name, email, password, role?` | Create account, returns tokens |
| POST | `/auth/login` | — | `email, password` | Returns access + refresh tokens |
| POST | `/auth/refresh` | — | `refreshToken` | Rotate refresh token, return new pair |
| POST | `/auth/logout` | — | `refreshToken` | Delete refresh token from DB |

### Classes — `/classes`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/classes` | — | List all classes |
| POST | `/classes` | UPLOADER | Create a new class |

### Documents — `/documents`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/documents` | — | List all (filter by `?classId=` / `?fileType=`) |
| GET | `/documents/mine` | Any | List caller's own documents |
| POST | `/documents/presigned-url` | UPLOADER | Get S3 presigned PUT URL + s3Key |
| POST | `/documents/save-metadata` | UPLOADER | Save document record after upload |
| GET | `/documents/:id/download` | — | Get presigned GET URL (5-min TTL) |
| DELETE | `/documents/:id` | UPLOADER (owner) | Hard-delete from S3, soft-delete in DB |

---

## 5. Authentication & Authorization Flow

```
REGISTRATION / LOGIN
────────────────────

Client                           Backend                        PostgreSQL
  │                                │                                │
  │──POST /auth/register ─────────▶│                                │
  │   { name, email, password }    │                                │
  │                                │── zod validate ──────────────▶│
  │                                │── SELECT user (email) ────────▶│
  │                                │◀─ null (not found) ────────────│
  │                                │── bcrypt.hash(password, 12)   │
  │                                │── INSERT user ────────────────▶│
  │                                │── INSERT refreshToken ─────────▶│
  │◀── 201 { user,                 │                                │
  │          accessToken (15m),    │                                │
  │          refreshToken (7d) } ──│                                │
  │                                │                                │
  │  [stores both in localStorage] │                                │


TOKEN REFRESH (auto, via axios interceptor)
───────────────────────────────────────────

Client                           Backend                        PostgreSQL
  │                                │                                │
  │── Any API call ───────────────▶│                                │
  │◀── 401 Unauthorized ───────────│                                │
  │                                │                                │
  │  [interceptor fires]           │                                │
  │── POST /auth/refresh ─────────▶│                                │
  │   { refreshToken }             │── SELECT refreshToken ────────▶│
  │                                │◀─ record (valid & not expired) │
  │                                │── jwt.verify(token)            │
  │                                │── DELETE old refreshToken ────▶│
  │                                │── INSERT new refreshToken ─────▶│
  │◀── 200 { accessToken,          │                                │
  │          refreshToken (new) } ─│                                │
  │                                │                                │
  │  [retry original request with new token]                        │


ROLE GUARD
──────────

  Request → authenticate middleware
              │
              ├─ No Authorization header  →  401
              ├─ Invalid / expired JWT    →  401
              └─ Valid JWT → req.user = { id, email, role }
                               │
                               ▼
                         requireRole('UPLOADER')
                               │
                               ├─ role !== UPLOADER  →  403
                               └─ role === UPLOADER  →  next()
```

**Token lifetimes:**
- Access token: **15 minutes** (short; limits exposure if stolen)
- Refresh token: **7 days** (stored in PostgreSQL; rotated on every use)

---

## 6. File Upload Flow

The server never touches the file bytes. This is the critical design choice that keeps the backend stateless and tiny.

```
Client (Browser)              Backend (Express)                  AWS S3
      │                              │                              │
      │                              │                              │
  [1] User selects file              │                              │
      │                              │                              │
  [2]─POST /documents/presigned-url─▶│                              │
      │  { filename, fileType,       │                              │
      │    classId, contentType }    │                              │
      │                              │── validate classId in DB     │
      │                              │── generateS3Key()            │
      │                              │   → classes/{class}/{type}/  │
      │                              │     {uuid}-{filename}        │
      │                              │── createPresignedUploadUrl() │
      │                              │   (expires in 300 seconds) ─▶│
      │◀─ { presignedUrl, s3Key } ───│◀─ signed PUT URL ────────────│
      │                              │                              │
  [3] Browser PUT file bytes ────────────────────────────────────▶ │
      │  (direct HTTP PUT to S3,     │                              │
      │   no server involvement)     │                              │◀─ 200 OK
      │                              │                              │
  [4]─POST /documents/save-metadata─▶│                              │
      │  { title, s3Key,             │                              │
      │    fileType, classId }       │                              │
      │                              │── INSERT document in DB      │
      │                              │   (s3Key, s3Url, metadata)   │
      │◀─ 201 { document record } ───│                              │
      │                              │                              │
```

**Why this design:**
- No `multipart/form-data` parsing on the server → zero memory overhead per upload
- Files of any size are supported (S3 handles multi-part automatically for large files)
- The presigned URL has a 5-minute TTL — if the client takes longer, upload fails and metadata is never saved

---

## 7. File Download Flow

```
Client (Browser)              Backend (Express)                  AWS S3
      │                              │                              │
  [1]─GET /documents/:id/download──▶│                              │
      │                              │── SELECT document (not       │
      │                              │   deleted) from DB           │
      │                              │── createPresignedDownloadUrl │
      │                              │   (expires in 300 seconds) ─▶│
      │◀─ { downloadUrl } ───────────│◀─ signed GET URL ────────────│
      │                              │                              │
  [2] Browser fetches file ──────────────────────────────────────▶ │
      │  (direct from S3,            │                              │
      │   no server involvement)     │◀─ file bytes ───────────────│
      │◀─ file bytes ─────────────────────────────────────────────  │
```

---

## 8. Request Lifecycle

Every API request flows through this middleware chain:

```
Incoming HTTP Request
        │
        ▼
  ┌─────────────┐
  │   helmet    │  Security headers (XSS, clickjacking, MIME sniff, etc.)
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │    cors     │  Allow only CLIENT_ORIGIN, credentials: true
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ compression │  gzip response bodies
  └──────┬──────┘
         ▼
  ┌──────────────────┐
  │  express.json    │  Parse JSON body (max 1 MB)
  └──────┬───────────┘
         ▼
  ┌──────────────────┐
  │  globalLimiter   │  500 req / 15 min per IP
  └──────┬───────────┘
         ▼
  ┌──────────────────┐    ┌──────────────────┐
  │  /auth routes    │    │  /classes &       │
  │  + authLimiter   │    │  /documents       │
  │  30 req/15min    │    │  routes           │
  └──────┬───────────┘    └──────┬────────────┘
         │                       │
         ▼                       ▼
  ┌─────────────────────────────────┐
  │   authenticate (if required)    │  jwt.verify → req.user
  └──────────────────┬──────────────┘
                     ▼
  ┌─────────────────────────────────┐
  │   requireRole  (if required)    │  req.user.role check
  └──────────────────┬──────────────┘
                     ▼
  ┌─────────────────────────────────┐
  │   zod validator (in controller) │  Shape & type check req.body
  └──────────────────┬──────────────┘
                     ▼
  ┌─────────────────────────────────┐
  │   Controller logic              │  Prisma queries / S3 calls
  └──────────────────┬──────────────┘
                     ▼
  ┌─────────────────────────────────┐
  │   errorHandler middleware       │  ApiError → JSON { error: msg }
  └─────────────────────────────────┘
```

---

## 9. S3 Storage Structure

```
s3://your-bucket/
└── classes/
    ├── mathematics/
    │   ├── pdf/
    │   │   ├── a1b2c3d4-...-calculus-notes.pdf
    │   │   └── e5f6g7h8-...-linear-algebra.pdf
    │   ├── ppt/
    │   │   └── i9j0k1l2-...-lecture-1.pptx
    │   └── notes/
    │       └── m3n4o5p6-...-handwritten-notes.pdf
    ├── physics/
    │   ├── pdf/
    │   └── ppt/
    └── chemistry/
        └── notes/
```

**Key format:** `classes/{sanitized-class-name}/{file-type}/{uuid}-{sanitized-filename}`

- Class name and filename are lowercased, spaces replaced with `-`
- UUID prefix guarantees uniqueness even if two users upload files with the same name
- Folder structure mirrors the app's navigation hierarchy (class → type)

---

## 10. Frontend Architecture

```
┌────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                     │
│                                                        │
│  Router (React Router v6)                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │  /              → Home (class grid)               │ │
│  │  /class/:id     → ClassDetail (docs + tab filter) │ │
│  │  /dashboard     → Dashboard [UPLOADER only]       │ │
│  │  /admin/users   → AdminUsers [UPLOADER only]      │ │
│  │  /login         → Login                           │ │
│  │  /register      → Register                        │ │
│  │  /*             → redirect /                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  Global State (Zustand — authStore)                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │  user: { id, name, email, role }                  │ │
│  │  accessToken: string | null                       │ │
│  │  refreshToken: string | null                      │ │
│  │  ─────────────────────────────────────────────── │ │
│  │  login(email, password)                           │ │
│  │  register(name, email, password, role)            │ │
│  │  logout()  →  POST /auth/logout + clear storage   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  HTTP Layer (axios — api.js)                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Request interceptor: attach Bearer token         │ │
│  │  Response interceptor:                            │ │
│  │    on 401 → POST /auth/refresh                    │ │
│  │          → queue concurrent failed requests       │ │
│  │          → retry all with new token               │ │
│  │          → if refresh fails → auth:logout event   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  Token Persistence: localStorage                       │
│  (accessToken, refreshToken, user JSON)                │
└────────────────────────────────────────────────────────┘
```

**Route protection:**

```
RequireUploader wrapper:
  user == null  →  redirect /login
  user.role !== UPLOADER  →  redirect /
  otherwise  →  render children
```

---

## 11. Deployment Architecture

### Production (docker-compose.yml)

```
                        Internet
                            │
                            ▼ :80
              ┌─────────────────────────────┐
              │     nginx (frontend)         │
              │     Docker container         │
              │                             │
              │  /api/*  ─────────────────┐ │
              │  /*  → index.html (SPA)   │ │
              └───────────────────────────┼─┘
                                          │ proxy_pass :4000
                                          ▼
              ┌─────────────────────────────┐
              │   Express (backend)          │
              │   Docker container           │
              │   port 4000                  │
              │                             │
              │   ENV from .env.production  │
              │                             │
              │   On startup:               │
              │   1. prisma migrate deploy  │
              │   2. node prisma/seed.js    │
              │   3. node src/server.js     │
              └──────────────┬──────────────┘
                             │ DATABASE_URL
                             ▼
              ┌─────────────────────────────┐
              │   PostgreSQL (external)      │
              │   e.g. AWS RDS / Supabase    │
              └─────────────────────────────┘

              + AWS S3 (external, accessed via SDK)
```

### Development (docker-compose.dev.yml)

```
Developer machine
  │
  ├── npm run dev (frontend)  → Vite dev server :5173
  ├── npm run dev (backend)   → nodemon :4000
  ├── postgres container      → :5433  (mapped from 5432)
  └── pgadmin container       → :5050
```

### Build Pipeline

```
Frontend Docker build (multi-stage):
  Stage 1: node:20-alpine
    npm ci
    npm run build  →  /app/dist

  Stage 2: nginx:alpine
    COPY dist → /usr/share/nginx/html
    COPY nginx.conf → /etc/nginx/conf.d/default.conf

Backend Docker build:
  node:20-alpine
    apk add openssl  (required by Prisma)
    npm ci --omit=dev
    npx prisma generate
    COPY src
    CMD: migrate → seed → start
```

---

## 12. Security Model

| Layer | Mechanism | Detail |
|---|---|---|
| Transport | HTTPS (handled at infra layer) | nginx / load balancer terminates TLS |
| Headers | helmet.js | CSP, X-Frame-Options, X-Content-Type-Options, HSTS |
| CORS | Exact origin match | Only `CLIENT_ORIGIN` env var is allowed |
| Auth | JWT (RS256-equivalent: HS256 with long secret) | Access 15m, Refresh 7d |
| Token storage | localStorage | Access + refresh tokens; refresh stored server-side for revocation |
| Refresh rotation | Delete old, issue new on every refresh | Stolen refresh tokens are single-use |
| Password hashing | bcrypt, cost factor 12 | ~250ms hash time, brute-force resistant |
| Input validation | Zod schemas | All request bodies validated before hitting the DB |
| Rate limiting | express-rate-limit | Global 500/15min, /auth 30/15min |
| S3 access | Presigned URLs (5-min TTL) | No public bucket policy needed; files served privately |
| S3 deletion | Handles versioned buckets | Deletes all versions + delete markers explicitly |
| Role enforcement | requireRole middleware | UPLOADER gate on all mutation endpoints |
| Ownership check | `uploaderId === req.user.id` | Only the uploader can delete their own document |
| Body size limit | 1 MB JSON limit | Prevents large payload DoS against the API |

---

## 13. Capacity & Traffic Analysis

### Assumptions (based on target: 400–600 users)

| Parameter | Value |
|---|---|
| Total registered users | 600 |
| Daily active users (DAU) | ~150 (25%) |
| Peak concurrent users | ~30–50 |
| Avg requests per active session | 15–20 |
| Avg daily API requests | ~2,500–3,000 |
| Peak requests per minute | ~20–40 |
| Avg document size | 5 MB |
| Uploads per day | ~20–40 |

### Rate Limit Headroom

```
Global limiter: 500 req / 15 min per IP
  Peak load: ~40 req/min = 600 req/15 min for the busiest IP
  → Single power user could hit the limit; typical user (~3 req/min) is safe

Auth limiter: 30 req / 15 min per IP
  Login attempts: well within limits for legitimate use
  → Protects against credential stuffing / brute force
```

### Express Backend Capacity

Node.js runs single-threaded but is non-blocking I/O — it handles concurrency through the event loop.

```
Typical API response times:
  GET /classes            ~5–15 ms    (simple DB query)
  GET /documents          ~10–30 ms   (DB query + mapping)
  POST /auth/login        ~260 ms     (bcrypt dominates)
  POST /documents/presigned-url  ~80–150 ms  (DB + S3 SDK call)

Event loop capacity (rough):
  At 260 ms per login, Express can handle ~4 concurrent logins/sec
  At 20 ms per list, Express can handle ~50 concurrent list req/sec

For 400–600 users:
  Peak concurrent API calls: ~30–50
  All within single-process Node.js capacity with room to spare
```

### PostgreSQL Capacity

```
Connection pooling: Prisma default pool (10 connections)
Queries per request: 1–3 simple indexed lookups
Expected QPS: < 50 at peak

PostgreSQL comfortably handles 1,000+ QPS on modest hardware.
For this load, a single db.t3.micro (2 vCPU, 1 GB) on RDS is sufficient.
```

### AWS S3 Capacity

S3 has essentially unlimited storage and throughput. For this scale:

```
Upload bandwidth:   40 files/day × 5 MB = 200 MB/day
Download bandwidth: 150 DAU × 2 downloads × 5 MB = 1.5 GB/day
Storage growth:     ~200 MB/day → ~6 GB/month
Monthly S3 cost estimate at this scale: < $2/month
```

### Summary Table

| Resource | Current Capacity | Usage at 600 users | Headroom |
|---|---|---|---|
| Express (single process) | ~200 req/sec (non-auth) | ~3 req/sec peak | **66×** |
| Auth endpoint | ~4 logins/sec | < 1/sec | **4×** |
| PostgreSQL | 1,000+ QPS | < 50 QPS | **20×** |
| S3 throughput | Unlimited | ~40 uploads/day | Unlimited |
| Rate limiter (global) | 500/15min/IP | ~40/15min/IP | **12×** |

**Conclusion:** The current single-server deployment comfortably handles 400–600 users. It would begin to show strain above approximately 5,000 concurrent users without changes.

---

## 14. Bottlenecks & Scaling Path

### Current Bottlenecks

| Bottleneck | Why | Threshold |
|---|---|---|
| `bcrypt` (cost=12) | CPU-blocking ~250ms per login | ~4 concurrent logins/sec per process |
| Single Node.js process | No multi-core use | ~200 req/sec before event loop lag |
| Single PostgreSQL instance | No read replicas | ~1,000 QPS |
| No CDN for static assets | All static files served from one nginx | Higher latency for distant users |

### Scaling Path (when needed)

```
Stage 1 — 600 → 5,000 users (minimal changes)
─────────────────────────────────────────────
  ✓ Enable Node.js cluster mode (use all CPU cores)
    → 4-core server: 4× throughput, 4× bcrypt capacity
  ✓ Add Redis for rate limiting (share state across processes)
  ✓ Add CloudFront CDN in front of S3 for downloads
    → Lower S3 bandwidth costs, lower latency

Stage 2 — 5,000 → 50,000 users
────────────────────────────────
  ✓ Run multiple backend containers behind a load balancer
  ✓ PostgreSQL read replicas for GET-heavy endpoints
  ✓ Prisma connection pooling via PgBouncer
  ✓ Add Redis for session/auth caching to reduce DB reads

Stage 3 — 50,000+ users
─────────────────────────
  ✓ Separate auth service (dedicated process for bcrypt)
  ✓ Message queue (SQS/BullMQ) for post-upload processing
    (thumbnails, virus scan, metadata extraction)
  ✓ CDN for frontend assets (CloudFront / Cloudflare)
  ✓ Horizontal auto-scaling (ECS / Kubernetes)
```

### What Does NOT Need to Scale

- **S3** — infinitely scalable by design
- **Presigned URL pattern** — stateless, no server bottleneck for file bytes
- **PostgreSQL schema** — UUIDs, soft deletes, and indexed foreign keys are already production-grade
- **JWT auth** — stateless access tokens, no DB hit on every request

---

*Generated: May 2026*
