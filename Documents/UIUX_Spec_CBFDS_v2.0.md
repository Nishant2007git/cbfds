# UI/UX Specification v2.0

# Cloud-Based File Distribution System (CBFDS)

**Version:** 2.0  
**Date:** August 12, 2026  
**Status:** Approved Reference for Implementation  
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, OpenAPI v1.0, AI Instructions v1.0  

---

## 1. Executive Summary & Design Philosophy

The CBFDS UI/UX is engineered to deliver a high-fidelity, premium interface matching modern SaaS platforms (like Vercel, Linear, and Stripe). The design philosophy centers on **clarity, speed, and interactive flow**. It prioritizes visual hierarchy using deep, dark backgrounds, high-contrast typography, crisp boundaries, vibrant color accents, and subtle glassmorphic elements to emphasize functional layers.

---

## 2. Visual Identity & Design System Tokens

The visual identity is defined using flexible CSS variables linked to HSL color states. This permits seamless color transformation and accessibility adjustments.

### 2.1 Color Tokens (Tailored HSL)

| Token Name | HSL Value | Hex Equivalent | Usage Description |
|:---|:---|:---|:---|
| `--bg-base` | `hsl(222, 47%, 6%)` | `#080c14` | Primary body background (deep slate blue) |
| `--bg-surface` | `hsl(222, 47%, 10%)` | `#0d1421` | Panels, sidebar, tables, and card elements |
| `--bg-surface-hover` | `hsl(222, 47%, 14%)` | `#121c2e` | Accent state for hovered list rows or cards |
| `--bg-modal` | `hsla(222, 47%, 12%, 0.8)` | `#0f1726cc` | Glassmorphic overlay background |
| `--border-default` | `hsl(217, 32%, 18%)` | `#1f2d40` | Standard card, button, and table dividers |
| `--border-hover` | `hsl(217, 32%, 28%)` | `#314661` | Enhanced focus boundaries on hover |
| `--accent-primary` | `hsl(217, 91%, 60%)` | `#3b82f6` | Electric Blue: primary links, focus state, active tabs |
| `--accent-secondary` | `hsl(262, 83%, 58%)` | `#7c3aed` | Indigo: brand highlight, tags, admin actions |
| `--success` | `hsl(142, 71%, 45%)` | `#10b981` | Emerald Green: upload success, verification, active status |
| `--warning` | `hsl(38, 92%, 50%)` | `#f59e0b` | Amber: storage warning thresholds, link near-expiry |
| `--danger` | `hsl(0, 84%, 60%)` | `#ef4444` | Crimson: quota exceeded, cancel buttons, error notifications |
| `--text-primary` | `hsl(210, 40%, 98%)` | `#f8fafc` | Primary text (high contrast) |
| `--text-secondary` | `hsl(215, 20%, 65%)` | `#94a3b8` | Muted text, descriptions, table headers |
| `--text-muted` | `hsl(215, 16%, 47%)` | `#64748b` | Disabled labels, placeholders, footer notes |

### 2.2 Glassmorphism & Shadow Foundations

To construct layers, floating overlays (tooltips, navigation, modals) use glassmorphic panels.

```css
:root {
  --glass-bg: hsla(222, 47%, 10%, 0.6);
  --glass-blur: blur(12px) saturate(180%);
  --glass-border: 1px solid hsla(210, 40%, 98%, 0.05);
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
  --shadow-overlay: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}
```

### 2.3 Typography Matrix

The system maps styles to two font families to separate technical/tabular context from promotional/administrative titles:
*   **Outfit** (headings, metric highlights, dashboards).
*   **Inter** (data tables, code segments, settings labels, regular copy).

