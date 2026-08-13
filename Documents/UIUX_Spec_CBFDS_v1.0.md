# UI/UX Specification

# Cloud-Based File Distribution System (CBFDS)

**Version:** 1.0  
**Date:** August 5, 2026  
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, OpenAPI v1.0, Graph Memory v1.0  

---

## 1. Design System & Visual Identity

To deliver a premium, modern experience, the user interface follows a curated design system using a sleek dark mode, vibrant functional accent colors, and custom micro-animations.

### 1.1 Curated Color Palette (Tailored HSL)
- **Backgrounds:**
  - Base Background: `hsl(222, 47%, 6%)` (Deep dark slate/blue)
  - Card/Container Surface: `hsl(222, 47%, 10%)` (Slightly lighter slate)
  - Popover/Modal Overlay: `hsla(222, 47%, 12%, 0.8)` (Semi-transparent backdrop)
- **Borders & Dividers:**
  - Standard Border: `hsl(217, 32%, 18%)`
  - Focus Ring: `hsl(217, 91%, 60%)` (Bright focus blue)
- **Brand Accents:**
  - Primary Accent: `hsl(217, 91%, 60%)` (Electric Blue)
  - Secondary Accent: `hsl(262, 83%, 58%)` (Vibrant Indigo)
- **Functional Accents:**
  - Success Indicator: `hsl(142, 71%, 45%)` (Emerald Green)
  - Warning/Alert: `hsl(38, 92%, 50%)` (Vivid Amber)
  - Danger/Error: `hsl(0, 84%, 60%)` (Crimson Red)
- **Typography Colors:**
  - Primary text: `hsl(210, 40%, 98%)` (High-contrast white-slate)
  - Secondary text: `hsl(215, 20%, 65%)` (Muted gray-slate)
  - Muted/Disabled text: `hsl(215, 16%, 47%)`

### 1.2 Glassmorphism System
Modals, tooltips, and floating navigation bars use glassmorphic panels:
- Background: `hsla(222, 47%, 10%, 0.6)`
- Blur effect: `backdrop-filter: blur(12px) saturate(180%)`
- Shadow: `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37)`
- Border: `1px solid hsla(210, 40%, 98%, 0.05)`

### 1.3 Typography
- **Primary Font:** `Outfit`, sans-serif (used for headings, dashboard stats, and high-visibility titles).
- **Secondary Font:** `Inter`, sans-serif (used for tabular file grids, description copy, settings forms, and log tables).
- **Text Scale:**
  - Display Title: `36px` (`font-weight: 700`, line-height `44px`)
  - Page Heading: `24px` (`font-weight: 600`, line-height `32px`)
  - Subheading/Section: `18px` (`font-weight: 600`, line-height `26px`)
  - Body Text: `14px` (`font-weight: 400`, line-height `20px`)
  - Small/Muted Text: `12px` (`font-weight: 400`, line-height `16px`)

### 1.4 Animations & Transitions
All interactive states must execute smooth, hardware-accelerated transitions:
- Hover Transition: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Modal In/Out: Scale in with bounce `transform: scale(0.95)` to `scale(1)` (duration `0.25s`)
- Upload Progress Bar: Width adjustments animate with `transition: width 0.3s ease-out`
- Dashboard Stat Counter: Interpolated count-up animation on initial render

---

## 2. Layout & Grid Systems

The layout adapts seamlessly to three primary target viewports.

### 2.1 Viewport Specifications
- **Desktop Grid (1024px and above):** 
  - Layout: Fixed sidebar (`260px` width) + flexible workspace area.
  - Page margins: `32px` padding on all sides.
- **Tablet Grid (768px - 1023px):**
  - Layout: Sidebar collapses into a slide-over panel triggered by a top-header hamburger menu.
  - Page margins: `24px` padding on all sides.
- **Mobile Grid (320px - 767px):**
  - Layout: Top header bar with avatar + Bottom sticky navigation bar (Home, Files, Upload, Settings).
  - Page margins: `16px` padding on all sides.

