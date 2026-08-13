# AI Code Generation Instructions

# Cloud-Based File Distribution System (CBFDS)

**Version:** 1.0  
**Date:** August 5, 2026  
**Status:** Mandatory Reference for Implementation Phase  
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, OpenAPI v1.0, UIUX v1.0, ADR Register v1.0  

---

## 1. Global Architectural Directives

All generated code must adhere strictly to **Clean Architecture** and **SOLID** design principles. Layer boundaries must be maintained without exception.

### 1.1 Inward-Only Dependency Rule
Code in inner layers must never import or depend on code in outer layers:
- **Entities/Models** (`server/src/models/`): Core data structures. No imports from repositories, services, or controllers.
- **Repositories & Providers** (`server/src/repositories/`, `server/src/providers/`): Implement database and third-party interfaces. No imports from services or controllers.
- **Services** (`server/src/services/`): Business logic. Depends only on models and interfaces. May import repositories/providers. No imports from controllers or middleware.
- **Controllers** (`server/src/controllers/`): Parse requests and delegate to services. No imports from databases or direct third-party SDK calls.
- **Routes & Middleware** (`server/src/routes/`, `server/src/middleware/`): Outer HTTP layer. Imports controllers and middleware configurations.

```
[ Routes / Middleware ]
       │
       ▼
 [ Controllers ]
       │
       ▼
  [ Services ]
   │        │
   ▼        ▼
[ Repos ] [ Providers ]
   │        │
   ▼        ▼
  [ Domain Models ]
```

---

## 2. Directory Structure Validation

Verify that every new file is created in its designated location according to this schema. Do not deviate.

```
cbfds/
├── docker-compose.yml
├── .env.example
├── client/                         # React Frontend (Vite)
│   ├── src/
│   │   ├── components/             # Reusable UI widgets
│   │   ├── contexts/               # Global state (Auth, Notifications)
│   │   ├── hooks/                  # Custom hooks (e.g. useUpload, useFiles)
│   │   ├── pages/                  # Page route components
│   │   └── services/               # Axios backend callers
└── server/                         # Express Backend
    ├── src/
    │   ├── config/                 # Redis, DB, and environment loaders
    │   ├── controllers/            # Request handlers
    │   ├── middleware/             # Auth, validation, error handlers
    │   ├── models/                 # Mongoose schema definitions
    │   ├── repositories/           # Mongoose DB queries
    │   ├── services/               # Core business logic workflows
    │   ├── providers/              # Strategy adapters (Storage, Email)
    │   ├── utils/                  # Helper utilities (hash, logger)
    │   └── app.js                  # Entry Composition Root
```

---

## 3. Database & Mongoose Coding Rules

When generating Mongoose database models:
1. **No direct DB calls in Services:** All queries must route through repository files (e.g., `userRepository.js`).
2. **Schema Validation:** Define strict type validations, enum lists, and custom regex constraints on schemas as detailed in DDD §3.
3. **Password Security:** Register the `pre('save')` hook on the `User` schema to hash password strings automatically using `bcrypt` (factor 12) if modified.
4. **Zero-Padding Formatting:** Chunk naming conventions must enforce 4-digit zero-padded numbers:
   ```javascript
   const padChunkNumber = (num) => String(num).padStart(4, '0');
   // Output example: "0000", "0001", "1023"
   ```
5. **Atomic Operations:** Incremental updates (e.g., `storageUsed`, `activeOperations`) must use atomic operators (`$inc`) to prevent concurrency errors.

---

## 4. API & Routing Coding Rules

When writing Express routes and controllers:
1. **API Versioning:** Prepend all routes with `/api/v1/`.
2. **Route Middleware Order:** Enforce the following stack order:
   ```javascript
   router.post('/path', rateLimiter, authenticate, rbac('admin'), validate(dtoSchema), controller.handle);
   ```
3. **Centralized Error Handling:** Never send manual error JSON payloads in controllers. Always catch errors in a try-catch block and delegate them to the next middleware:
   ```javascript
   try {
     const result = await this.service.execute(req.body);
     return res.status(200).json({ success: true, data: result });
   } catch (err) {
     next(err); // delegates to centralized errorHandler.js
   }
   ```
4. **Operational Errors:** Throw instances of `AppError` subclasses (e.g., `ValidationError`, `QuotaExceededError`) with explicit error codes mapped in Appendix C of the SRS.

---

## 5. Security Guardrails

The following controls must be explicitly implemented in code files:
1. **Rate Limiting:** Protect registration, login, and forgot-password routes using `express-rate-limit` with the exact limits specified in the OAS.
2. **File Validation:** Implement a utility validation helper that parses uploads using extension whitelist checks, MIME type matchers, and magic bytes verification. Reject files failing any check.
3. **NoSQL Injection:** Wrap request parameters in `mongo-sanitize` before query construction.
4. **Token Security:** Access tokens must never be sent in cookies or saved in LocalStorage. They must only exist in active application memory.

---

## 6. Background Processing & Jobs

1. **BullMQ Queues:** Background workers must be instantiated with a single Redis connection. Keep worker files isolated in `server/src/providers/queue/workers/`.
2. **Payload Safety:** Do not pass binary streams or file buffers through BullMQ payloads. Pass only document pointers (e.g., `{ fileId, userId, filePath }`).
3. **Idempotency:** Implement state checks at the start of job executions:
   ```javascript
   const file = await fileRepository.findById(fileId);
   if (file.status !== 'PROCESSING') return; // Prevents processing loop duplicates
   ```

---

## 7. Testing Guidelines

Each module must include adjacent tests:
1. **Unit Tests (`npm run test:unit`):** Mock all external repositories and storage strategies. Test service logic outputs.
2. **Integration Tests (`npm run test:integration`):** Start an Express instance with a MongoDB memory server (`mongodb-memory-server`) to verify route status codes.
3. **E2E Tests (`npm run test:e2e`):** Automate login -> file upload -> download validation flows using supertest.

---

*End of AI Instructions — CBFDS v1.0*
