# Task Orchestrator

Enterprise-grade AI-powered task management system built with NestJS.

A production-ready backend featuring clean architecture, a full repository pattern, performant caching strategies, and an extensible AI integration layer.

## Highlights

- JWT authentication with access and refresh tokens
- **Repository Pattern** decoupling services from any specific ORM or database
- Redis-backed caching strategy for high-read workloads
- Modular architecture following SOLID and Clean Architecture principles
- Global exception handling and consistent API response transformation
- Extensible AI service layer designed for seamless LLM integration (OpenAI, Grok, Claude, etc.)
- Fully containerized development environment with PostgreSQL and Redis
- OpenAPI documentation with Swagger
- 100% TypeScript strict typing across all layers

## Tech Stack

- **Framework**: NestJS + TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM (Neon in production)
- **Cache**: Redis (Upstash in production)
- **Security**: JWT + bcrypt
- **Validation**: class-validator + DTOs
- **Documentation**: Swagger/OpenAPI
- **Architecture**: Modular, Clean Architecture, Repository Pattern
- **CI/CD**: GitHub Actions + Render (Docker-based deploy)

## Project Structure

```bash
src/
├── common/
│   ├── filters/           # Global exception handling (AllExceptionsFilter)
│   ├── interceptors/      # Response transformation (TransformInterceptor<T>)
│   ├── redis/             # Redis service & caching
│   └── types/             # Shared TypeScript types (JwtUser, AuthenticatedRequest)
├── auth/
│   ├── dto/
│   ├── guards/
│   ├── repositories/      # UserRepository (abstract) + PrismaUserRepository
│   └── strategies/
├── tasks/
│   ├── dto/
│   ├── repositories/      # TaskRepository (abstract) + PrismaTaskRepository
│   └── ai.service.ts      # AI categorization layer
├── prisma/
├── app.module.ts
└── main.ts
```

## Repository Pattern

Services depend on abstract repository classes, not on Prisma directly. This:

1. **Decouples** business logic from the persistence layer.
2. **Enables testability** — unit tests mock the abstract class, not the ORM.
3. **Supports extensibility** — swap `PrismaUserRepository` for any other implementation with zero service changes.

```
Controller → Service → TaskRepository (abstract)
                              ↑
                    PrismaTaskRepository (concrete, injected via DI)
```

### Registration

Repositories are bound in each feature module using NestJS DI:

```typescript
// tasks.module.ts
providers: [
  TasksService,
  { provide: TaskRepository, useClass: PrismaTaskRepository },
]
```

## API Response Envelope

All responses are wrapped by `TransformInterceptor<T>`:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-04-12T00:00:00.000Z"
}
```

Error responses from `AllExceptionsFilter`:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Task with ID xyz not found",
  "timestamp": "2026-04-12T00:00:00.000Z"
}
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure services
docker compose up -d

# 3. Configure environment variables
cp .env.example .env

# 4. Database setup
npx prisma generate
npx prisma migrate dev --name init

# 5. Start development server
npm run start:dev
```

The application will be available at `http://localhost:3000` with interactive Swagger documentation at `/api`.

## Development Commands

```bash
npm run docker:up          # Start PostgreSQL and Redis
npm run prisma:studio      # Open Prisma Studio
npx prisma migrate dev     # Run migrations
npm run db:test:setup      # Setup test database
npm run build              # Production build

# Code quality
npm run lint               # ESLint check (fails on any warning)
npm run lint:fix           # ESLint with auto-fix
npm run format             # Format source files with Prettier
npm run format:check       # Check formatting without writing
```

## Architecture & Design Decisions

- **Repository Pattern** — abstract classes as contracts allow services to be independent of any ORM. Concrete implementations (`PrismaUserRepository`, `PrismaTaskRepository`) are bound at module level.
- **Layered Architecture** with strict dependency inversion: controllers → services → repositories.
- **Caching Strategy** using Redis as primary source for frequent reads. Cache is invalidated on every write operation (`create`, `update`, `delete`).
- **Cross-cutting Concerns** implemented via global `AllExceptionsFilter` and generic `TransformInterceptor<T>`.
- **AI Abstraction Layer** built as a replaceable service, ready for production LLM providers.
- **Fully typed** — no `any` usage; all services, controllers, repositories, guards and strategies have explicit TypeScript types.

## Testing

Comprehensive test suite covering unit and integration levels.

### Unit Tests