### 2.2 Global Dashboard Grid
Workspace components are organized in a standard grid:
- Standard spacing: `gap: 24px`.
- Columns: 12-column layout (spans dynamically: 12 cols on mobile, 6 cols on tablet, 3-4 cols on desktop).

---

## 3. Screen Layout Blueprints

### 3.1 Authentication Center (Login / Registration)
Unified centering layout with a glassmorphic form card.

```
+-------------------------------------------------------------------+
|                                                                   |
|                      [ CBFDS Brand Logo ]                         |
|                                                                   |
|                  +-----------------------------+                  |
|                  | Login / Register            |                  |
|                  +-----------------------------+                  |
|                  | Email Field                 |                  |
|                  | [_________________________] |                  |
|                  |                             |                  |
|                  | Password Field              |                  |
|                  | [_________________________] |                  |
|                  |                             |                  |
|                  | [x] Remember Device         |                  |
|                  |                             |                  |
|                  | (  Log In Button  )         |                  |
|                  +-----------------------------+                  |
|                  | Forgot Password? | Sign Up  |                  |
|                  +-----------------------------+                  |
+-------------------------------------------------------------------+
```

- **Validation Visual States:**
  - Normal input: Border is `Standard Border`.
  - Focused input: Border glows `Focus Ring` with outer shadow `0 0 0 4px hsla(217, 91%, 60%, 0.15)`.
  - Error state: Border turns `Danger/Error`, error helper text is rendered underneath in `12px` red font.

---

### 3.2 Main User Dashboard
Dashboard dashboard metrics displaying storage consumption and recent events.

```
+-------------------------------------------------------------------+
|  [Header: Welcome back, John Doe]                 (Notifications) |
+-------------------------------------------------------------------+
|  +------------------------+  +---------------------------------+  |
|  | STORAGE CONSUMPTION    |  | USER QUICK STATS                |  |
|  |                        |  |                                 |  |
|  |  8.2 GB of 10.0 GB     |  | Total Files: 124                |  |
|  |  [================---] |  | Active Shares: 15               |  |
|  |  82% Used (Warning)    |  | Incoming Shares: 8              |  |
|  +------------------------+  +---------------------------------+  |
+-------------------------------------------------------------------+
|  +------------------------+  +---------------------------------+  |
|  | RECENT UPLOADS         |  | RECENT DOWNLOADS                |  |
|  |                        |  |                                 |  |
|  | - report.pdf (5MB)     |  | - dataset.zip (100MB)           |  |
|  | - img_01.png (3MB)     |  | - schema.sql (1.2MB)            |  |
|  +------------------------+  +---------------------------------+  |
+-------------------------------------------------------------------+
```

- **Storage Meter Threshold Styling:**
  - `< 80%`: Progress bar is Electric Blue.
  - `80% - 89%`: Progress bar turns Vivid Amber.
  - `≥ 90%`: Progress bar flashes Crimson Red, accompanied by a top storage warning banner.

---

### 3.3 File Browser
A tabular interface supporting sorting, filtering, searching, and batch operations.

```
+-------------------------------------------------------------------+
|  [Search: Find files...] [Filter: Type] [Sort: Newest] (Upload Button)|
+-------------------------------------------------------------------+
| [ ] Name               | Size    | Uploaded At | Actions          |
|------------------------+---------+-------------+------------------|
| [ ] [PDF] report.pdf   | 5.2 MB  | 2026-08-05  | (Share) (Delete) |
| [ ] [ZIP] archive.zip  | 1.1 GB  | 2026-08-04  | (Share) (Delete) |
| [ ] [IMG] avatar.png   | 450 KB  | 2026-08-01  | (Share) (Delete) |
+-------------------------------------------------------------------+
| Bulk Operations: [Selected: 2] (Download Zip) (Move to Trash)     |
+-------------------------------------------------------------------+
```

