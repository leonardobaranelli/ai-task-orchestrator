# AI Task Orchestrator

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
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Security**: JWT + bcrypt
- **Validation**: class-validator + DTOs
- **Documentation**: Swagger/OpenAPI
- **Architecture**: Modular, Clean Architecture, Repository Pattern

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

---

Focus on clean architecture, testability, and maintainability.
