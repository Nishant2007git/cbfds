# OpenAPI Specification

# Cloud-Based File Distribution System (CBFDS)

**Version:** 1.0  
**OpenAPI Specification:** 3.0.0  
**Date:** August 5, 2026  
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, Graph Memory v1.0  

---

## OpenAPI 3.0.0 YAML Specification

```yaml
openapi: 3.0.0
info:
  title: Cloud-Based File Distribution System (CBFDS) API
  description: |
    Production-ready REST API endpoints for the Cloud-Based File Distribution System.
    Includes user authentication, file uploads via the tus protocol, file chunking metadata,
    sharing controls, notifications, admin operations, and health monitoring.
  version: 1.0.0
servers:
  - url: http://localhost:3000/api/v1
    description: Local Development Server
  - url: https://api.cbfds.com/api/v1
    description: Production Server

security:
  - BearerAuth: []

paths:
  # =========================================================================
  # AUTHENTICATION MODULE
  # =========================================================================
  /auth/register:
    post:
      summary: Register a new user
      security: []
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - fullName
                - email
                - password
                - confirmPassword
              properties:
                fullName:
                  type: string
                  minLength: 2
                  maxLength: 100
                  example: "John Doe"
                email:
                  type: string
                  format: email
                  example: "user@example.com"
                password:
                  type: string
                  format: password
                  minLength: 8
                  example: "P@ssword123"
                confirmPassword:
                  type: string
                  format: password
                  example: "P@ssword123"
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuccessResponse'
        '400':
          description: Invalid input / password complexity failure
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '409':
          description: Email already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /auth/login:
    post:
      summary: Authenticate user and issue JWT tokens
      security: []
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: "user@example.com"
                password:
                  type: string
                  format: password
                  example: "P@ssword123"
                deviceInfo:
                  type: object
                  properties:
                    userAgent:
                      type: string
                    ipAddress:
                      type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      accessToken:
                        type: string
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      refreshToken:
                        type: string
                        example: "a1b2c3d4e5f6g7h8i9j0..."
                      expiresIn:
                        type: integer
                        example: 900
                      user:
                        $ref: '#/components/schemas/UserDto'
        '401':
          description: Invalid credentials
        '423':
          description: Account locked temporarily due to excessive failures

  /auth/refresh:
    post:
      summary: Refresh access token using refresh token rotation
      security: []
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
                  example: "a1b2c3d4e5f6g7h8i9j0..."
      responses:
        '200':
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      accessToken:
                        type: string
                      refreshToken:
                        type: string
                      expiresIn:
                        type: integer
                        example: 900
        '401':
          description: Invalid, expired, or revoked refresh token

  /auth/logout:
    post:
      summary: Log out from the current device session
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Logged out successfully

  /auth/logout-all:
    post:
      summary: Invalidate all active refresh tokens for the user
      tags:
        - Authentication
      responses:
        '200':
          description: Logged out of all devices successfully

  /auth/forgot-password:
    post:
      summary: Request password reset verification OTP code
      security: []
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
              properties:
                email:
                  type: string
                  format: email
      responses:
        '200':
          description: OTP code dispatched via background queue (generic response)

  /auth/reset-password:
    post:
      summary: Verify OTP and reset password
      security: []
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - otp
                - newPassword
                - confirmNewPassword
              properties:
                email:
                  type: string
                  format: email
                otp:
                  type: string
                  pattern: "^[0-9]{6}$"
                newPassword:
                  type: string
                  format: password
                  minLength: 8
                confirmNewPassword:
                  type: string
                  format: password
      responses:
        '200':
          description: Password updated, active sessions invalidated
        '400':
          description: Invalid OTP / mismatch / expiry / password policy failure

  /auth/sessions:
    get:
      summary: Get active login sessions for the current user
      tags:
        - Authentication
      responses:
        '200':
          description: Array of sessions
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/SessionDto'

  /auth/sessions/{sessionId}:
    delete:
      summary: Revoke an active session
      tags:
        - Authentication
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Session revoked

  /auth/profile:
    get:
      summary: Retrieve the current user's profile info
      tags:
        - Authentication
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/UserDto'
    put:
      summary: Update user profile parameters
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                fullName:
                  type: string
      responses:
        '200':
          description: Profile updated

  /auth/change-password:
    put:
      summary: Authenticated password change
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - currentPassword
                - newPassword
                - confirmNewPassword
              properties:
                currentPassword:
                  type: string
                newPassword:
                  type: string
                  minLength: 8
                confirmNewPassword:
                  type: string
      responses:
        '200':
          description: Password updated successfully

  # =========================================================================
  # FILE MODULE & MANAGEMENT
  # =========================================================================
  /files:
    get:
      summary: Retrieve active user files
      tags:
        - Files
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: sort
          in: query
          schema:
            type: string
            enum: [name_asc, name_desc, size_asc, size_desc, date_asc, date_desc]
            default: date_desc
      responses:
        '200':
          description: Paginated files list
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/FileDto'
                  pagination:
                    $ref: '#/components/schemas/PaginationDto'

  /files/search:
    get:
      summary: Search active user files
      tags:
        - Files
      parameters:
        - name: query
          in: query
          required: true
          schema:
            type: string
        - name: mimeType
          in: query
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Search results

  /files/trash:
    get:
      summary: List soft-deleted files in the user's trash bin
      tags:
        - Files
      responses:
        '200':
          description: Array of deleted files

  /files/{fileId}:
    get:
      summary: Get file metadata
      tags:
        - Files
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: File details
    delete:
      summary: Soft-delete a file (move to trash)
      tags:
        - Files
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: File moved to trash bin

  /files/{fileId}/rename:
    put:
      summary: Rename a file
      tags:
        - Files
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - newName
              properties:
                newName:
                  type: string
                  maxLength: 255
      responses:
        '200':
          description: File renamed

  /files/{fileId}/restore:
    post:
      summary: Restore a soft-deleted file from the trash bin
      tags:
        - Files
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: File status updated to ACTIVE

  /files/{fileId}/permanent:
    delete:
      summary: Permanently delete a file and all stored chunks
      tags:
        - Files
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Deletion process initialized (BullMQ Worker cleanup)

  /files/{fileId}/download:
    get:
      summary: Stream reconstructed download payload
      tags:
        - Files
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Streaming binary output
          headers:
            Content-Disposition:
              schema:
                type: string
                example: "attachment; filename=\"document.pdf\""
            Content-Type:
              schema:
                type: string
                example: "application/pdf"
            Content-Length:
              schema:
                type: integer
                example: 10485760

  /files/history:
    get:
      summary: View user's file upload history
      tags:
        - Files
      responses:
        '200':
          description: History logs

  # =========================================================================
  # RESUMABLE UPLOADS MODULE (tus Protocol endpoints)
  # =========================================================================
  /uploads:
    post:
      summary: Initialize a resumable upload resource (tus Protocol POST)
      tags:
        - Resumable Upload
      parameters:
        - name: Tus-Resumable
          in: header
          required: true
          schema:
            type: string
            enum: ["1.0.0"]
        - name: Upload-Length
          in: header
          required: true
          schema:
            type: integer
        - name: Upload-Metadata
          in: header
          required: true
          schema:
            type: string
            example: "filename dGVzdC5wZGY=,filetype YXBwbGljYXRpb24vcGRm"
      responses:
        '201':
          description: Resource created
          headers:
            Location:
              schema:
                type: string
                example: "/api/v1/uploads/upload-session-uuid"
            Tus-Resumable:
              schema:
                type: string

  /uploads/{uploadId}:
    patch:
      summary: Stream binary payload segments to upload resource (tus Protocol PATCH)
      tags:
        - Resumable Upload
      parameters:
        - name: uploadId
          in: path
          required: true
          schema:
            type: string
        - name: Tus-Resumable
          in: header
          required: true
          schema:
            type: string
        - name: Upload-Offset
          in: header
          required: true
          schema:
            type: integer
        - name: Content-Type
          in: header
          required: true
          schema:
            type: string
            enum: ["application/offset+octet-stream"]
      requestBody:
        required: true
        content:
          application/offset+octet-stream:
            schema:
              type: string
              format: binary
      responses:
        '204':
          description: Stream segment appended successfully
          headers:
            Upload-Offset:
              schema:
                type: integer
            Tus-Resumable:
              schema:
                type: string
    head:
      summary: Check current offset of active upload resource (tus Protocol HEAD)
      tags:
        - Resumable Upload
      parameters:
        - name: uploadId
          in: path
          required: true
          schema:
            type: string
        - name: Tus-Resumable
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Offset info retrieved
          headers:
            Upload-Offset:
              schema:
                type: integer
            Upload-Length:
              schema:
                type: integer
            Tus-Resumable:
              schema:
                type: string
    delete:
      summary: Cancel and discard upload resource (tus Protocol DELETE)
      tags:
        - Resumable Upload
      parameters:
        - name: uploadId
          in: path
          required: true
          schema:
            type: string
        - name: Tus-Resumable
          in: header
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Session context discarded

  # =========================================================================
  # SHARING MODULE
  # =========================================================================
  /shares:
    post:
      summary: Create a file share allocation
      tags:
        - Sharing
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - fileId
                - shareType
              properties:
                fileId:
                  type: string
                shareType:
                  type: string
                  enum: [INTERNAL, EXTERNAL]
                recipientEmail:
                  type: string
                  description: Required for INTERNAL shares
                password:
                  type: string
                  description: Optional for EXTERNAL links
                expiresAt:
                  type: string
                  format: date-time
                downloadLimit:
                  type: integer
                  minimum: 1
                  maximum: 100
      responses:
        '201':
          description: Share established
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/ShareDto'
    get:
      summary: List shares initiated by the user
      tags:
        - Sharing
      responses:
        '200':
          description: User's outgoing shares

  /shares/shared-with-me:
    get:
      summary: Get files shared with the current user
      tags:
        - Sharing
      responses:
        '200':
          description: User's incoming shares

  /shares/{shareId}:
    get:
      summary: Retrieve specific share info
      tags:
        - Sharing
      parameters:
        - name: shareId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Share details
    put:
      summary: Modify share parameters (expiration / limit / state)
      tags:
        - Sharing
      parameters:
        - name: shareId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                expiresAt:
                  type: string
                  format: date-time
                downloadLimit:
                  type: integer
                isActive:
                  type: boolean
      responses:
        '200':
          description: Share updated
    delete:
      summary: Revoke sharing access
      tags:
        - Sharing
      parameters:
        - name: shareId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Access revoked

  /share/{token}:
    get:
      summary: Fetch external public metadata context (Public Endpoint)
      security: []
      tags:
        - Sharing
      parameters:
        - name: token
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Metadata context for share link
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      shareId:
                        type: string
                      fileName:
                        type: string
                      fileSize:
                        type: integer
                      ownerName:
                        type: string
                      passwordRequired:
                        type: boolean
                      expiresAt:
                        type: string
                        format: date-time
        '410':
          description: Share link expired or limit reached

  /share/{token}/verify:
    post:
      summary: Validate password protection session access (Public Endpoint)
      security: []
      tags:
        - Sharing
      parameters:
        - name: token
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - password
              properties:
                password:
                  type: string
      responses:
        '200':
          description: Password verified, returns session token
        '401':
          description: Incorrect password

  /share/{token}/download:
    get:
      summary: Stream public shared download reconstruction payload (Public Endpoint)
      security: []
      tags:
        - Sharing
      parameters:
        - name: token
          in: path
          required: true
          schema:
            type: string
        - name: sessionToken
          in: query
          schema:
            type: string
          description: Required if link is password-protected
      responses:
        '200':
          description: Streaming binary payload

  # =========================================================================
  # NOTIFICATION MODULE
  # =========================================================================
  /notifications:
    get:
      summary: Fetch user notification feed
      tags:
        - Notifications
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: User notification array

  /notifications/unread-count:
    get:
      summary: Fetch count of unread notifications
      tags:
        - Notifications
      responses:
        '200':
          description: Unread notification count

  /notifications/{id}/read:
    put:
      summary: Mark specific notification alert as read
      tags:
        - Notifications
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Notification status marked read

  /notifications/read-all:
    put:
      summary: Mark all unread notifications as read
      tags:
        - Notifications
      responses:
        '200':
          description: Global notification statuses marked read

  /notifications/preferences:
    get:
      summary: Fetch notification preference configurations
      tags:
        - Notifications
      responses:
        '200':
          description: User preferences
    put:
      summary: Update notification configurations
      tags:
        - Notifications
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                emailOnShare:
                  type: boolean
                emailOnQuotaWarning:
                  type: boolean
                emailOnNewDevice:
                  type: boolean
      responses:
        '200':
          description: Preferences updated

  # =========================================================================
  # QUOTA MODULE
  # =========================================================================
  /quota:
    get:
      summary: Get user's current storage quota status
      tags:
        - Quota
      responses:
        '200':
          description: Quota details
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      storageUsed:
                        type: integer
                      storageQuota:
                        type: integer
                      percentage:
                        type: number

  /quota/breakdown:
    get:
      summary: Fetch database aggregation breakdown of storage usage
      tags:
        - Quota
      responses:
        '200':
          description: Breakdown metrics by format categories

  # =========================================================================
  # ADMINISTRATIVE ROUTING (Admin / Super Admin scopes)
  # =========================================================================
  /admin/users:
    get:
      summary: List all user records (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Complete user data list

  /admin/users/{userId}:
    get:
      summary: Retrieve specific user metadata (Admin only)
      tags:
        - Admin
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Metadata context
    put:
      summary: Edit user account profile parameters (Admin only)
      tags:
        - Admin
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                fullName:
                  type: string
                isActive:
                  type: boolean
      responses:
        '200':
          description: Profile fields updated
    delete:
      summary: Permanent user delete routine (Super Admin only)
      tags:
        - Admin
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User context and all files purged

  /admin/users/{userId}/role:
    put:
      summary: Reassign authorization scope level (Super Admin only)
      tags:
        - Admin
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - role
              properties:
                role:
                  type: string
                  enum: [user, admin, superadmin]
      responses:
        '200':
          description: User authorization scope updated

  /admin/users/{userId}/quota:
    put:
      summary: Adjust quota parameters (Admin only)
      tags:
        - Admin
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - storageQuota
              properties:
                storageQuota:
                  type: integer
      responses:
        '200':
          description: Target quota adjusted

  /admin/users/{userId}/deactivate:
    put:
      summary: Deactivate user account access (Admin only)
      tags:
        - Admin
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Target account deactivated, active sessions invalidated

  /admin/stats:
    get:
      summary: Retrieve system stats (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Metric aggregate context

  /admin/storage:
    get:
      summary: Fetch global storage provider metrics (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Storage volume details

  /admin/files:
    get:
      summary: List all metadata files across database scope (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Metadata array

  /admin/files/{fileId}:
    delete:
      summary: Force remove a file for moderation audit compliance (Admin only)
      tags:
        - Admin
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - reason
              properties:
                reason:
                  type: string
      responses:
        '200':
          description: File scheduled for permanent purge

  /admin/activity-logs:
    get:
      summary: Fetch transaction logs (Admin only)
      tags:
        - Admin
      parameters:
        - name: user
          in: query
          schema:
            type: string
        - name: action
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Activity records

  /admin/uploads:
    get:
      summary: Fetch real-time upload operations (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Active streams info

  /admin/downloads:
    get:
      summary: Fetch real-time download operations (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Active downloads info

  /admin/config:
    get:
      summary: Retrieve system configurations (Super Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Config data
  /admin/config/{key}:
    put:
      summary: Update a config setting (Super Admin only)
      tags:
        - Admin
      parameters:
        - name: key
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - value
              properties:
                value:
                  type: string
      responses:
        '200':
          description: Configuration updated

  /admin/blocklist:
    get:
      summary: Fetch type filter blocklist (Admin only)
      tags:
        - Admin
      responses:
        '200':
          description: Blocklist array
    put:
      summary: Update blocklist rules (Admin only)
      tags:
        - Admin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - extensions
              properties:
                extensions:
                  type: array
                  items:
                    type: string
      responses:
        '200':
          description: Blocklist configuration updated

  # =========================================================================
  # MONITORING ENDPOINTS
  # =========================================================================
  /health:
    get:
      summary: Perform basic health check
      security: []
      tags:
        - Monitoring
      responses:
        '200':
          description: Overall health is verified
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  version:
                    type: string
                    example: "1.0.0"

  /readiness:
    get:
      summary: Perform complete dependency checks
      security: []
      tags:
        - Monitoring
      responses:
        '200':
          description: All connections ready
        '503':
          description: Connections degraded

  /metrics:
    get:
      summary: Fetch Prometheus metric parameters
      security: []
      tags:
        - Monitoring
      responses:
        '200':
          description: Plain text Prometheus payload
          content:
            text/plain:
              schema:
                type: string
                example: |
                  # HELP cbfds_http_requests_total Total HTTP requests
                  # TYPE cbfds_http_requests_total counter
                  cbfds_http_requests_total{method="GET",path="/health",status="200"} 1284

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    SuccessResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        message:
          type: string
          example: "Operation completed successfully"
        data:
          type: object

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
              example: "The field parameter is required."
            details:
              type: object

    UserDto:
      type: object
      properties:
        userId:
          type: string
        fullName:
          type: string
        email:
          type: string
        role:
          type: string
        storageQuota:
          type: integer
        storageUsed:
          type: integer

    FileDto:
      type: object
      properties:
        fileId:
          type: string
        originalName:
          type: string
        mimeType:
          type: string
        fileSize:
          type: integer
        status:
          type: string
        uploadedAt:
          type: string
          format: date-time

    ShareDto:
      type: object
      properties:
        shareId:
          type: string
        fileId:
          type: string
        shareType:
          type: string
        token:
          type: string
        permission:
          type: string
        expiresAt:
          type: string
          format: date-time
        downloadLimit:
          type: integer
        downloadCount:
          type: integer
        isActive:
          type: boolean

    SessionDto:
      type: object
      properties:
        sessionId:
          type: string
        deviceInfo:
          type: object
        ipAddress:
          type: string
        loginAt:
          type: string
          format: date-time

    PaginationDto:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        totalItems:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean
```