| Category | Font Family | Size | Weight | Line Height | Usage Example |
|:---|:---|:---|:---|:---|:---|
| **Display Title** | `Outfit` | `36px` | Bold (`700`) | `44px` | Welcome back headers, Hero sections |
| **Page Title** | `Outfit` | `24px` | SemiBold (`600`) | `32px` | Dashboard subheadings, modal titles |
| **Section Header** | `Outfit` | `18px` | SemiBold (`600`) | `26px` | Card boundaries, search parameters |
| **Body Primary** | `Inter` | `14px` | Regular (`400`) | `20px` | Table details, standard descriptions |
| **Body Small** | `Inter` | `12px` | Regular (`400`) | `16px` | Help hints, file size labels, metadata |
| **Monospace / Code** | `SF Mono` / `Courier` | `13px` | Regular (`400`) | `18px` | Checksums, token values, paths |

---

## 3. Screen Layout Blueprints & Wireframes

### 3.1 Authentication & OTP Center

A split-screen design. Left pane features the brand marketing and statistics; right pane holds the form.

```
+------------------------------------------+------------------------------------------+
|                 BRAND ZONE               |                 FORM ZONE                |
|                                          |                                          |
|  [Logo] Cloud Distribution System        |  +------------------------------------+  |
|                                          |  | Sign In                             |  |
|  "Deploy, share, and track files with    |  +------------------------------------+  |
|   zero latency."                         |  | Email                              |  |
|                                          |  | [ name@example.com               ] |  |
|  [Mermaid / Tech Architecture Graphic]   |  |                                    |  |
|  [Active Stats Counter Overlay]          |  | Password                           |  |
|                                          |  | [ •••••••••••••••                 ] |  |
|                                          |  |                                    |  |
|                                          |  | [x] Remember this device           |  |
|                                          |  |                                    |  |
|                                          |  | (  Sign In  )                      |  |
|                                          |  +------------------------------------+  |
|                                          |  | Forgot Password?  |  Create Account|  |
|                                          |  +------------------------------------+  |
+------------------------------------------+------------------------------------------+
```

#### OTP Code Verification Flow Overlay (Step 2)
When logging in or resetting passwords, an OTP window pops up over the darkened layout:
```
+-------------------------------------------------------------+
|                                                             |
|                    Two-Factor Verification                  |
|                                                             |
|  A 6-digit OTP code has been dispatched to: u***@domain.com  |
|                                                             |
|       [ _ ]  [ _ ]  [ _ ]  [ _ ]  [ _ ]  [ _ ]              |
|                                                             |
|                 ( Verify Security Code )                    |
|                                                             |
|  Did not receive code? Resend OTP (Available in 45s)        |
|                                                             |
+-------------------------------------------------------------+
```
*   **Interaction Detail:** Digit input fields automatically shift focus to the next box upon entry. Clicking backspace clears and returns focus to the preceding box.

---

## 3.2 Main Dashboard Dashboard

Organized in a dynamic bento-grid layout:

```
+-------------------------------------------------------------------------------------+
|  [Brand Sidebar]   |  [Top Header: Dashboard / user@example.com]         (Notifications) |
|  - Dashboard       +----------------------------------------------------------------+
|  - File Manager    |  +---------------------------+  +---------------------------+  |
|  - Shares          |  | STORAGE CONSUMPTION       |  | ACTIVE SHARE LINKS        |  |
|  - Settings        |  |                           |  |                           |  |
|  - Admin Portal    |  |  8.2 GB of 10.0 GB Used   |  | Active Links: 14          |  |
|                    |  |  [=============------]    |  | Total Hits: 1,482         |  |
|                    |  |  82% Capacity (Warning)   |  | Peak Traffic: 12MB/s      |  |
|                    |  +---------------------------+  +---------------------------+  |
|                    +----------------------------------------------------------------+
|                    |  +----------------------------------------------------------+  |
|                    |  | UPLOAD PROGRESS PIPELINE                                 |  |
|                    |  |                                                          |  |
|                    |  | - video_render.mp4 (45% done)  - 14.5MB/s - 02m 14s left |  |
|                    |  |   [==========---------------] [Pause] [Cancel]           |  |
|                    |  +----------------------------------------------------------+  |
|                    +----------------------------------------------------------------+
|                    |  +---------------------------+  +---------------------------+  |
|                    |  | RECENT EVENTS             |  | POPULAR FILES             |  |
|                    |  |                           |  |                           |  |
|                    |  | - Upload: docx (5 min)    |  | - archive.zip (102 DLs)   |  |
|                    |  | - Share: zip (1 hour)     |  | - presentation.pdf (89)   |  |
|                    |  +---------------------------+  +---------------------------+  |
+--------------------+----------------------------------------------------------------+
```

