# Development Roadmap

# Cloud-Based File Distribution System (CBFDS)

**Version:** 1.0  
**Date:** August 5, 2026  
**Status:** Mandatory Sequencing Guide for Implementation  
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, OpenAPI v1.0, UIUX v1.0, ADR Register v1.0, AI Instructions v1.0  

---

## 1. Roadmap Architecture & Dependency Strategy

To ensure a clean, testable build, the roadmap prioritizes building **Backend Foundation Layers first** (Core Entities → Repositories → Service Logic → Routes), followed by **Background Workers**, and finally the **Frontend Presentation Tier**.

```mermaid
gantt
    title CBFDS Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Backend
    Sprint 1: Base Setup & Auth API     :active, s1, 2026-08-06, 6d
    Sprint 2: Storage & Upload Pipeline :s2, after s1, 7d
    Sprint 3: Download & Sharing Engine :s3, after s2, 7d
    Sprint 4: Admin, Quota, & Jobs      :s4, after s3, 6d
    section Frontend
    Sprint 5: React UI Integration      :s5, after s4, 10d
    section Verification
    Sprint 6: E2E Testing & Deployment  :s6, after s5, 4d
```

---

## 2. Sprint Breakdown

### Sprint 1: Base Project Setup & Authentication APIs (6 Days)
- **Focus:** Setup workspace repositories, Docker Compose base configurations, Mongoose DB connectivity, and JWT authentication flows with refresh token rotation.
- **Tasks:**
  - Initialize server directory, run `npm init`, and setup Winston log configs.
  - Setup `docker-compose.yml` defining MongoDB and Redis services.
  - Implement Mongoose Schemas for `User`, `RefreshToken`, and `Otp`.
  - Implement `UserRepository` and `RefreshTokenRepository`.
  - Implement `AuthService` handling Registration, Login, Token Refresh, and Reset OTP generations.
  - Setup validation middleware (Joi/Zod DTO schemas) and error handling middleware.
  - Expose routes `/api/v1/auth/*` matching OpenAPI definitions.
- **Exit Criteria:**
  - Database connects successfully inside Docker network.
  - Integration tests for registration, login, token refresh, and OTP generation pass with 100% route coverage.
  - Passwords hashed with bcrypt (salt factor 12) verified in DB.

---

### Sprint 2: Storage Abstraction & tus Upload Engine (7 Days)
- **Focus:** Implement the Strategy Pattern for MinIO storage and integrate the tus protocol for resumable uploads.
- **Tasks:**
  - Provision MinIO container in `docker-compose.yml`.
  - Implement `IStorageProvider` interface.
  - Implement `MinIOProvider` class wrapping the MinIO SDK.
  - Implement `StorageFactory` to load the appropriate provider dynamically.
  - Integrate `tus-node-server` middleware to handle `/api/v1/uploads/*` routes.
  - Configure temporary workspace folder for tus file caching.
  - Register tus completion callback to write initial `File` document records (status: `PROCESSING`).
- **Exit Criteria:**
  - MinIO connection passes initialization health checks.
  - Large file uploads can be successfully initiated, paused, and resumed via a local curl script using tus protocols.
  - Completed uploads create target file metadata in MongoDB with `PROCESSING` status.

---

### Sprint 3: File Chunking & Streaming Download Engine (7 Days)
- **Focus:** Build background job workers to split files, compute checksums, and stream files during download.
- **Tasks:**
  - Setup BullMQ connection configuration in Redis.
  - Implement the `chunkingWorker` to handle the `file-processing` queue:
    - Read files from temp directory.
    - Split into 5 MB segments.
    - Compute SHA-256 hashes per chunk.
    - Save chunks to storage and create `chunks` metadata collection documents.
    - Update `file` status to `ACTIVE`.
  - Implement `DownloadService` and sequential download streaming logic in controllers.
  - Implement dynamic SHA-256 calculation during download streams to verify integrity.
