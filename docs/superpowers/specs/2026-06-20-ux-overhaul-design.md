# Lumina Waves — UX Overhaul Design

**Date:** 2026-06-20
**Status:** Approved (pending spec review)
**Scope:** Presentation + information-architecture layer only. No schema, RBAC, or
security changes. All existing server actions, role-based redaction, and the
Egyptian-law rights model stay exactly as they are.

## Problem

The app is visually polished but hard to use. The pain is information
architecture and interaction consistency, not aesthetics. Audit findings:

1. **The client detail page does the work of ten pages.** Six parallel
   hierarchies on one screen — contracts → annexes → works → credits, releases →
   tracks, a folder tree, and documents at three levels — rendered as deeply
   indented walls with no way to focus on one thing.
2. **No breadcrumbs anywhere.** In a deeply nested system
   (`client ▸ contract ▸ annex ▸ work`) the user never knows where they are.
   Several creation forms have no back link at all.
3. **Inconsistent interaction patterns.** Some "add" actions open an inline
   toggle form (annex, release, track, folder); others navigate to a full page
   (contract, work). Behaviour is unpredictable.
4. **Lists are dead ends.** `/contracts` and `/works` look clickable but bounce
   to the giant client page instead of a focused detail view. `/documents` is
   read-only — documents can't be opened from it. Search results aren't
   clickable.
5. **No feedback loop.** Create/upload actions silently redirect with no success
   confirmation. Uploads require pasting raw UUIDs for contract/annex.
6. **No design-system layer.** Every page hand-rolls buttons/cards/inputs in raw
   Tailwind. Consistent today only by discipline; no shared primitives, so fixes
   must be copy-pasted and drift is inevitable.

Solid foundations to build on: brand tokens, motion primitives, RBAC redaction,
bilingual AR/EN + RTL, server actions.

## Decisions (from brainstorming)

- **Ambition:** full UX overhaul (not targeted fixes, not audit-only).
- **Visual style:** refresh the visuals *and* fix usability, brand kept
  recognizable.
- **Navigation model:** left sidebar (right side in RTL).
- **E2E selectors:** free to change/replace; tests will be updated to match.

## Design

### 1. Visual direction (refresh, brand preserved)

Keep the gold-on-black identity; fix what hurts readability at data density.

- **Layered surfaces.** Introduce a third elevation level so cards separate from
  the page: `ink` (canvas) → `surface` (cards) → `surface-raised` (popovers,
  modals, raised rows). Strengthen and standardize borders.
- **Gold as accent, not body.** Today gold is used for primary text, badges,
  links, and buttons simultaneously — noisy at density. Reserve gold for primary
  actions, active nav, and brand moments. Functional text uses a clear 3-step
  hierarchy: `foreground` / `muted` / `subtle`.
- **Type + spacing rhythm.** Cinzel (display) for brand/section headers only;
  Tajawal for all functional text. Consistent 4px spacing scale; denser tables;
  calmer line-height for scanning.
- **Semantic status colors.** Add tokens for `neutral / info / success /
  warning / danger` so contract/work/document statuses (Draft, Executed, Active,
  Expired, etc.) read at a glance instead of all rendering gold/muted.

New design tokens live in `globals.css` `@theme` alongside the existing ones.

### 2. Navigation & information architecture

- **Left sidebar** (right side under RTL): brand at top; section links —
  *Overview, Clients, Contracts, Works, Documents, Search*; user name + role
  badge + sign-out pinned at the bottom; collapsible on desktop, drawer on
  mobile. Replaces the current sticky top bar (`AppNav`). Active state and
  RBAC-driven visibility preserved.
- **Breadcrumbs on every inner page**, e.g.
  `Clients ▸ {client} ▸ Contracts ▸ {contract} ▸ Annex 3 ▸ {work}`.
- **Overview/dashboard landing** at `/overview`: counts, recent activity, quick
  actions — instead of dumping the user on the raw clients grid. Post-login the
  `/` redirect points to `/overview` (today it points to `/clients`). `/clients`
  remains the full clients list.