---

### 3.3 Advanced File Browser

Tabular grid layout optimized for large lists with bulk tools:

```
+-------------------------------------------------------------------------------------+
|  [Search: Find files...]  [Filter: All Files]  [Sort: Size (Descending)]  (Upload File)  |
+-------------------------------------------------------------------------------------+
| [x] Name                  | Size      | Uploaded At | Chunks  | Status   | Actions  |
+---------------------------+-----------+-------------+---------+----------+----------+
| [x] [ZIP] archive.zip     | 1.2 GB    | Aug 12 2026 | 240     | ACTIVE   | (Share)  |
| [ ] [PDF] quarterly.pdf   | 14.5 MB   | Aug 11 2026 | 3       | ACTIVE   | (Share)  |
| [ ] [MP4] intro.mp4       | 82.0 MB   | Aug 10 2026 | 17      | PROCESS  | (Cancel) |
| [ ] [PE]  installer.exe   | 12.0 MB   | Aug 08 2026 | 0       | BLOCKED  | (Purge)  |
+---------------------------+-----------+-------------+---------+----------+----------+
| Selected: 1 file (1.2 GB) | [Download Selected] | [Move to Trash] | [Verify Hashes] |
+-------------------------------------------------------------------------------------+
```

*   **Status Color Tags:**
    *   `ACTIVE`: Emerald green tag (`background: hsla(142, 71%, 45%, 0.1)`, `color: hsl(142, 71%, 45%)`).
    *   `PROCESS`: Shimmering amber tag (`background: hsla(38, 92%, 50%, 0.1)`, `color: hsl(38, 92%, 50%)`).
    *   `BLOCKED`: Crimson red tag (`background: hsla(0, 84%, 60%, 0.1)`, `color: hsl(0, 84%, 60%)`).

---

### 3.4 Sharing & Security Settings Modal

Configures access permissions, password hashing parameters, and expiration gates.

```
+-------------------------------------------------------------------+
|  Share Properties: archive.zip                                    |
+-------------------------------------------------------------------+
|  [x] Internal Share (Restricted to CBFDS Registered Users)        |
|      Recipient Email:                                             |
|      [ enter_user_email@domain.com                              ] |
|                                                                   |
|  [x] External Public Download Link                                |
|      Link URL: [ https://cbfds.io/s/8f7d92a-0a71... ] [Copy Link] |
|                                                                   |
|      +-----------------------------------------------------+      |
|      | SECURITY SETTINGS GATES                             |      |
|      |                                                     |      |
|      | [x] Access Password Protection                      |      |
|      |     [ ••••••••••••••••••••• ]                       |      |
|      |                                                     |      |
|      | [x] Set Expiration Gate                             |      |
|      |     Date: [ 2026-09-12 ] Time: [ 12:00:00 ]         |      |
|      |                                                     |      |
|      | [x] Download Access Limit                           |      |
|      |     Max Hits: [ 10 ] download requests              |      |
|      +-----------------------------------------------------+      |
|                                                                   |
|  ( Apply Configuration )                        ( Close Overlay ) |
+-------------------------------------------------------------------+
```

---

### 3.5 Admin Portal Dashboard

Enables Super Admins and Admins to moderate users, adjust quotas, and audit system metrics.

