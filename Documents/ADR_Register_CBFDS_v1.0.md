# Architectural Decision Records (ADR) Register

# Cloud-Based File Distribution System (CBFDS)

**Version:** 1.0  
**Date:** August 5, 2026  
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, OpenAPI v1.0, UIUX v1.0, Graph Memory v1.0  

---

## ADR-001: Clean Architecture with Repository Pattern

- **Status:** Approved
- **Context:** The system needs high maintainability, testability, and decoupling between core business logic and external infrastructure (databases, networks, storage frameworks).
- **Decision:** Implement a layered Clean Architecture structure. The application core contains domain business rules and entity specifications. Outward layers define data access operations via interfaces (IFileRepository, IUserRepository) resolved in the repository tier.
- **Alternatives Considered:**
  - *Active Record Pattern:* High coupling between database models and business logic. Impedes database swapping.
  - *Transaction Script:* Easy for small projects, but business rules quickly become tangled and duplicate as requirements scale.
- **Consequences:**
  - *Positive:* High unit testability; infrastructure components (Mongoose, Express) can be mocked or modified without altering core workflows.
  - *Negative:* Boilerplate code overhead increases (requires dedicated controllers, DTOs, services, and repositories per entity).

---

## ADR-002: Strategy Pattern for Storage Provider Abstraction

- **Status:** Approved
- **Context:** The system must run on local MinIO containers during development and seamlessly switch to cloud object stores (AWS S3, Azure Blob, GCS) in production.
- **Decision:** Wrap all object actions inside an `IStorageProvider` interface. Use the Strategy Pattern to dynamically resolve the active provider at startup via a creational factory pattern driven by configuration variables.
- **Alternatives Considered:**
  - *Direct SDK Integration:* Call MinIO or S3 methods directly in service files. High coupling to specific vendor libraries, requiring code changes to swap providers.
- **Consequences:**
  - *Positive:* zero changes required in application core files when switching storage targets (MinIO to S3).
  - *Negative:* Only exposes operations common across all providers; advanced provider-specific features (e.g. S3-specific bucket lifecycle hooks) are hidden.

---

## ADR-003: tus Protocol for Resumable Uploads

- **Status:** Approved
- **Context:** Large file uploads (up to 5 GB) are vulnerable to network disconnects. Resuming from point of failure without losing uploaded data is mandatory.
- **Decision:** Implement the open-standard **tus protocol** for upload management on both client (`tus-js-client`) and server (`tus-node-server` integrated as Express middleware).
- **Alternatives Considered:**
  - *Custom Chunk Upload Tracker:* Develop a custom API tracking chunk indices. High implementation overhead and risk of client-server synchronization errors.
  - *S3 Multipart Direct:* Stream parts directly to S3. High bandwidth costs on failure and vendor-locking.
- **Consequences:**
  - *Positive:* Standardized, battle-tested resumable upload logic. Handles pause, automatic retry, offset query, and cancellation.
  - *Negative:* Adds dependency on `tus` protocol libraries; requires configuring separate temp storage folders for the tus server.

---

## ADR-004: BullMQ + Redis for Background Job Processing

- **Status:** Approved
- **Context:** Heavy file operations (chunking, checksum generation, deletion, data purging) block the event loop if executed within HTTP request/response cycles.
- **Decision:** Deploy a Redis-backed job queue running on **BullMQ**. API handlers validate request context and immediately queue work parameters, returning a quick status response to the user. Workers process tasks asynchronously.
- **Alternatives Considered:**
  - *Inline Processing:* Split files directly in controllers. Causes API server thread blocking and timeouts on large files.
  - *RabbitMQ/Kafka:* Dedicated message brokers. Overkill for this application scale; increases operational complexity.
- **Consequences:**
  - *Positive:* Keeps API server responsive; provides job retry logic, priority scheduling, and dead-letter queues out of the box.
  - *Negative:* Adds Redis runtime dependency. Requires managing asynchronous job success/failure notifications to clients via in-app notifications.

---

## ADR-005: JWT with Refresh Token Rotation for Authentication

- **Status:** Approved
- **Context:** User authentication must be secure and stateless to support horizontal scaling, while providing token theft detection and session revocation.
- **Decision:** Use JWT access tokens (15-minute TTL) for API authorization. Issue opaque refresh tokens (7-day TTL) stored as SHA-256 hashes in MongoDB. Enable refresh token rotation: each refresh call invalidates the old token and issues a new pair.
- **Alternatives Considered:**
  - *Stateful Sessions:* Store sessions in Redis/Express-session. Requires checking database/cache on every single request, increasing database load.
- **Consequences:**
  - *Positive:* Fast local verification of JWTs. Rotation detects token theft (reuse of a rotated token invalidates all sessions for that user).
  - *Negative:* Database hit is required during token refresh cycles to track rotation.

---

## ADR-006: 5 MB Default Chunk Size

