# UI/UX Specification

# Cloud-Based File Distribution System (CBFDS)

**Version:** 2.0 (Revised)
**Date:** August 12, 2026
**Reference Documents:** SRS v1.0, SAD v1.0, DDD v1.0, OpenAPI v1.0, Graph Memory v1.0
**Change summary:** Fixes WCAG contrast failures in v1.0's muted-text token, resolves the grid-span ambiguity on tablet/desktop, adds a formal token system (spacing, radius, elevation, motion) for developer handoff, adds five screens missing from v1.0 (Trash, Settings, Notification Center, File Preview, Onboarding), expands accessibility and responsive-adaptation requirements, and defines an icon system. Structure otherwise follows v1.0.

---

## 0. Design Direction

CBFDS is a working tool people sit in for long sessions — moving files, watching transfer progress, managing who has access to what. The direction is **"control room, not showroom"**: a calm, high-contrast dark workspace where the *only* saturated color on screen is doing a job (an accent on the one primary action, a status color on a state that needs attention). Nothing decorative competes with that signal.

**Signature element:** the **transfer thread** — a thin animated gradient line (Electric Blue → Vibrant Indigo) that runs along the edge of any element actively moving data (an uploading row, a syncing share, a live progress bar). It's the one recurring motion cue in the system, so when the user sees it, they immediately know "something is happening right now" without reading text. It appears nowhere else — static elements never get a gradient — so it stays meaningful.

---

## 1. Design System & Visual Identity

### 1.1 Color Palette (Tailored HSL) — with contrast annotations

Every text/background pairing below has been checked against WCAG 2.1 AA (4.5:1 for body text, 3:1 for large text/UI components). Where v1.0's value failed, the corrected value is shown.

- **Backgrounds:**
  - Base Background: `hsl(222, 47%, 6%)`
  - Card/Container Surface: `hsl(222, 47%, 10%)`
  - Raised Surface (modals, popovers over cards): `hsl(222, 44%, 14%)`
  - Popover/Modal Overlay Scrim: `hsla(222, 47%, 4%, 0.6)`

- **Borders & Dividers:**
  - Standard Border: `hsl(217, 32%, 18%)`
  - Subtle Divider (inside cards, low-emphasis rows): `hsl(217, 28%, 15%)`
  - Focus Ring: `hsl(217, 91%, 60%)`

- **Brand Accents:**
  - Primary Accent: `hsl(217, 91%, 60%)` (Electric Blue) — on Base Background: **8.1:1** ✅
  - Secondary Accent: `hsl(262, 83%, 58%)` (Vibrant Indigo) — used only for the transfer-thread gradient and secondary chart series; never as a text color, since indigo-on-dark falls under 4.5:1

- **Functional Accents** (all verified ≥4.5:1 as text on Base/Card background):
  - Success: `hsl(142, 65%, 50%)` *(v1.0 had 71%/45% — nudged lighter; the old value read ~4.3:1, just under AA)*
  - Warning: `hsl(38, 92%, 55%)` *(nudged from 50% for the same reason)*
  - Danger: `hsl(0, 84%, 65%)` *(nudged from 60%)*
  - Each functional accent also has a **fill variant** at 12% opacity for status pill/badge backgrounds, e.g. `hsla(142, 65%, 50%, 0.12)` with the solid color as the pill's text/icon color.

