

# 📌 task.md — Kanban Project Management System (Next.js Full Stack)

> Tech: Next.js (App Router), Prisma + Postgres (Supabase), JWT Auth, Docker, Nginx
> Goal: Production-ready Kanban with auditability, timings, RBAC, and performance

---

## STEP 1 — Architecture & Repo Setup (No coding yet)

**Goal:** Avoid spaghetti architecture later.

### Tasks

* [x] Decide architecture

  * Frontend: Next.js App Router
  * Backend: Next.js API Routes 
  * DB: Postgres (Supabase)
  * ORM: Prisma
  * Auth: JWT (Access + Refresh tokens)
 

* [x] Create monorepo

```bash
npx create-next-app@latest pms
cd pms
```

* [x] Setup env

```bash
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

* [x] Add Prisma

```bash
npm i prisma @prisma/client
npx prisma init
```

* [x] Setup ESLint

---

## STEP 2 — Database Design (This decides 80% of your success)

**Goal:** Clean relational model with auditability.

### Schema

* [ ] User
* [ ] Project
* [ ] Column
* [ ] Card
* [ ] Label
* [ ] Priority
* [ ] CardMovementLog
* [ ] ProjectMembership
* [ ] RefreshToken
* [ ] AuditLog

### Must-have Fields

* Card:

  * id
  * name
  * description
  * assigneeId
  * projectId
  * columnId
  * createdAt
  * closedAt
  * status (open/closed)

* CardMovementLog:

  * cardId
  * fromColumnId
  * toColumnId
  * movedAt

* Column:

  * order
  * projectId

* Label:

  * name
  * color
  * projectId

* Priority:

  * name (High, Medium, Low)
  * weight
  * projectId

### Tasks

* [x] Design Prisma schema
* [x] Add indexes on:

  * card.projectId
  * card.columnId
  * card.assigneeId
* [x] Migrate DB

---

## STEP 3 — Authentication (JWT + Refresh Token, no shortcuts)

**Goal:** Production-grade auth, not tutorial-level garbage.

### Tasks

* [x] User signup/login
* [x] Password hashing (bcrypt)
* [x] JWT access token (15 min expiry)
* [x] JWT refresh token (7 days)
* [x] Refresh token rotation
* [x] Store refresh tokens in DB (not localStorage)
* [x] Protect API routes with middleware
* [x] Role-based access (ADMIN, MEMBER)

---

## STEP 4 — RBAC & Admin Panel

**Goal:** Admin-only project control.

### Tasks

* [x] Admin can:

  * Create project
  * Create columns per project
  * Create labels per project
  * Create priorities per project
  * Invite users
* [x] Member can:

  * View project
  * Create/move cards (Implementation in progress via next steps)
* [x] Enforce permissions in API layer (not frontend)

---

## STEP 5 — Project & Board Core APIs

**Goal:** Clean REST-like APIs

### APIs

* [x] POST /api/projects
* [x] GET /api/projects
* [x] GET /api/projects/:id
* [x] POST /api/projects/:id/columns
* [x] POST /api/projects/:id/labels
* [x] POST /api/projects/:id/priorities
* [x] GET /api/projects/:id/board

---

## STEP 6 — Card CRUD + Movement Tracking

**Goal:** Movement must be logged, not guessed later.

### Tasks

* [x] Create card with:

  * name
  * description
  * assignee
  * label
  * priority
* [x] Drag and drop between columns
* [x] On every move:

  * Insert into CardMovementLog
* [x] Prevent invalid transitions (optional rules)

---

## STEP 7 — Time Tracking Logic (Critical Part)

**Goal:** Accurate time per column + total time

### Logic (Non-negotiable)

* Time in column =
  `nextMoveTime - currentMoveTime`
* Total time =
  Sum of all column durations

### Tasks

* [x] API: GET /api/cards/:id/timeline
* [x] Compute:

  * Time spent in each column
  * Total lifecycle time
* [x] Project start time = first card created
* [x] Project end time = when all cards closed

---

## STEP 8 — Frontend (Board + Admin Panel)

**Goal:** Not ugly, not fragile.

### Tasks

* [x] Login / Register UI
* [x] Admin dashboard
* [x] Project list
* [x] Kanban board (drag & drop)
* [x] Card modal (edit details + time/timeline)
* [x] Column settings (admin) (Rename/Delete)
* [x] Label & Priority support
* [x] Environment-based Base URL

  * Time per column
  * Total time per card
* [x] Project duration stats (Implemented via ProjectStatsModal)

---

## STEP 9 — Validation, Security, Hardening

**Goal:** No stupid vulnerabilities.

### Tasks

* [x] Zod validation for all major APIs
* [x] Rate limit auth APIs (Middleware based)
* [x] CSRF protection (SameSite: Strict + Bearer Token)
* [x] Secure cookies for refresh token
* [x] Security headers (Middleware based)
* [x] CORS strict allowlist (Implemented in middleware)
* [x] Input sanitization (Via Zod)
* [x] SQL injection safe via Prisma
* [x] Project-scoped RBAC enforcement
* [x] Secure cookie parsing (via NextRequest.cookies)

---

## STEP 10 — Performance & Scale Readiness

**Goal:** Won’t die when 50 users hit it.

### Tasks

* [x] Index heavy query fields
* [x] Pagination for cards/projects
* [ ] Caching (Redis optional)
* [x] Board API optimized query (single query)
* [x] Avoid N+1 Prisma queries

---

## STEP 11 — Audit Logs & Observability

**Goal:** Debuggable in production.

### Tasks

* [x] Log:

  * Card moved
  * Card created
  * Project created
* [ ] Error logging
* [ ] Request tracing
* [x] Health endpoint `/health`

---

## STEP 12 — Docker, Nginx, CI/CD

**Goal:** Deploy like a real product.

### Tasks

* [ ] Dockerfile (multi-stage build)
* [ ] docker-compose (prod + test)
* [ ] Nginx reverse proxy
* [ ] Env separation
* [ ] CI pipeline:

  * lint
  * test
  * build
* [ ] Zero-downtime deploy (blue/green optional)

---

## STEP 13 — Final Production Checklist

* [ ] Auth works
* [ ] RBAC enforced
* [ ] Card movement tracked
* [ ] Time calculation verified
* [ ] Admin-only project config
* [ ] DB indexed
* [ ] Dockerized
* [ ] Nginx HTTPS
* [ ] Secrets not in repo
* [ ] Logs enabled
* [ ] Stress tested

---

## Hard Truths (Read This)

❌ Don’t store time spent in DB directly
→ It becomes wrong when card moves multiple times.

❌ Don’t calculate time on frontend
→ It must be backend-verified.

❌ Don’t trust role from JWT only
→ Validate role from DB per request.

❌ Don’t skip CardMovementLog
→ Without it, your time metrics are fake.

---

## Next Step (Actionable)