- **Exit Criteria:**
  - Completed uploads are automatically chunked and processed by workers.
  - Merged downloads yield a file byte-for-byte identical to the original payload.
  - Checksum validation logic detects corrupted segments, retries, and aborts with a 500 error if corrupted.
  - Memory consumption of the API server stays below 10 MB per active download stream.

---

### Sprint 4: Admin Controls, Quotas, and Notifications (6 Days)
- **Focus:** Implement administrative configuration dashboards, storage limits, and transactional notifications.
- **Tasks:**
  - Implement `QuotaService` to track and recalculate user storage.
  - Wire upload route validation checks to block uploads when `storageUsed >= storageQuota`.
  - Implement `ShareService` supporting public share link generation, password hashing, and link expiration checking.
  - Setup `notifications` and `maintenance` queues in BullMQ:
    - Email sending worker (Nodemailer configuration).
    - Share link expiration daemon (hourly Cron).
    - Trash auto-purge daemon (daily Cron).
  - Expose `/api/v1/admin/*` routes with strict Super Admin/Admin role-based checks.
- **Exit Criteria:**
  - Uploads are blocked when user quota is exceeded.
  - Share links expire automatically or block download requests when download limits are reached.
  - Admin endpoints return 403 Forbidden when called with a standard user access token.

---

### Sprint 5: Frontend Single-Page Application (10 Days)
- **Focus:** Build the React Single-Page Application using Tailwind CSS and integrate with API routes.
- **Tasks:**
  - Initialize Vite + React project structure in `/client`.
  - Configure Tailwind CSS design tokens (colors, typography, HSL variables).
  - Setup Axios client instance with request/response interceptors to handle JWT bearer headers and token refreshes.
  - Build Auth views: Login, Register, Forgot Password forms with inline error state rendering.
  - Build Dashboard view: display storage gauge bar and recent logs.
  - Build File Browser: tabular file list with action menus, sorting, searching, and filtering.
  - Integrate `tus-js-client` in the Upload component for drag-and-drop progress uploads with pause/resume triggers.
  - Build Sharing modal, Notification centers, and Admin portals.
- **Exit Criteria:**
  - Client interface runs smoothly on Chrome, Safari, and Firefox.
  - Token refresh occurs silently without interrupting user experience when access token expires.
  - Interface adapts responsively down to 320px screen width.

---

### Sprint 6: E2E Integration, Testing, & Production Deployment (4 Days)
- **Focus:** Finalize testing coverage, compile production Docker Compose environments, and run validation tests.
- **Tasks:**
  - Write Playwright scripts to run automated End-to-End tests mapping standard user flows (Register -> Login -> Upload -> Download -> Share).
  - Setup production `docker-compose.prod.yml` configuration:
    - Multi-stage Dockerfiles for optimized build packages.
    - Setup Nginx container to serve built frontend bundle and reverse-proxy API requests.
    - Set rate limits and Helmet configuration checks on Nginx.
  - Execute audit scans for NoSQL injection, XSS, and broken authentication vectors.
- **Exit Criteria:**
  - All E2E automated test suites pass.
  - Node.js environment contains zero development dependencies in production build.
  - Health/Readiness endpoints return `healthy` and `ready: true` across all services.

---

## 3. Exit Criteria Matrix

Each sprint is strictly gated. The next sprint must not start until all exit criteria are checked and approved.

| Sprint | Verification Method | Target Status |
|---|---|---|
| Sprint 1 | Mocha/Supertest integration suite | Pass (100% route coverage) |
| Sprint 2 | tus query test CLI | Success (Upload resumes from offset) |
| Sprint 3 | SHA-256 byte-matching comparison | 100% match (No data loss) |
| Sprint 4 | RBAC route verification + mock quota filling | Pass (Admin block / Quota block) |
| Sprint 5 | Chrome DevTools + user path checking | Pass (0 console errors, CSS responsive) |
| Sprint 6 | Playwright automated E2E test suite | Pass (All green) |

---

*End of Development Roadmap — CBFDS v1.0*