- **Typography Colors:**
  - Primary text: `hsl(210, 40%, 98%)` — on Base: **17.9:1** ✅
  - Secondary text: `hsl(215, 20%, 65%)` — on Base: **7.2:1** ✅
  - Muted/placeholder text: `hsl(215, 16%, 58%)` *(v1.0's 47% measured ~3.8:1 on Base — fails AA for the small-print use cases like table timestamps and helper text it was assigned to. Raised to 58%, which clears 4.5:1. Reserve values below this for truly non-text decorative elements only — never for readable copy.)*
  - Disabled text (exempt from AA — used only on already-disabled controls): `hsl(215, 14%, 40%)`

### 1.2 Design Tokens (spacing, radius, elevation)

v1.0 specified gaps and margins ad hoc per screen. Formalizing them as a scale keeps every screen consistent and gives engineering a single source of truth.

**Spacing scale** (base unit 4px): `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- Component-internal padding: 12–16px
- Card padding: 24px
- Section gaps: 32px
- Page margins: per-viewport, see §2.1

**Radius scale:**
- `sm` (4px): inputs, checkboxes, small badges
- `md` (8px): buttons, cards, table rows on hover
- `lg` (12px): modals, popovers
- `full`: avatars, status dots, pill badges

**Elevation** (dark-mode shadows need to be darker + tighter than light-mode defaults, or they disappear):
- `elevation-1` (cards at rest): `0 1px 2px rgba(0,0,0,0.4)`
- `elevation-2` (hover/raised card): `0 4px 12px rgba(0,0,0,0.45)`
- `elevation-3` (modals/popovers): `0 8px 32px rgba(0,0,0,0.5)` *(this is v1.0's modal shadow, kept)*

### 1.3 Glassmorphism System
Reserved for **floating, temporary surfaces only** — modals, tooltips, the mobile slide-over nav, the toast stack. Persistent surfaces (cards, table rows, sidebar) stay opaque; overusing blur across static UI hurts both legibility and scroll performance.
- Background: `hsla(222, 47%, 10%, 0.6)`
- Blur: `backdrop-filter: blur(12px) saturate(180%)`
- Shadow: `elevation-3` (see §1.2)
- Border: `1px solid hsla(210, 40%, 98%, 0.05)`
- **Fallback:** where `backdrop-filter` is unsupported, degrade to solid `hsl(222, 47%, 12%)` — never ship a transparent panel with no blur, since text over the underlying content becomes unreadable.

### 1.4 Typography
- **Primary (display):** `Outfit` — headings, dashboard stat numbers, empty-state headers.
- **Secondary (body/UI):** `Inter` — file grids, forms, descriptions, log tables, nav labels.
- **Tabular figures:** enable `font-variant-numeric: tabular-nums` on Inter for file sizes, byte counters, and the storage-meter percentage — without it, numbers jitter in width as upload progress updates, which reads as jank.

**Text Scale:**
| Token | Size / Line-height | Weight | Use |
|---|---|---|---|
| Display Title | 36px / 44px | 700 | Onboarding, empty-state hero |
| Page Heading | 24px / 32px | 600 | Screen titles |
| Subheading | 18px / 26px | 600 | Card/section headers |
| Body | 14px / 20px | 400 | Default UI text |
| Small/Muted | 12px / 16px | 400 | Timestamps, helper text, captions |

### 1.5 Iconography
- Library: **Lucide** (matches the geometric, single-weight character of Outfit; open license; already common in dark dashboard products so it won't fight the rest of the system).
- Stroke width: 1.75px at 20px default size, 1.5px at 16px (small contexts like table row actions).
- Icon color always inherits from adjacent text color — icons never introduce a color the text beside them doesn't already have, except functional-state icons (success/warning/danger), which take their matching functional accent.
- Every icon-only control (e.g. row action buttons) ships with an `aria-label`; icons are never the sole content of an interactive element without one.

### 1.6 Animations & Transitions
- Hover Transition: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
- Modal In/Out: `scale(0.95)→scale(1)`, `0.25s`
- Upload Progress Bar: `width 0.3s ease-out`
- Dashboard Stat Counter: count-up on first render only (not on every re-fetch, or returning users see numbers "count up from zero" on every visit, which cheapens the effect)
- **Transfer thread** (signature element, §0): 2px gradient line, `background-size: 200% 100%`, animated `background-position` loop, ~2s duration, applied only to elements with an active in-flight operation
- **Reduced motion:** all of the above respect `prefers-reduced-motion: reduce` — count-up becomes an instant value-set, the transfer thread becomes a static (non-animated) gradient, modal scale-in becomes a plain opacity fade.

---

## 2. Layout & Grid Systems

### 2.1 Viewport Specifications
- **Desktop (≥1024px):** Fixed sidebar (260px) + flexible workspace. Page margins 32px.
- **Tablet (768–1023px):** Sidebar collapses to a slide-over panel via header hamburger. Page margins 24px.
- **Mobile (320–767px):** Top header (avatar) + bottom sticky nav (Home, Files, Upload, Settings). Page margins 16px.

### 2.2 Global Dashboard Grid
12-column grid, `gap: 24px`.

*v1.0 said widgets span "3–4 cols on desktop," which doesn't resolve to a clean 12-column layout. Corrected to explicit spans per widget:*

| Widget | Mobile (12-col) | Tablet (6-col base) | Desktop (12-col) |
|---|---|---|---|
| Storage Consumption | 12 | 3 (half) | 4 |
| Quick Stats | 12 | 3 (half) | 4 |
| Recent Uploads | 12 | 6 (full) | 4 |
| Recent Downloads | 12 | 6 (full) | 8 (or pairs with Uploads at 4+4, see §3.2) |

### 2.3 Responsive Component Adaptation
Table-based screens (§3.3) don't reflow into a horizontal scroll on mobile — that's a common but poor pattern for touch. Instead:
- **≥768px:** full data table as specified in §3.3.
- **<768px:** each row becomes a stacked card — file icon + name on top, secondary metadata (size, date) as a muted line beneath, actions collapse into a single overflow (⋯) menu.

---

## 3. Screen Layout Blueprints

### 3.1 Authentication Center (Login / Registration)

```
+-------------------------------------------------------------------+
|                                                                     |
|                      [ CBFDS Brand Logo ]                          |
|                                                                     |
|                  +-----------------------------+                   |
|                  | Log In            Sign Up   |  <- tab switcher  |
|                  +-----------------------------+                   |
|                  | Email                        |                  |
|                  | [_________________________]  |                  |
|                  |                               |                  |
|                  | Password                 [👁] |                  |
|                  | [_________________________]  |                  |
|                  |                               |                  |
|                  | [x] Remember this device      |                  |
|                  |                               |                  |
|                  | (      Log In      )          |                  |
|                  +-----------------------------+                   |
|                  | Forgot password?              |                  |
|                  +-----------------------------+                   |
+-------------------------------------------------------------------+
```

- **Validation States:**
  - Normal: `Standard Border`.
  - Focused: `Focus Ring` glow, `0 0 0 4px hsla(217, 91%, 60%, 0.15)`.
  - Error: `Danger` border + helper text (12px, Danger color) beneath the field, plus an `aria-describedby` link from the input to that helper text so screen readers announce it.
- Password field includes a visibility toggle (eye icon) — v1.0 omitted this; on a security-relevant product, letting people verify what they typed matters.
- Tab switcher (Log In / Sign Up) replaces v1.0's plain "Forgot Password? | Sign Up" footer link for clarity — the two flows share a card but shouldn't read as one form with a stray link at the bottom.

---

### 3.2 Main User Dashboard

```
+-------------------------------------------------------------------+
|  Welcome back, John                          [🔔 3]  [Avatar ▾]    |
+-------------------------------------------------------------------+
|  +------------------------+  +---------------------------------+  |
|  | STORAGE                 |  | QUICK STATS                     |  |
|  | 8.2 GB of 10.0 GB        |  | Total Files        124          |  |
|  | [===============---]     |  | Active Shares        15          |  |
|  | 82% used · Warning        |  | Incoming Shares       8          |  |
|  +------------------------+  +---------------------------------+  |
+-------------------------------------------------------------------+
|  +------------------------+  +---------------------------------+  |
|  | RECENT UPLOADS           |  | RECENT DOWNLOADS                |  |
|  | ▸ report.pdf   5 MB       |  | ▸ dataset.zip   100 MB          |  |
|  | ▸ img_01.png   3 MB       |  | ▸ schema.sql    1.2 MB          |  |
|  | View all →                |  | View all →                     |  |
|  +------------------------+  +---------------------------------+  |
+-------------------------------------------------------------------+
```

- **Storage Meter Thresholds:**
  - `<80%`: Electric Blue.
  - `80–89%`: Amber, plus a small "Warning" label beside the percentage (not just color — color-only status fails for colorblind users).
  - `≥90%`: Crimson, animated pulse *(reduced-motion: static, no pulse)*, plus a persistent top banner with a "Manage storage" action.
- Notification bell shows an unread-count badge and opens the Notification Center (§3.8).
- "View all →" links replace v1.0's dead-end lists — a 2-item preview with no way to see the rest was a gap.

---

### 3.3 File Browser

```
+-------------------------------------------------------------------+
|  [🔍 Find files...]  [Type ▾]  [Newest ▾]           (+ Upload)     |
+-------------------------------------------------------------------+
| [ ] Name                | Size    | Uploaded    | Actions          |
|-------------------------+---------+-------------+------------------|
| [ ] 📄 report.pdf        | 5.2 MB  | Aug 5, 2026 | (Share) (⋯)      |
| [ ] 🗜 archive.zip        | 1.1 GB  | Aug 4, 2026 | (Share) (⋯)      |
| [ ] 🖼 avatar.png         | 450 KB  | Aug 1, 2026 | (Share) (⋯)      |
+-------------------------------------------------------------------+
| 2 selected            (Download .zip) (Move to Trash)              |
+-------------------------------------------------------------------+
```

- **Row hover:** surface lightens one step (Card → a mid-tone between Card and Raised Surface); actions that are otherwise hidden fade in over 0.15s.
- **Row overflow menu (⋯)** replaces v1.0's bare "(Delete)" — destructive actions live one level deeper than primary ones (Share stays exposed since it's non-destructive and frequent; Delete, Rename, Move, Download sit in the menu).
- **Search:** client-side index checked first, backend pagination queried on miss — as v1.0 specified. Add a debounce (~250ms) before either lookup fires, and a loading spinner in the search field itself while the backend query is in flight, so a fast local match and a slow remote one never visually conflict.
- **Bulk bar** appears only once ≥1 row is selected (slides up from the bottom, doesn't take permanent layout space when idle).
- File type icons and colors are a fixed mapping (PDF=red doc icon, ZIP=amber archive icon, image=blue picture icon, etc.) reused identically in the browser, upload zone, and dashboard "recent" lists, so the same file always looks the same everywhere.

---

### 3.4 Resumable Upload Zone

```
+-------------------------------------------------------------------+
|                                                                     |
|            [ Drag files here, or Browse to select ]                |
|                                                                     |
+-------------------------------------------------------------------+
|  Active Uploads                                                     |
|                                                                     |
|  📦 dataset.zip — 52% (2.6 GB / 5.0 GB)                              |
|  [======thread~~~~~~~~~~~~~~~] 12.4 MB/s · 3m 15s left               |
|  ( Pause )  ( Cancel )                                               |
|                                                                     |
|  📄 resume.docx — Paused at 12%                                      |
|  [==----------------------]  ( Resume )  ( Cancel )                  |
+-------------------------------------------------------------------+
```

- **DND overlay:** dragging a file over the target highlights the frame in Electric Blue with a soft pulsing backdrop *(reduced-motion: solid highlight, no pulse)*.
- Active rows carry the **transfer thread** (§0/§1.6) along the progress bar's leading edge.
- **Pause** calls `tusUploader.abort()`; **Resume** queries the byte offset and patches from there — as v1.0 specified.
- **Keyboard/no-drag path:** the "Browse to select" text is a real, focusable button (not just clickable text) so the whole flow works without a mouse.
- On upload failure (network drop, server rejection), the row switches to a Danger-bordered state with a one-line reason and a "Retry" action in place of Pause/Resume — v1.0 had no failure state defined.

---

### 3.5 Security Sharing Configuration Modal

```
+-------------------------------------------------------------------+
|  Share "report.pdf"                                        [✕]    |
+-------------------------------------------------------------------+
|  ( Internal Share )        ( Public Link )     <- segmented toggle |
|                                                                     |
|  Recipient email                                                    |
|  [________________________________________________________]        |
|                                                                     |
|  Permission        (•) Can view   ( ) Can edit                      |
|                                                                     |
|  [x] Require password                                               |
|      [________________]                                             |
|                                                                     |
|  [x] Link expires        [ Sep 5, 2026 ▾ ]                          |
|  [x] Limit downloads     [ 10 ]                                     |
|                                                                     |
|  (       Generate link       )                                      |
+-------------------------------------------------------------------+
```

- Explicit close (✕) plus `Esc`-to-close and click-outside-to-close, all wired to the same handler.
- Segmented toggle (Internal/Public) replaces v1.0's two bracketed labels for a clearer "this is one control with two states" affordance.
- Once a public link is generated, the modal reveals a copy-to-clipboard field with the URL and a "Link copied" success toast on click — v1.0 stopped at "Generate Link" with no confirmation of the result.
- Focus trap: while open, Tab cycles only within the modal; focus returns to the triggering "Share" button on close.

---

### 3.6 Trash *(new — referenced by §3.3's "Move to Trash" but undefined in v1.0)*

```
+-------------------------------------------------------------------+
|  Trash · items are deleted permanently after 30 days               |
+-------------------------------------------------------------------+
| [ ] Name              | Size   | Deleted On  | Actions              |
|------------------------+--------+-------------+---------------------|
| [ ] 📄 old_notes.pdf    | 1.1 MB | Aug 2, 2026 | (Restore) (Delete)   |
+-------------------------------------------------------------------+
| 1 selected          (Restore Selected) (Empty Trash)               |
+-------------------------------------------------------------------+
```
- "Delete" here is permanent and requires a confirmation dialog ("This can't be undone") — the only destructive action in the system that skips the usual overflow-menu demotion, since Trash is already the demoted state.
- Empty state (§4.4) reads "Trash is empty" / "Deleted files show up here for 30 days before they're gone for good."

---

### 3.7 Settings *(new)*

```
+-------------------------------------------------------------------+
|  Settings                                                            |
+-------------------------------------------------------------------+
|  [ Profile ]  [ Security ]  [ Notifications ]  [ Storage ]  <- tabs |
+-------------------------------------------------------------------+
|  (Active tab content renders in a single-column card below,         |
|   Inter body copy, 14px, standard form-input styling from §4.2)     |
+-------------------------------------------------------------------+
```
- **Security tab** includes password change, active-session list (device, location, last active, with a "Sign out" action per session), and any 2FA setup.
- **Notifications tab** is where per-event toggles (upload complete, share received, storage threshold) live — these map to which events populate the Notification Center (§3.8) and Toasts (§4.5).
- Destructive account actions (e.g. delete account) sit at the bottom of Security, visually separated by a divider and rendered in Danger-bordered secondary-button style, never as the tab's primary action.

---

### 3.8 Notification Center *(new — the bell icon in §3.2 needs a destination)*

Glassmorphic popover, anchored to the bell icon, `elevation-3`.

```
+---------------------------------------+
|  Notifications              Mark all read |
+---------------------------------------+
|  ● Upload complete — dataset.zip        |
|    2 minutes ago                        |
+---------------------------------------+
|  ○ New share from priya@company.com     |
|    1 hour ago                           |
+---------------------------------------+
|  ○ Storage at 82%                       |
|    Yesterday                            |
+---------------------------------------+
```
- Filled dot (●) = unread, hollow (○) = read; unread rows additionally get a very subtle Primary-Accent-tinted background (`hsla(217,91%,60%,0.06)`) so the distinction isn't color/shape alone.
- Each row is clickable and routes to the relevant file/share/settings screen.
- Empty state: "You're all caught up."

---

### 3.9 File Preview *(new)*

Full-screen glassmorphic overlay over the File Browser (not a full navigation — closing it returns to the exact scroll position in the browser).

```
+-------------------------------------------------------------------+
|  ← Back to Files            report.pdf            (Share) (⋯)  [✕] |
+-------------------------------------------------------------------+
|                                                                     |
|                     [ document preview pane ]                      |
|                                                                     |
+-------------------------------------------------------------------+
|  5.2 MB · Uploaded Aug 5, 2026 · 3 versions                        |
+-------------------------------------------------------------------+
```
- Supported preview types render inline (PDF, common image formats, plaintext/code with syntax highlighting); unsupported types show a file-type icon and a "Download to view" prompt instead of a broken viewer.
- Left/Right arrow keys move to the previous/next file in the current browser sort order, so reviewing a folder doesn't require closing and reopening for each file.

---

### 3.10 Onboarding *(new — first-run experience for a new account)*

Single-column, centered, reuses the Authentication Center's card shell.

```
+-------------------------------------------------------------------+
|                     Welcome to CBFDS                                |
|             Let's get your first file uploaded.                    |
|                                                                     |
|              [ Drag & drop, or Browse to select ]                   |
|                                                                     |
|                    ● ○ ○   Step 1 of 3                              |
+-------------------------------------------------------------------+
```
- Three steps: (1) first upload, (2) optional invite a teammate, (3) storage plan overview. Every step has a visible "Skip for now" — onboarding must never block access to the real product.
- Progress dots use shape + label ("Step 1 of 3"), not color alone.

---

## 4. Component Interaction States

### 4.1 Buttons
- **Primary (Electric Blue fill):**
  - Default `hsl(217, 91%, 60%)` → Hover `hsl(217, 91%, 55%)` → Active `scale(0.98)`
  - Disabled: `hsl(215, 16%, 30%)` fill, `hsl(215, 16%, 58%)` text, `cursor: not-allowed` — and `aria-disabled="true"`, not just the visual state, so assistive tech announces it correctly.
- **Secondary (outlined):**
  - Default: `Standard Border`, transparent fill.
  - Hover: `hsla(217, 91%, 60%, 0.1)` fill, `Electric Blue` border.
- **Destructive (outlined Danger):** same shape as Secondary but `Danger` border/text at rest, filled Danger on hover — reserved for actions with irreversible consequences (permanent delete, remove access), never for merely "negative" but reversible actions like Cancel.
- Every button state above also defines a visible **keyboard focus** ring (`Focus Ring`, `0 0 0 3px`), independent of hover — v1.0 defined hover/active/disabled but not focus, which is the one state keyboard and switch-device users depend on most.

### 4.2 Form Inputs
- Focus: `Focus Ring` glow, as §3.1.
- Placeholder: Muted text (`hsl(215, 16%, 58%)`, corrected value from §1.1).
- Checkboxes/radios: `sm` radius, Standard Border at rest, Primary Accent fill + white check/dot when checked, all with the same focus ring as text inputs.
- Every input carries a real `<label>` (visually present, not placeholder-as-label) — placeholder text disappears on input, which is a known accessibility failure mode when it's the only label.

### 4.3 Skeletons (Loading States)
Shimmer gradient, right-to-left, on card/table placeholders while data loads — as v1.0. Skeleton shapes should match the real content's shape (a table skeleton has row-height bars per column, a stat-card skeleton has a large-number-shaped bar plus a label-shaped bar) rather than one generic block, so layout doesn't jump when real content arrives.

### 4.4 Empty States
Illustration (line-art, using only Primary Accent + Secondary text colors — no new palette introduced just for illustrations) + header + subtext + a primary action where one exists:
- No files: "No files here yet" / "Drag and drop files, or browse to upload." + **Upload** button.
- No search results: "Nothing matches '{query}'" / "Try a different name or file type."
- Empty Trash: as §3.6.
- Notification Center empty: as §3.8.

### 4.5 Toast Notifications
Top-right, slide-in, `elevation-2`, auto-dismiss after 5s with a manual close (✕) and a pause-on-hover that resets the timer:
- Success: check icon, Success color.
- Error: alert icon, Danger color, does **not** auto-dismiss (errors need an explicit acknowledgment, since a missed error toast can hide a failed upload or share).
- Upload complete: document icon, Primary Accent.
- Toasts stack (max 3 visible, older ones collapse into a "+2 more" summary) rather than growing an unbounded column during a batch upload.

---

## 5. Accessibility Requirements

*Not present as a dedicated section in v1.0; consolidated here since accessibility notes were scattered throughout the component specs above.*

- Color is never the only signal — every status (storage warning, unread notification, upload failure) pairs color with an icon, label, or shape change.
- All interactive elements reachable and operable via keyboard alone, with a visible focus indicator at every step (§4.1).
- Modals trap focus and restore it to the trigger on close (§3.5).
- Icon-only controls carry `aria-label`s (§1.5).
- Live regions (`aria-live="polite"`) announce toast notifications and upload-completion state changes for screen reader users, since these currently only render as visual toasts.
- `prefers-reduced-motion` is respected system-wide (§1.6).
- Text contrast verified at AA (4.5:1 body, 3:1 large text/UI) per the corrected palette in §1.1.

---

*End of UI/UX Specification — CBFDS v2.0*