- **Row Hover States:** Hovering over a file row increases the row's surface background saturation slightly and renders the contextual Action triggers dynamically.
- **Search Auto-complete:** Typing in search runs client-side search indexing matching local data arrays first, and queries backend pagination routes if no matches are discovered locally.

---

### 3.4 Resumable Upload Zone
Drag-and-drop file target displaying progress states and chunk upload details.

```
+-------------------------------------------------------------------+
|                                                                   |
|          [ Drag & Drop files here or Browse to select ]            |
|                                                                   |
+-------------------------------------------------------------------+
|  Active Uploads                                                   |
|                                                                   |
|  - dataset.zip (52% complete - 2.6 GB / 5.0 GB)                   |
|    [=======-------] 12.4 MB/s (00:03:15 left)                     |
|    ( Pause Upload )  ( Cancel Upload )                            |
|                                                                   |
|  - resume.docx (Upload Paused at 12%)                             |
|    [=-------------] ( Resume Upload )  ( Cancel Upload )          |
+-------------------------------------------------------------------+
```

- **DND Overlay State:** Dragging a file over the target highlights the frame boundaries in `Electric Blue` with a pulsing backdrop.
- **Action Triggers:** Pausing an upload calls `tusUploader.abort()` and updates the visual state to "Paused". Resuming queries the offset and starts patching binary segments immediately.

---

### 3.5 Security Sharing Configuration Modal
Pop-up interface to configure internal shares and external sharing link parameters.

```
+-------------------------------------------------------------------+
|  Share File: report.pdf                                           |
+-------------------------------------------------------------------+
|  [ INTERNAL SHARE ]                     [ GET PUBLIC LINK ]       |
|                                                                   |
|  Recipient Email:                                                 |
|  [___________________________________________________________]    |
|                                                                   |
|  Permission: (x) Viewer  ( ) Editor                               |
|                                                                   |
|  [x] Enable Password Protection                                   |
|      Password: [_______________]                                  |
|                                                                   |
|  [x] Expiry Date: [ 2026-09-05 ]                                  |
|  [x] Download Limit: [ 10 ] downloads                             |
|                                                                   |
|  (  Generate Link / Share  )                                      |
+-------------------------------------------------------------------+
```

---

## 4. Component Interaction States

### 4.1 Button Visual States
- **Primary Action (Electric Blue Base):**
  - Default: `background-color: hsl(217, 91%, 60%)`
  - Hover: `background-color: hsl(217, 91%, 55%)`
  - Active: Scale matches `scale(0.98)`
  - Disabled: Gray-slate with cursor set to `not-allowed`.
- **Secondary Action (Transparent with Slate Border):**
  - Default: `border-color: Standard Border`, `background: transparent`
  - Hover: `background: hsla(217, 91%, 60%, 0.1)`, `border-color: Electric Blue`

### 4.2 Form Inputs
- Focus outline glows in `Focus Ring`.
- Placeholder values use `hsl(215, 16%, 47%)` (muted text color).

### 4.3 Skeletons (Loading States)
- While data is fetched, tables and widgets render placeholder cards with a pulsing gradient background running from right to left (`shimmer effect`).

```
+------------------------------------+
|  Loading files...                  |
|  ||||||||||||||||||||| (Shimmer)   |
|  |||||||||||                       |
+------------------------------------+
```

### 4.4 Empty States
- When no files are present (e.g. Empty Trash or Search with 0 results), render custom illustrations with muted messages:
  - Header: "No files discovered"
  - Subtext: "Drag and drop some files here to get started."

### 4.5 Global Toast Notifications
- Floating alerts render at the top-right corner of the screen with a slide-in animation.
- Alerts contain icons matching the notification type:
  - Success Toast: Checkmark icon with `Success Indicator` green color.
  - Error Toast: Alert icon with `Danger/Error` red color.
  - Upload Complete: Document icon with `Primary Accent` blue color.

---

*End of UI/UX Specification — CBFDS v1.0*