- **Status:** Approved
- **Context:** File chunking must balance performance (upload speeds, metadata DB entry size) against reliability (chunk checksum computation times).
- **Decision:** Establish default chunk size at 5 MB (5,242,880 bytes).
- **Alternatives Considered:**
  - *1 MB Chunks:* Increases database metadata overhead (5 GB file = 5,000 chunks).
  - *100 MB Chunks:* Increases server memory usage and probability of chunk upload failure.
- **Consequences:**
  - *Positive:* Ideal balance; 5 GB file uses 1,024 chunks, which fits within database index thresholds.
  - *Negative:* Admin configurations can change this default, requiring validation logic for legacy file configurations.

---

## ADR-007: Sequential Chunk Retrieval for Downloads

- **Status:** Approved
- **Context:** Reconstructing files during download must avoid server memory exhaustion when processing concurrent downloads.
- **Decision:** Stream chunks sequentially from the storage provider, verify their checksums, and pipe them directly into the HTTP response object one by one.
- **Alternatives Considered:**
  - *Parallel Chunk Download:* Fetch all chunks concurrently to a buffer, merge, and send. High memory consumption; concurrently processing multiple downloads easily exhausts server RAM.
- **Consequences:**
  - *Positive:* Memory usage per download is limited to at most 2 × chunk size (10 MB), preventing out-of-memory crashes.
  - *Negative:* Download speed is bound to sequential network roundtrips to the storage provider.

---

## ADR-008: Manual Dependency Injection

- **Status:** Approved
- **Context:** Clean architecture requires injecting dependencies (Repositories, Services) to decouple layers.
- **Decision:** Implement manual dependency injection within a central Composition Root (`app.js`).
- **Alternatives Considered:**
  - *DI Containers (InversifyJS, TypeDI):* Adds complex metadata decorators and TypeScript configuration overhead.
  - *Global Imports:* Directly import repositories inside services. Destroys testability by preventing mock injection.
- **Consequences:**
  - *Positive:* Clear dependency graph; zero performance overhead; simplified unit test setup.
  - *Negative:* Composition root requires manual boilerplate additions whenever a new service or repository is created.

---

## ADR-009: Modular Monolith Architecture

- **Status:** Approved
- **Context:** The system needs structural isolation for future scaling without the operational complexity of distributed systems.
- **Decision:** Package the project as a Modular Monolith. Ensure distinct module boundaries (Auth, Files, Shares, Notifications) interacting via clear service contracts.
- **Alternatives Considered:**
  - *Microservices:* Independent deployments. Introduces network latency, distributed transaction complexity, and high infrastructure overhead.
- **Consequences:**
  - *Positive:* Single repository and deployment unit; simple local setup; easy refactoring.
  - *Negative:* Shared database resources can cause resource contention if one module goes rogue (mitigated by strict index patterns).

---

## ADR-010: In-Memory Access Token Storage on Client

- **Status:** Approved
- **Context:** Access tokens must be stored securely on the client to prevent Cross-Site Scripting (XSS) extraction.
- **Decision:** Keep access tokens in client memory (JavaScript runtime state). Store refresh tokens in an HTTP-only, secure, SameSite cookie (or memory with fallback).
- **Alternatives Considered:**
  - *LocalStorage:* Susceptible to XSS attacks; any running malicious script can extract tokens.
- **Consequences:**
  - *Positive:* Eliminates access token vulnerability to standard XSS extraction.
  - *Negative:* Access token is lost on page refresh/tab duplication, requiring an silent refresh call to restore state.

---

## ADR-011: MongoDB TTL Indexes for Automatic Expiration

- **Status:** Approved
- **Context:** Expired shares, notification histories, and old password-reset OTP records must be cleaned up to prevent database bloat.
- **Decision:** Deploy MongoDB TTL (Time to Live) indexes on `expiresAt` or `createdAt` fields in collections `otps`, `shares`, `notifications`, and `refreshTokens`.
- **Alternatives Considered:**
  - *Scheduled Purge Scripts:* Cron jobs querying and deleting expired documents. Adds database query load and execution tracking overhead.
- **Consequences:**
  - *Positive:* Database engine handles expiration automatically, reducing application overhead.
  - *Negative:* Deletion is eventually consistent (MongoDB background thread runs every 60 seconds; deletion is not strictly real-time).

---

## ADR-012: Streaming File Reconstruction

- **Status:** Approved
- **Context:** File reconstruction must not write temporary merged files to the server's disk, which causes disk I/O bottlenecks and potential storage exhaustion.
- **Decision:** Stream chunk contents directly from the storage provider to the HTTP response stream. The server acts as a conduit; chunks are piped in sequence with no intermediate disk buffers.
- **Alternatives Considered:**
  - *Disk-Buffered Merge:* Download all chunks to `/tmp`, run `cat chunk* > output`, and send. High disk I/O overhead; duplicate storage requirements.
- **Consequences:**
  - *Positive:* Zero local disk footprint during download; instant first-byte delivery to users.
  - *Negative:* Connection interruption terminates the download; client-side download recovery is bound to HTTP Range implementation.

---

*End of ADR Register — CBFDS v1.0*