```bash
npm run test:unit   # Run unit tests
npm run test:cov    # Generate coverage report
```

**Covered:**
- `AuthService` — registration, login, hashing, error cases (mocks `UserRepository`)
- `TasksService` — CRUD, cache hit/miss, AI categorization, invalidation (mocks `TaskRepository`)
- `AiService` — categorization logic with multiple keyword scenarios

### End-to-End Tests

```bash
npm run test:e2e   # Run e2e tests (uses dedicated test database)
```

**Covered:**
- Full auth flow: register, login, duplicate email, invalid credentials, validation
- Response envelope (`{ success, data, timestamp }`)

### Test Stack

- **Jest** + **Supertest**
- Dedicated test database (`TEST_DATABASE_URL`)
- Repository mocks — services are fully isolated from Prisma in unit tests

## CI/CD

Automated pipeline powered by **GitHub Actions** with a strict gate before deployment.

### Pipeline Overview

```
PR / push to main
        │
        ▼
┌─────────────────── CI workflow ───────────────────┐
│  lint ──┐                                         │
│         ├─► build ──► test-unit                   │
│  prisma─┤                                         │
│  validate└─► test-e2e (Postgres + Redis services) │
└───────────────────────────────────────────────────┘
        │ (only if ALL jobs pass AND branch = main)
        ▼
┌──────────── Deploy workflow ─────────────┐
│  Trigger Render deploy via REST API      │
│  Poll deploy status until live / fail    │
└──────────────────────────────────────────┘
```

### Gates that block deployment

If **any** of the following fails, the deploy is skipped and GitHub sends an automatic failure email + red check on the commit:

- `npm run lint` (ESLint, `--max-warnings=0`)
- `npx prisma validate` + `npx prisma format --check`
- `npm run build` (Nest build)
- Unit tests (all `*.spec.ts`, with coverage)
- E2E tests (`*.e2e-spec.ts` against real Postgres + Redis)

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Purpose |
|---|---|
| `RENDER_API_KEY` | Render API key (Account Settings → API Keys) |
| `RENDER_SERVICE_ID` | The `srv-xxxxxxxxxxxx` id of your Web Service on Render |

Optionally, add a repository **variable** (not a secret) `RENDER_SERVICE_URL` with the public URL of the service so it shows up in the GitHub Environments UI.

### Required Render Environment Variables

Set these in the **Render service dashboard → Environment**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (ends in `-pooler`) |
| `REDIS_HOST` | Upstash endpoint hostname (e.g. `xxx.upstash.io`) |
| `REDIS_PORT` | `6379` |
| `REDIS_PASSWORD` | Upstash database password |
| `REDIS_TLS` | `true` (Upstash requires TLS) |
| `REDIS_TTL` | `3600` |
| `JWT_SECRET` | Strong secret (e.g. `openssl rand -base64 48`) |
| `JWT_ACCESS_EXPIRATION` | `15m` |
| `JWT_REFRESH_EXPIRATION` | `7d` |
| `NODE_ENV` | `production` |

### One-time Render setup

1. Create a new **Web Service** on Render pointing to this GitHub repo.
2. Choose runtime **Docker** → Render will auto-detect the `Dockerfile`.
3. **Disable Auto-Deploy** in Settings → Build & Deploy → *Auto-Deploy: No*. This is critical: deploys must only happen after the CI gate passes via our GitHub Actions workflow, never directly on push.
4. Add the environment variables listed above.
5. Copy the service id (`srv-...`) from the URL and create a Render API key, then set them as GitHub Secrets.

### Branch Protection

The `main` branch is protected by a GitHub Ruleset enforcing:

- Pull request required before merging
- All CI status checks (`Lint`, `Prisma Validate`, `Build`, `Unit Tests`, `E2E Tests`) must pass
- Linear history (no merge commits)
- Force pushes and direct pushes to `main` are blocked
- Conversation resolution required before merging

### Docker

Production image built from a multi-stage `Dockerfile` (non-root user, minimal Alpine runner, Prisma client generated at build time).

```bash
# Local test of the production image
docker build -t task-orchestrator .
docker run --rm -p 3000:3000 --env-file .env task-orchestrator
```

### Notifications on failure

No extra setup needed: GitHub sends automatic emails to the commit author and the PR author when any workflow run fails, plus a red status check on the commit/PR.

---

Focus on clean architecture, testability, and maintainability.