```
+-------------------------------------------------------------------------------------+
|  SYSTEM HEALTH: [DATABASE: OK] [REDIS: OK] [STORAGE: 64% CAPACITY] [WORKERS: 12 Idle] |
+-------------------------------------------------------------------------------------+
|  Users Registry Listing                                             [Search Users]  |
+---------------------------+-----------------------+-------------+-------------------+
| User                      | Quota Used / Limit    | Role        | Operations        |
+---------------------------+-----------------------+-------------+-------------------+
| john@example.com          | 8.2 GB / 10.0 GB      | User        | (Edit Quota) (Ban)|
| admin@library.com         | 104 KB / 100 GB       | Admin       | (Edit Quota) (Ban)|
| blocked_dev@spam.com      | 0 B / 10.0 GB         | User (Banned| (Unban)           |
+---------------------------+-----------------------+-------------+-------------------+
| Edit Quota for john@example.com: [ 15.0 ] GB                  ( Save Configuration )|
+-------------------------------------------------------------------------------------+
```

---

## 4. Design System JSON Schema

For consistent development across frontend and automated testing, the design tokens are structured as follows:

```json
{
  "name": "CBFDS Premium Dark System",
  "version": "2.0",
  "tokens": {
    "colors": {
      "background": {
        "base": "hsl(222, 47%, 6%)",
        "surface": "hsl(222, 47%, 10%)",
        "hover": "hsl(222, 47%, 14%)",
        "overlay": "hsla(222, 47%, 12%, 0.8)"
      },
      "border": {
        "default": "hsl(217, 32%, 18%)",
        "hover": "hsl(217, 32%, 28%)",
        "active": "hsl(217, 91%, 60%)"
      },
      "brand": {
        "primary": "hsl(217, 91%, 60%)",
        "secondary": "hsl(262, 83%, 58%)"
      },
      "functional": {
        "success": "hsl(142, 71%, 45%)",
        "warning": "hsl(38, 92%, 50%)",
        "danger": "hsl(0, 84%, 60%)"
      },
      "text": {
        "primary": "hsl(210, 40%, 98%)",
        "secondary": "hsl(215, 20%, 65%)",
        "muted": "hsl(215, 16%, 47%)"
      }
    },
    "typography": {
      "display": {
        "fontFamily": "Outfit, sans-serif",
        "fontSize": "36px",
        "fontWeight": "700"
      },
      "heading": {
        "fontFamily": "Outfit, sans-serif",
        "fontSize": "24px",
        "fontWeight": "600"
      },
      "body": {
        "fontFamily": "Inter, sans-serif",
        "fontSize": "14px",
        "fontWeight": "400"
      }
    },
    "animation": {
      "transition_duration": "0.2s",
      "transition_timing": "cubic-bezier(0.4, 0, 0.2, 1)"
    }
  }
}
```

---

## 5. Micro-interactions & Animation Specifications

### 5.1 Hover Dynamics
Any interactive button, list row, or sidebar link must change state smoothly using CSS transitions:
```css
.interactive-element {
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.interactive-element:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-hover);
}
.interactive-element:active {
  transform: scale(0.98);
}
```

### 5.2 Pulse Loading Shimmer (Skeleton)
To represent asynchronous loading in tables, elements shimmer with a running background gradient:
```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(222, 47%, 10%) 25%,
    hsl(222, 47%, 15%) 50%,
    hsl(222, 47%, 10%) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}
```

### 5.3 Progress Bar Velocity & Smoothing
Resumable uploads must not jump or freeze. The progress indicator transition:
```css
.upload-progress-indicator {
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
```

---

## 6. Accessibility & Usability Requirements (WCAG 2.1 AA)

To satisfy production-grade usability constraints, all implementations must conform to these rules:

1.  **Contrast Ratios:** Text-to-background contrast must remain above `4.5:1` for regular body text, and `3:1` for titles.
2.  **Focus States:** Keyboard navigation (`Tab` key) must render a distinct focus indicator (`outline: 2px solid hsl(217, 91%, 60%); outline-offset: 2px`) around active form controls. Focus indicators must never be suppressed.
3.  **ARIA Labels:** Form controls must include matching visual labels or `aria-label` tags. Drag-and-drop zones must expose `role="region"` and `aria-label="File Uploader"`.
4.  **Screen-Reader Feedback:** State updates (e.g., "Upload complete", "Error: Quota Exceeded") must trigger screen-reader notifications using `aria-live="polite"` or `aria-live="assertive"`.

---

*End of Specification — CBFDS v2.0*