### 3. Break up the client detail page

Replace six-hierarchies-on-one-screen with a **client hub + tabs**:

- Persistent client header: identity (stage/legal name), contact, redaction
  state (national ID lock chip with an explanatory tooltip).
- Tabs: **Contracts · Releases · Folders · Documents**. Each tab renders only
  its own hierarchy.
- **New focused detail routes** so lists link somewhere useful instead of
  bouncing to the hub:
  - `/contracts/[id]` — contract detail (summary, annexes, works, documents,
    generate-PDF action).
  - `/works/[id]` — work detail (title, credits, parent annex/contract/client,
    status).
  - Document open/download is handled by the existing secured document route;
    surfaced from lists and detail views (RBAC-gated as today).

### 4. Consistent interactions

- **One "add" pattern.** Quick items (annex, track, folder, attach-document) use
  a **modal Dialog**. Complex multi-section creates (contract, work) stay
  full-page but gain breadcrumb + explicit cancel/back. No more guessing whether
  a button opens a form or navigates.
- **Actionable lists.** `/contracts`, `/works`, `/documents` rows link to their
  own detail view; documents are openable/downloadable inline (RBAC-respecting);
  search results are clickable to the matched record.
- **Pickers, not UUIDs.** The upload form replaces raw contract/annex ID text
  inputs with client → contract → annex pickers.

### 5. Feedback layer

- **Toasts** for every create/update/delete/upload — success and error
  (currently silent redirects).
- **Empty states** with a clear primary CTA on every list and tab.
- **Loading + error consistency** via shared skeleton and error-boundary
  components.

### 6. Reusable design-system layer (`src/components/ui/`)

Build the missing primitives and migrate pages onto them so consistency is
structural, not manual. All RTL-aware; all respect existing RBAC redaction.

- `Button` (variants: primary/secondary/ghost/danger; sizes; loading state)
- `Card` (+ header/body/footer slots)
- `Field` wrapper, `Input`, `Textarea`, `Select`, `FileInput` (label + hint +
  error)
- `Badge` (semantic variants)
- `Breadcrumb`
- `Dialog` (modal, focus-trapped, ESC/overlay close, RTL-aware)
- `Toast` + provider/hook
- `Tabs`
- `Table` (header, rows, empty fallback)
- `EmptyState`
- `Skeleton`
- `Sidebar` (with `SidebarLink`, collapse, mobile drawer)

Accessibility baseline for every primitive: keyboard operable, visible focus
ring, correct ARIA, motion-reduced safe (reuse existing motion primitives).

## Out of scope

- Prisma schema, migrations, domain model.
- RBAC rules and the redaction policy (presentation must keep enforcing them, but
  the rules themselves don't change).
- Auth flow, security routes, document storage/serving internals.
- Search backend (Meilisearch) — only the results UI becomes clickable.
- New business features beyond detail views for existing data.

## Risks / constraints

- **Next 16 conventions** differ from older Next; consult
  `node_modules/next/dist/docs/` before writing routing/layout code (per repo
  AGENTS.md).
- **RTL correctness** must hold across sidebar, breadcrumbs, dialogs, and tables.
- **RBAC redaction** must be preserved in every new view and list — verify the
  national-ID/role redaction still holds on the new detail pages.
- **Tests:** existing Playwright e2e selectors will break and will be rewritten
  to match the new UI; unit tests for new UI primitives added where it adds
  value.

## Success criteria

- A user can reach any record (client, contract, annex, work, document) and know
  where they are via the sidebar + breadcrumbs, without landing on a wall of
  nested content.
- Every list links to a focused detail view; no list is a dead end.
- Every "add" action behaves predictably (modal for quick, full-page for
  complex) and confirms success with a toast.
- Pages are composed from shared `ui/` primitives, not bespoke per-page Tailwind.
- Bilingual AR/EN + RTL and all RBAC redaction continue to work.
- CI green (lint, tsc, unit, build, e2e rewritten to the new UI).
