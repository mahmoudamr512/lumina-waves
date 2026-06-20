# UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Lumina Waves easy to navigate by replacing the top bar with a sidebar, adding breadcrumbs + focused detail pages, breaking up the monster client page into tabs, introducing a reusable `ui/` design-system layer, and adding a feedback layer (toasts, empty states) — without touching schema, RBAC, or security.

**Architecture:** A new `src/components/ui/` primitive layer (tokens-driven, RTL-aware, RBAC-agnostic presentation) is built first; the app shell and every page are then migrated onto it. Server actions, redaction, and routing data-loading stay as-is; only the presentation and information architecture change.

**Tech Stack:** Next 16 (App Router, `(app)` route group, RSC + server actions), React 19, Tailwind v4 (`@theme` tokens in `globals.css`), Framer Motion (existing `motion/` primitives), next-intl (AR/EN + RTL), Prisma 7 (read-only here), Vitest + Testing Library (unit), Playwright (e2e).

## Global Constraints

- **Next 16 is not the Next you know.** Before writing any routing/layout/server-component code, read the relevant guide under `node_modules/next/dist/docs/` (per `lumina/AGENTS.md`). Heed deprecation notices.
- **No schema, RBAC, or security changes.** Reuse existing server actions and the role-based redaction exactly. Presentation must keep enforcing redaction; never expose a field the server redacted.
- **Auth gate** lives in `src/proxy.ts` (NOT `middleware.ts`).
- **Prisma client** import path is `@/generated/prisma/client`.
- **RTL-first.** Every component uses logical properties (`ms-`/`me-`/`ps-`/`pe-`/`start`/`end`, `rtl:`/`ltr:` only when unavoidable). Verify in both `dir=rtl` (Arabic, default) and `dir=ltr` (English).
- **Bilingual.** All user-facing strings go through next-intl (`useTranslations` / `getTranslations`); add keys to BOTH `src/messages/ar.json` and `src/messages/en.json`. Arabic is the primary/default locale.
- **className helper** is `@/lib/cn` (`cn(...classes)`), not `clsx`/`tailwind-merge`.
- **Motion** must be reduced-motion safe — reuse `@/components/motion` (`FadeIn`, `Stagger`, `StaggerItem`, `Reveal`); do not hand-roll animations.
- **Commit after every task.** Co-author trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Verify visually.** This is a UI plan; many tasks' "test" is a controller visually confirming a screenshot in addition to unit tests. The dev server runs from `lumina/` (`npm run dev`). RBAC-sensitive views must be checked logged in as the seeded admin.

---

## File Structure

New files (design-system layer — one responsibility each):

```
lumina/src/components/ui/
  Button.tsx          # button + link-button, variants/sizes/loading
  Card.tsx            # Card + CardHeader/CardBody/CardFooter
  Field.tsx           # Field wrapper (label + hint + error) + Input/Textarea/Select/FileInput
  Badge.tsx           # semantic Badge + status→variant mapping helper
  Breadcrumb.tsx      # Breadcrumb + Crumb
  EmptyState.tsx      # icon + title + body + CTA slot
  Skeleton.tsx        # shimmer block + a few presets
  Table.tsx           # Table/THead/TBody/TR/TH/TD + empty fallback
  Tabs.tsx            # client Tabs driven by ?tab= search param
  Dialog.tsx          # modal dialog (focus trap, ESC/overlay, RTL)
  Toast.tsx           # ToastProvider + useToast hook + viewport
  Sidebar.tsx         # Sidebar + SidebarLink + collapse + mobile drawer
  icons.tsx           # small inline SVG icon set used by nav/empty states
  index.ts            # barrel
```

Modified (shell + pages, migrated onto `ui/`):

```
lumina/src/app/globals.css                         # new tokens
lumina/src/messages/{ar,en}.json                   # new keys
lumina/src/app/(app)/layout.tsx                    # sidebar shell + providers
lumina/src/components/layout/AppShell.tsx          # sidebar-aware layout (or new AppSidebarShell)
lumina/src/app/page.tsx                            # post-login redirect → /overview
lumina/src/app/(app)/overview/page.tsx             # NEW dashboard
lumina/src/app/(app)/clients/{page,ClientsGrid}.tsx
lumina/src/app/(app)/clients/new/{page,NewClientForm}.tsx
lumina/src/app/(app)/clients/[id]/page.tsx + new tab components
lumina/src/app/(app)/contracts/page.tsx
lumina/src/app/(app)/contracts/[id]/page.tsx       # NEW contract detail
lumina/src/app/(app)/works/page.tsx
lumina/src/app/(app)/works/[id]/page.tsx           # NEW work detail
lumina/src/app/(app)/documents/page.tsx
lumina/src/app/(app)/documents/upload/{page,UploadDocumentForm}.tsx
lumina/src/app/(app)/search/page.tsx
lumina/src/app/(app)/clients/[id]/contracts/new/NewContractForm.tsx
lumina/src/app/(app)/clients/[id]/annexes/[annexId]/works/new/AddWorkForm.tsx
lumina/src/app/(app)/contracts/[id]/generate/GenerateContractForm.tsx
lumina/tests/e2e/*                                 # rewritten selectors
```

Vitest component tests live next to source as `*.test.tsx` (match existing test convention — confirm by checking an existing unit test before writing the first one).

---

## Phase A — Foundation

### Task 1: Design tokens

**Files:**
- Modify: `lumina/src/app/globals.css`

**Interfaces:**
- Produces: CSS custom properties usable as Tailwind v4 utilities — `bg-surface-raised`, `text-subtle`, `border-line`, `bg-success/10`, `text-success`, plus `info/warning/danger/neutral`.

- [ ] **Step 1: Add elevation, text-hierarchy, line, and semantic tokens to `@theme`.** Append inside the existing `@theme { … }` block (keep all current tokens):

```css
  /* Elevation surfaces (third level for popovers/modals/raised rows) */
  --color-surface-raised: #1d1d24;

  /* Text hierarchy (3 steps) — foreground/muted exist; add subtle */
  --color-subtle: #6b6b73;

  /* Standard line/border (stronger + neutral, for data density) */
  --color-line: rgba(255, 255, 255, 0.08);
  --color-line-strong: rgba(255, 255, 255, 0.14);

  /* Semantic status palette (text + tint backgrounds via /N opacity) */
  --color-neutral: #9a9aa2;
  --color-info: #6aa9e9;
  --color-success: #57b894;
  --color-warning: #d9a23b;
  --color-danger: #e06b6b;
```

- [ ] **Step 2: Add a focus-ring utility class** below the `.text-gold-metallic` block, for consistent keyboard focus across primitives:

```css
/* Consistent keyboard focus ring used by all interactive ui/ primitives. */
.focus-ring {
  outline: none;
}
.focus-ring:focus-visible {
  outline: 2px solid var(--color-gold-400);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Verify build picks up tokens.** Run from `lumina/`: `npm run build` (or `npx tsc --noEmit` is not enough — tokens are CSS). Quick check: `npm run dev`, open the home page, confirm no CSS errors in console.

Expected: dev server compiles, no "unknown utility" errors.

- [ ] **Step 4: Commit**

```bash
git add lumina/src/app/globals.css
git commit -m "feat(ui): add elevation, text-hierarchy, line, and semantic status tokens"
```

### Task 2: i18n keys for nav + ui

**Files:**
- Modify: `lumina/src/messages/en.json`, `lumina/src/messages/ar.json`

**Interfaces:**
- Produces: translation namespaces `nav.overview`, `ui.*` (shared UI strings: `loading`, `close`, `cancel`, `save`, `back`, `noResults`, `required`, `optional`), `status.*` (semantic status labels), consumed by every later task.

- [ ] **Step 1: Add keys to `en.json`.** Merge into the existing object (do not remove current keys):

```json
{
  "nav": { "overview": "Overview" },
  "ui": {
    "loading": "Loading…",
    "close": "Close",
    "cancel": "Cancel",
    "save": "Save",
    "back": "Back",
    "noResults": "Nothing here yet",
    "required": "Required",
    "optional": "Optional",
    "menu": "Menu"
  },
  "breadcrumb": { "home": "Overview" }
}
```

(Use a JSON deep-merge by hand — keep `nav.clients` etc. Place `nav.overview` inside the existing `nav` object.)

- [ ] **Step 2: Add the Arabic equivalents to `ar.json`** with the same keys: `overview`→"نظرة عامة", `loading`→"جارٍ التحميل…", `close`→"إغلاق", `cancel`→"إلغاء", `save`→"حفظ", `back`→"رجوع", `noResults`→"لا يوجد شيء بعد", `required`→"مطلوب", `optional`→"اختياري", `menu`→"القائمة", `breadcrumb.home`→"نظرة عامة".

- [ ] **Step 3: Verify JSON validity.** Run from `lumina/`: `node -e "JSON.parse(require('fs').readFileSync('src/messages/en.json'));JSON.parse(require('fs').readFileSync('src/messages/ar.json'));console.log('ok')"`

Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add lumina/src/messages/
git commit -m "i18n: add nav.overview, ui.*, breadcrumb keys (AR/EN)"
```

---

## Phase B — Design-system primitives (`src/components/ui/`)

> Build order matters: later primitives import earlier ones. Each primitive task = create file + one focused render/behaviour test + visual sanity. Before writing the first `*.test.tsx`, read one existing unit test (e.g. under `lumina/tests/` or `src/**/*.test.ts`) to match the project's test runner setup and import style.

### Task 3: Button

**Files:**
- Create: `lumina/src/components/ui/Button.tsx`
- Test: `lumina/src/components/ui/Button.test.tsx`

**Interfaces:**
- Produces:
  - `Button(props: ButtonProps)` where `ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md'; loading?: boolean }`
  - `buttonClasses(variant?, size?): string` — exported so `LinkButton` and `next/link` call sites share the exact styles.
  - `LinkButton` is NOT created here; pages use `<Link className={buttonClasses('primary')}>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders label and is disabled while loading', () => {
  render(<Button loading>Save</Button>)
  const btn = screen.getByRole('button', { name: /save/i })
  expect(btn).toBeDisabled()
})

test('applies the primary variant by default', () => {
  render(<Button>Go</Button>)
  expect(screen.getByRole('button', { name: 'Go' }).className).toMatch(/bg-gold-400/)
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/components/ui/Button.test.tsx`
Expected: FAIL (cannot find `./Button`).

- [ ] **Step 3: Implement**

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gold-400 text-ink hover:bg-gold-300',
  secondary: 'border border-line-strong text-foreground hover:bg-white/5',
  ghost: 'text-muted hover:bg-white/5 hover:text-foreground',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-ring disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className, ...rest }: ButtonProps) {
  return (
    <button className={cn(buttonClasses(variant, size), className)} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Run test, verify pass.** Run: `npx vitest run src/components/ui/Button.test.tsx` → PASS.
- [ ] **Step 5: Commit** `feat(ui): Button primitive with variants, sizes, loading state`

### Task 4: Card

**Files:**
- Create: `lumina/src/components/ui/Card.tsx`
- Test: `lumina/src/components/ui/Card.test.tsx`

**Interfaces:**
- Produces: `Card`, `CardHeader`, `CardBody`, `CardFooter` — each `({ children, className }: { children: ReactNode; className?: string })`. `Card` also accepts `as?: 'div'|'article'|'section'` and an optional `interactive?: boolean` (adds hover elevation, for clickable cards).

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardBody } from './Card'

test('composes header and body', () => {
  render(<Card><CardHeader>H</CardHeader><CardBody>B</CardBody></Card>)
  expect(screen.getByText('H')).toBeInTheDocument()
  expect(screen.getByText('B')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ children, className, as: As = 'div', interactive }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'section'; interactive?: boolean }) {
  return (
    <As className={cn('rounded-xl border border-line bg-surface', interactive && 'transition hover:border-line-strong hover:bg-surface-raised', className)}>
      {children}
    </As>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between gap-3 border-b border-line px-5 py-4', className)}>{children}</div>
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-t border-line px-5 py-3', className)}>{children}</div>
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): Card primitive (header/body/footer, interactive)`

### Task 5: Field + form inputs

**Files:**
- Create: `lumina/src/components/ui/Field.tsx`
- Test: `lumina/src/components/ui/Field.test.tsx`

**Interfaces:**
- Produces:
  - `Field({ label, hint, error, required, htmlFor, children }: { label: string; hint?: string; error?: string; required?: boolean; htmlFor?: string; children: ReactNode })`
  - `Input` (extends `input` props), `Textarea`, `Select` (extends `select`, children = options), `FileInput` (extends `input type=file`) — all forward `id`/`name`, share a base class, show an error ring when `aria-invalid`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Field, Input } from './Field'

test('Field associates label and shows error', () => {
  render(<Field label="Name" htmlFor="name" error="Required"><Input id="name" /></Field>)
  expect(screen.getByLabelText('Name')).toBeInTheDocument()
  expect(screen.getByText('Required')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (base input class shared; error → `aria-invalid` styling)

```tsx
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const base = 'w-full rounded-lg border border-line-strong bg-ink-soft px-3 py-2 text-sm text-foreground placeholder:text-subtle focus-ring aria-[invalid=true]:border-danger'

export function Field({ label, hint, error, required, htmlFor, children }: { label: string; hint?: string; error?: string; required?: boolean; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-gold-400"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...p} />
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'min-h-24', className)} {...p} />
}
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, className)} {...p}>{children}</select>
}
export function FileInput({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="file" className={cn('w-full text-sm text-muted file:me-3 file:rounded-md file:border-0 file:bg-gold-400 file:px-3 file:py-1.5 file:text-ink', className)} {...p} />
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): Field wrapper + Input/Textarea/Select/FileInput`

### Task 6: Badge + status mapping

**Files:**
- Create: `lumina/src/components/ui/Badge.tsx`
- Test: `lumina/src/components/ui/Badge.test.tsx`

**Interfaces:**
- Produces:
  - `Badge({ variant, children }: { variant?: 'neutral'|'info'|'success'|'warning'|'danger'|'gold'; children: ReactNode })`
  - `statusVariant(status: string): BadgeVariant` — maps domain statuses to variants. Inspect the existing enums in the Prisma schema / current pages for the real status strings before writing the map; cover at minimum: `DRAFT→neutral`, `EXECUTED→success`, `ACTIVE→success`, `EXPIRED→warning`, `TERMINATED/VOID→danger`, anything else→`neutral`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Badge, statusVariant } from './Badge'

test('maps EXECUTED to success and renders', () => {
  expect(statusVariant('EXECUTED')).toBe('success')
  render(<Badge variant={statusVariant('DRAFT')}>Draft</Badge>)
  expect(screen.getByText('Draft')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (tint background `/15`, solid text token; `gold` reuses brand)

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'gold'

const STYLES: Record<Variant, string> = {
  neutral: 'bg-white/5 text-muted',
  info: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  gold: 'bg-gold-400/15 text-gold-200',
}

export function Badge({ variant = 'neutral', children }: { variant?: Variant; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[variant])}>{children}</span>
}

export function statusVariant(status: string): Variant {
  const s = status.toUpperCase()
  if (['EXECUTED', 'ACTIVE', 'SIGNED', 'PUBLISHED'].includes(s)) return 'success'
  if (['EXPIRED', 'PENDING'].includes(s)) return 'warning'
  if (['TERMINATED', 'VOID', 'CANCELLED', 'REJECTED'].includes(s)) return 'danger'
  if (s === 'DRAFT') return 'neutral'
  return 'neutral'
}
```

(Adjust the lists to the actual enum values found in the schema.)

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): semantic Badge + statusVariant mapping`

### Task 7: Breadcrumb

**Files:**
- Create: `lumina/src/components/ui/Breadcrumb.tsx`
- Test: `lumina/src/components/ui/Breadcrumb.test.tsx`

**Interfaces:**
- Produces: `Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> })`. Last item = current page (no link, `aria-current="page"`). Separator is a chevron that flips correctly under RTL (use a logical separator, e.g. `›` rendered with `rtl:rotate-180` or an inline icon).

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from './Breadcrumb'

test('last item is current and unlinked', () => {
  render(<Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: 'Acme' }]} />)
  expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/clients')
  expect(screen.getByText('Acme')).toHaveAttribute('aria-current', 'page')
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** using `next/link`, `<nav aria-label>`, ordered list, muted links + foreground current.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): Breadcrumb primitive (RTL-aware)`

### Task 8: EmptyState + Skeleton

**Files:**
- Create: `lumina/src/components/ui/EmptyState.tsx`, `lumina/src/components/ui/Skeleton.tsx`
- Test: `lumina/src/components/ui/EmptyState.test.tsx`

**Interfaces:**
- Produces:
  - `EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode })`
  - `Skeleton({ className }: { className?: string })` + `SkeletonRows({ rows }: { rows?: number })`

- [ ] **Step 1: Failing test** — render `EmptyState` with title + action, assert both present.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.** EmptyState: centered, icon in a muted circle, title (foreground), body (muted), action slot. Skeleton: `animate-pulse rounded bg-white/5` block; `SkeletonRows` renders N stacked bars. Respect reduced motion (Tailwind `motion-reduce:animate-none`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): EmptyState + Skeleton primitives`

### Task 9: Table

**Files:**
- Create: `lumina/src/components/ui/Table.tsx`
- Test: `lumina/src/components/ui/Table.test.tsx`

**Interfaces:**
- Produces: `Table`, `THead`, `TBody`, `TR` (accepts optional `href?: string` → renders a row that navigates via `next/link` wrapping, keyboard accessible), `TH`, `TD`. `Table` accepts `empty?: ReactNode` shown when no rows.

- [ ] **Step 1: Failing test** — render a table with one `TR href="/x"`, assert the row is reachable as a link to `/x`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.** Semantic `<table>` with `w-full`; header row muted uppercase tracking; `TR` with `href` renders cells but makes the whole row a link target (wrap content in `Link`, or use an overlay link + `relative` row) and adds hover `bg-surface-raised`, `focus-ring`. Provide `empty` fallback when `TBody` has no children — simplest: pages pass `empty` and conditionally render `EmptyState` instead of `TBody`; document that pattern in a comment.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): Table primitive with linkable rows`

### Task 10: Tabs

**Files:**
- Create: `lumina/src/components/ui/Tabs.tsx`
- Test: `lumina/src/components/ui/Tabs.test.tsx`

**Interfaces:**
- Produces: `Tabs({ tabs, param, active }: { tabs: Array<{ key: string; label: string }>; param?: string; active: string })` — a client component (`'use client'`) rendering a tablist where each tab is a `next/link` to the same path with `?{param}={key}` (default param `tab`); the `active` key gets selected styling + `aria-selected`. Content is rendered by the SERVER page based on the search param (Tabs renders only the tab strip), keeping data-loading on the server. Document this contract in the file header.

- [ ] **Step 1: Failing test** — render with `active='contracts'`, assert that tab has `aria-selected="true"` and links carry `?tab=`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** with `usePathname` + `useSearchParams` to preserve other params; underline-style active indicator using gold.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): Tabs strip (search-param driven, server renders panel)`

### Task 11: Dialog

**Files:**
- Create: `lumina/src/components/ui/Dialog.tsx`
- Test: `lumina/src/components/ui/Dialog.test.tsx`

**Interfaces:**
- Produces:
  - `Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode })` — `'use client'`, portal to `document.body`, overlay click + ESC close, focus trap (focus first focusable on open, restore on close), `role="dialog"` `aria-modal` `aria-labelledby`. RTL inherits from `<html dir>`.
  - `DialogTrigger` is NOT provided; callers manage `open` state (see Task 24 pattern).

- [ ] **Step 1: Failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog } from './Dialog'

test('renders when open and closes on ESC', () => {
  const onClose = vi.fn()
  render(<Dialog open title="Add" onClose={onClose}><p>Body</p></Dialog>)
  expect(screen.getByRole('dialog', { name: 'Add' })).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalled()
})

test('renders nothing when closed', () => {
  render(<Dialog open={false} title="Add" onClose={() => {}}><p>Body</p></Dialog>)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** with `createPortal`, `useEffect` for ESC + body scroll lock + focus management; overlay `bg-ink/70 backdrop-blur-sm`, panel `bg-surface-raised border border-line-strong rounded-xl`. Guard `createPortal` for SSR (only portal after mount).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): accessible modal Dialog (portal, focus trap, ESC/overlay)`

### Task 12: Toast

**Files:**
- Create: `lumina/src/components/ui/Toast.tsx`
- Test: `lumina/src/components/ui/Toast.test.tsx`

**Interfaces:**
- Produces:
  - `ToastProvider({ children })` — `'use client'`, holds toast state + renders a fixed viewport (top/end under RTL).
  - `useToast(): { toast: (t: { title: string; description?: string; variant?: 'success'|'error'|'info' }) => void }`
  - Toasts auto-dismiss after ~4s; dismissable; `role="status"` / `aria-live="polite"`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast'

function Trigger() {
  const { toast } = useToast()
  return <button onClick={() => toast({ title: 'Saved' })}>go</button>
}

test('shows a toast on demand', () => {
  render(<ToastProvider><Trigger /></ToastProvider>)
  act(() => { screen.getByText('go').click() })
  expect(screen.getByText('Saved')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** context + reducer; variant icon/color via semantic tokens; viewport `fixed top-4 end-4 z-50 flex flex-col gap-2`. Use a module counter for ids (NOT `Math.random`/`Date.now` in render — use a `useRef` counter inside provider).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(ui): Toast provider + useToast hook`

### Task 13: icons + barrel index

**Files:**
- Create: `lumina/src/components/ui/icons.tsx`, `lumina/src/components/ui/index.ts`

**Interfaces:**
- Produces: a small set of inline SVG icon components (`IconOverview`, `IconClients`, `IconContracts`, `IconWorks`, `IconDocuments`, `IconSearch`, `IconChevron`, `IconPlus`, `IconLock`, `IconFolder`, `IconMenu`, `IconClose`) each `({ className }: { className?: string })`, `aria-hidden`, `currentColor` stroke; and `index.ts` re-exporting every primitive + icons.

- [ ] **Step 1: Create `icons.tsx`** — 24×24 stroke icons, `fill="none" stroke="currentColor" strokeWidth={1.75}`. Keep them simple/consistent.
- [ ] **Step 2: Create `index.ts`** re-exporting: `Button`, `buttonClasses`, `Card`/`CardHeader`/`CardBody`/`CardFooter`, `Field`/`Input`/`Textarea`/`Select`/`FileInput`, `Badge`/`statusVariant`, `Breadcrumb`, `EmptyState`, `Skeleton`/`SkeletonRows`, `Table`/`THead`/`TBody`/`TR`/`TH`/`TD`, `Tabs`, `Dialog`, `ToastProvider`/`useToast`, `Sidebar` (added in Task 14), and `* from './icons'`.
- [ ] **Step 3: Typecheck.** Run from `lumina/`: `npx tsc --noEmit` → no errors (Sidebar export added next task; if tsc complains, add the Sidebar export line in Task 14 — note the dependency).
- [ ] **Step 4: Commit** `feat(ui): icon set + barrel index`

---

## Phase C — App shell

### Task 14: Sidebar

**Files:**
- Create: `lumina/src/components/ui/Sidebar.tsx`
- Modify: `lumina/src/components/ui/index.ts` (add Sidebar export)
- Test: `lumina/src/components/ui/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `icons.tsx`, `cn`, next-intl `useTranslations`, `next/navigation` `usePathname`, `next-auth/react` `signOut`.
- Produces: `Sidebar({ name, role, items }: { name: string; role: string; items: Array<{ href: string; key: string; icon: ReactNode }> })` — `'use client'`. Persistent vertical nav: brand at top, section links with active state (`pathname === href || startsWith(href+'/')`), user name + role badge + sign-out pinned at bottom. Collapsible on desktop (toggle stored in `localStorage`), mobile drawer (hidden behind a hamburger; the hamburger lives in a slim mobile top bar rendered by the shell — see Task 15). Active link gets `bg-gold-400/10 text-gold-200`, `aria-current="page"`.

- [ ] **Step 1: Failing test** — render with two items, set `usePathname` mock to first href, assert that link has `aria-current="page"`. (Mock `next/navigation` + `next-auth/react` + `next-intl` per existing test setup.)
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.** Use `ROLE_LABELS` from `@/lib/arabic` for the role badge (already used by `AppNav`). Reuse `LuminaLogo` from `@/components/brand`. Translations from `nav` namespace. Keep `LocaleSwitcher` (from `@/components/pwa/LocaleSwitcher`) and the sign-out button in the bottom block. Width `w-60` expanded / `w-16` collapsed; `border-e border-line`. Mobile: off-canvas drawer with overlay, controlled by an internal `open` state + a prop-less exported hamburger is unnecessary — instead expose drawer open via internal state and render the toggle inside Sidebar for mobile, OR accept it's controlled by the shell. Decision: Sidebar owns its own mobile drawer state and renders its own hamburger inside a mobile-only bar. Document this in the file header.
- [ ] **Step 4: Add `export { Sidebar } from './Sidebar'` to `index.ts`.**
- [ ] **Step 5: Run test → PASS;** `npx tsc --noEmit` → clean.
- [ ] **Step 6: Commit** `feat(ui): Sidebar nav (active state, collapse, mobile drawer, RTL)`

### Task 15: Wire the new shell into the authenticated layout

**Files:**
- Modify: `lumina/src/app/(app)/layout.tsx`
- Create: `lumina/src/components/layout/AppSidebarShell.tsx` (new shell that places Sidebar + content + ambient background; leave `AppShell` for the public/home pages)
- Modify: `lumina/src/components/layout/index.ts` (export the new shell)
- Delete/retire: `lumina/src/components/layout/AppNav.tsx` is no longer used by `(app)/layout` (leave the file or delete; if deleted, remove from `layout/index.ts`).

**Interfaces:**
- Consumes: `Sidebar`, `ToastProvider` from `@/components/ui`; `auth` from `@/lib/auth`.
- Produces: `AppSidebarShell({ nav, breadcrumb, children })` — flex row: `Sidebar` (nav slot) + a column with optional breadcrumb bar + `<main>`. Wraps everything in `ToastProvider`. Includes `AmbientBackground`.

- [ ] **Step 1:** Build `AppSidebarShell` — RTL-aware flex: sidebar on the inline-start, content fills the rest, `<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">`. A breadcrumb slot renders directly above `<main>` when provided.
- [ ] **Step 2:** Update `(app)/layout.tsx` to build the nav items array (with icons from `@/components/ui`), render `AppSidebarShell` with `<Sidebar .../>` and wrap children in `<ToastProvider>`. Keep the server-side `auth()` guard + redirect. Pass `session.user.name/email` and `role`.
- [ ] **Step 3:** Per-page breadcrumbs: since each page knows its own crumbs, render `<Breadcrumb>` at the TOP of each page's JSX (not in the layout). So the layout's breadcrumb slot can be omitted; remove it from the shell to avoid duplication. (Adjust Step 1 accordingly — no breadcrumb slot in shell; pages own their breadcrumb.)
- [ ] **Step 4:** Verify visually. `npm run dev`, log in as seeded admin, confirm: sidebar shows on `/clients`, active highlight correct, sign-out works, locale switch works, mobile drawer opens at <768px, RTL places sidebar on the right. Controller: capture a screenshot at desktop + mobile widths and Read them.
- [ ] **Step 5:** `npx tsc --noEmit` clean; `npm run lint` clean.
- [ ] **Step 6: Commit** `feat(app): sidebar shell + ToastProvider; retire top-bar AppNav`

---

## Phase D — Pages (migrate onto `ui/`, add IA improvements)

> Each page task: (a) add a `Breadcrumb` at the top, (b) replace bespoke Tailwind with `ui/` primitives, (c) preserve all existing server-action wiring + RBAC redaction exactly, (d) add empty states + (where an action exists) success toasts. For toasts on server-action forms, use a small client wrapper that calls `useToast` after the action resolves (the forms are already client components using `useFormState`/`useActionState` or similar — confirm the existing pattern in `NewClientForm.tsx` before wiring). Keep data loading on the server.

### Task 16: Overview dashboard + post-login redirect

**Files:**
- Create: `lumina/src/app/(app)/overview/page.tsx`
- Modify: `lumina/src/app/page.tsx` (redirect logged-in users to `/overview` instead of `/clients`)

**Interfaces:**
- Consumes: Prisma client (counts), `Card`, `Badge`, `buttonClasses`, `EmptyState`, icons.
- Produces: `/overview` route.

- [ ] **Step 1:** Implement `/overview` server component: fetch counts (clients, contracts, works, documents) with `prisma.*.count()` (respect soft-delete filters used elsewhere — check how existing list pages filter `deletedAt`/`purgedAt` and match it). Render a row of stat `Card`s + a "Quick actions" card (links: New client, Upload document) + a "Recent activity" section (latest 5 clients/contracts by `createdAt`; if your audit log is queryable, prefer it — otherwise recent records). Breadcrumb: just `[{ label: t('breadcrumb.home') }]` (current).
- [ ] **Step 2:** Change `page.tsx` redirect target from `/clients` to `/overview`.
- [ ] **Step 3:** Add `overview` to the sidebar nav items (Task 15 array) if not already — ensure it's first.
- [ ] **Step 4:** Verify visually (login → lands on `/overview`, counts correct). Controller screenshot + Read.
- [ ] **Step 5:** `tsc`/`lint` clean.
- [ ] **Step 6: Commit** `feat(overview): dashboard landing with stats + quick actions`

### Task 17: Clients list

**Files:**
- Modify: `lumina/src/app/(app)/clients/page.tsx`, `lumina/src/app/(app)/clients/ClientsGrid.tsx`

- [ ] **Step 1:** Add breadcrumb `[Overview ›] Clients`. Replace the header + "New client" button with `buttonClasses('primary')` link. Migrate cards to `Card interactive` linking to `/clients/[id]`. Keep the national-ID lock chip but wrap the explanation in a `title=`/tooltip and use `Badge variant="neutral"` with `IconLock`. Use the existing `Stagger`/`StaggerItem` motion.
- [ ] **Step 2:** Replace the empty state with `<EmptyState>` (icon, title, body, action = New client button) — only show New-client CTA if `canCreate` (preserve existing RBAC check).
- [ ] **Step 3:** Verify visually + `tsc`/`lint`.
- [ ] **Step 4: Commit** `refactor(clients): migrate list to ui primitives + breadcrumb + empty state`

### Task 18: New client form

**Files:**
- Modify: `lumina/src/app/(app)/clients/new/page.tsx`, `lumina/src/app/(app)/clients/new/NewClientForm.tsx`

- [ ] **Step 1:** Breadcrumb `Clients › New`. Migrate fields to `Field`+`Input`. Submit via `Button loading={pending}`. Keep the server action + error state; render field errors through `Field error=`.
- [ ] **Step 2:** Add a success toast: on action success (the action currently redirects to `/clients`) switch to returning a success result and calling `useToast` then `router.push('/clients')`, OR keep the redirect and show the toast on the clients page via a `?created=1` flag — pick the simpler given the existing action shape; document the choice. Add a Cancel link (`buttonClasses('ghost')` → `/clients`).
- [ ] **Step 3:** Verify create flow end-to-end visually.
- [ ] **Step 4: Commit** `refactor(clients): new-client form on ui primitives + toast + cancel`

### Task 19: Client detail — header + tabs scaffold

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/page.tsx`
- Create: `lumina/src/app/(app)/clients/[id]/_tabs/ContractsTab.tsx`, `ReleasesTab.tsx`, `FoldersTab.tsx`, `DocumentsTab.tsx` (server components; one responsibility each)

**Interfaces:**
- Produces: client hub that renders a persistent header + `Tabs` strip + the active tab panel selected by `searchParams.tab` (default `contracts`). Each `*Tab` receives the already-loaded client data (or loads its own slice) and renders only its hierarchy.

- [ ] **Step 1:** Read the current `page.tsx` fully; identify the four data groups (contracts→annexes→works, releases→tracks, folders, documents). Keep the existing Prisma query (or split per tab if cleaner). Build the header: name (stage/legal), contact, national-ID redaction chip with tooltip, and a primary "Add contract" action. Add breadcrumb `Clients › {client name}`.
- [ ] **Step 2:** Add `Tabs` strip (`contracts|releases|folders|documents`) reading `searchParams.tab`; render the matching `*Tab`. Page signature must accept `searchParams` (Next 16 — confirm the async `searchParams` API in the docs).
- [ ] **Step 3:** Move ONLY the contracts hierarchy markup into `ContractsTab.tsx` for now (other tabs get stubs returning an `EmptyState`/`Skeleton` placeholder filled in Tasks 20–23). Preserve all nested data + RBAC (e.g. "Create PDF" link only for LEGAL/ADMIN). This task's deliverable: header + tabs + Contracts tab showing the same contract data as before, just relocated.
- [ ] **Step 4:** Verify visually that the page no longer shows all six hierarchies at once; switching `?tab=` works; contracts data intact; redaction intact (check as admin AND, if feasible, a lower role).
- [ ] **Step 5:** `tsc`/`lint`.
- [ ] **Step 6: Commit** `feat(client): hub header + tabs; relocate contracts into ContractsTab`

### Task 20: Contracts tab polish + add-contract entry

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/_tabs/ContractsTab.tsx`

- [ ] **Step 1:** Render each contract as a `Card` linking to the new `/contracts/[id]` detail (created Task 25) — header shows type `Badge` + grant/territory/term; do NOT inline the full annex→work tree here anymore (that lives on the contract detail page). Show a compact summary (counts: N annexes, M works) instead.
- [ ] **Step 2:** Empty state when no contracts (`EmptyState` + Add-contract CTA). "Add contract" goes to `/clients/[id]/contracts/new` (full-page create — complex form).
- [ ] **Step 3:** Verify visually + `tsc`/`lint`.
- [ ] **Step 4: Commit** `refactor(client): contracts tab as summary cards linking to contract detail`

### Task 21: Releases tab + add release/track modals

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/_tabs/ReleasesTab.tsx`
- Modify: `lumina/src/app/(app)/clients/[id]/AddReleaseForm.tsx`, `AddTrackForm.tsx` (convert inline-toggle → `Dialog`)

- [ ] **Step 1:** Render releases as `Card`s (title, type `Badge`, status `Badge`, date); tracks listed with credit role chips (`Badge`).
- [ ] **Step 2:** Convert `AddReleaseForm` + `AddTrackForm` from inline toggles to `Dialog`-based quick-add (button opens dialog; form inside uses `Field`/`Input`/`Select`; submit calls the existing server action; on success close dialog + toast). Keep the same server actions + validation.
- [ ] **Step 3:** Empty state when no releases (CTA opens the Add-release dialog).
- [ ] **Step 4:** Verify add-release + add-track flows visually (dialog opens, submits, toast, list updates).
- [ ] **Step 5: Commit** `feat(client): releases tab with modal add-release/add-track`

### Task 22: Folders tab + add folder/subfolder/attach modals

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/_tabs/FoldersTab.tsx`
- Modify: `lumina/src/app/(app)/clients/[id]/AddFolderForm.tsx`, `FolderAttachForm.tsx` (→ `Dialog`)

- [ ] **Step 1:** Render the folder tree with clear indentation using `Card`/borders + `IconFolder`; documents inside folders link to the secured document route (open/download).
- [ ] **Step 2:** Convert Add-folder, Add-subfolder, and Folder-attach-document to `Dialog` quick-adds (same server actions). The attach dialog clearly states which folder it targets in its title.
- [ ] **Step 3:** Empty state; verify flows visually.
- [ ] **Step 4: Commit** `feat(client): folders tab with modal add/attach`

### Task 23: Documents tab

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/_tabs/DocumentsTab.tsx`
- Modify: `lumina/src/app/(app)/clients/[id]/AttachDocumentForm.tsx` (→ `Dialog`)

- [ ] **Step 1:** Aggregate this client's documents (contract-level + annex-level + folder-level + root) into one `Table` with columns: filename (links to secured doc route to open/download), context (which contract/annex/folder), status `Badge`, date. Preserve RBAC on the document route.
- [ ] **Step 2:** Convert `AttachDocumentForm` to a `Dialog`; the dialog lets the user pick the attachment context (reuse the picker approach from Task 33 if shared). Same server action.
- [ ] **Step 3:** Empty state; verify visually.
- [ ] **Step 4: Commit** `feat(client): documents tab (unified table, openable docs, modal attach)`

### Task 24: Add-annex modal

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/AddAnnexButton.tsx`

- [ ] **Step 1:** Convert the hidden-toggle annex form into a `Dialog` quick-add launched from the contract detail page (the annex belongs to a contract — this control now lives on `/contracts/[id]`, Task 25). Same server action; on success close + toast.
- [ ] **Step 2:** Verify visually.
- [ ] **Step 3: Commit** `refactor(contract): add-annex via modal Dialog`

### Task 25: Contract detail page

**Files:**
- Create: `lumina/src/app/(app)/contracts/[id]/page.tsx`

**Interfaces:**
- Consumes: existing contract Prisma query shape (lift the annex→work loading that used to live on the client page), RBAC redaction, `Card`/`Badge`/`Table`/`Breadcrumb`/`Dialog`/`buttonClasses`, `AddAnnexButton` (modal), per-annex "Add work" link, "Create PDF" link (LEGAL/ADMIN).
- Produces: `/contracts/[id]` route.

- [ ] **Step 1:** Breadcrumb `Clients › {client} › Contracts › {contract label}`. Header: contract type `Badge`, grant/territory/term/financials summary, actions: "Create PDF" (RBAC), "Add annex" (modal). Read Next 16 docs for the async `params` API.
- [ ] **Step 2:** Annexes section: each annex card lists its works (`Table`: title, status `Badge`, credit chips) with a per-annex "Add work" link → existing `/clients/[id]/annexes/[annexId]/works/new`. Contract-level + annex-level documents shown with open/download links + attach (modal). Preserve all RBAC.
- [ ] **Step 3:** Empty states (no annexes / no works). Verify visually that the full contract tree that used to bury the client page now lives here, with redaction intact.
- [ ] **Step 4:** `tsc`/`lint`.
- [ ] **Step 5: Commit** `feat(contracts): focused contract detail page`

### Task 26: Work detail page

**Files:**
- Create: `lumina/src/app/(app)/works/[id]/page.tsx`

- [ ] **Step 1:** Breadcrumb `Works › {title}` (or `Clients › {client} › … › {title}` if parent chain is cheap to load). Header: title + status `Badge`. Body: credits table (role + name), parent annex/contract/client links, associated documents (open/download). Read Next 16 docs for async `params`.
- [ ] **Step 2:** Empty/Not-found handling (`notFound()` if missing or soft-deleted). Verify visually.
- [ ] **Step 3: Commit** `feat(works): focused work detail page`

### Task 27: Contracts list actionable

**Files:**
- Modify: `lumina/src/app/(app)/contracts/page.tsx`

- [ ] **Step 1:** Breadcrumb `Contracts`. Replace the row list with `Table`; each row links to `/contracts/[id]` (NOT the client page). Columns: client, type `Badge`, territory, term, status `Badge`. Keep "Create PDF" (RBAC) as a row action. Empty state.
- [ ] **Step 2:** Verify rows navigate to contract detail; `tsc`/`lint`.
- [ ] **Step 3: Commit** `refactor(contracts): list links to contract detail, Table + badges`

### Task 28: Works list actionable

**Files:**
- Modify: `lumina/src/app/(app)/works/page.tsx`

- [ ] **Step 1:** Breadcrumb `Works`. `Table` rows link to `/works/[id]`. Columns: title, client + annex, credits (chips, truncated), status `Badge`. Empty state.
- [ ] **Step 2:** Verify navigation; `tsc`/`lint`.
- [ ] **Step 3: Commit** `refactor(works): list links to work detail`

### Task 29: Documents list actionable + open/download

**Files:**
- Modify: `lumina/src/app/(app)/documents/page.tsx`

- [ ] **Step 1:** Breadcrumb `Documents`. `Table` with columns: filename (links to the existing secured document route `/documents/[docId]` to open/download — confirm the route + RBAC), context (client/contract/annex if loadable), status `Badge`, date. Keep "Upload" button. Empty state.
- [ ] **Step 2:** Verify a document opens/downloads via the secured route and that redaction/RBAC still gates it; `tsc`/`lint`.
- [ ] **Step 3: Commit** `feat(documents): actionable list — open/download via secured route`

### Task 30: New contract form

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/contracts/new/page.tsx`, `NewContractForm.tsx`

- [ ] **Step 1:** Breadcrumb `Clients › {client} › Contracts › New`. Migrate all fields to `Field`+`Input`/`Select`; keep the grant-type conditional logic exactly. Add Cancel link → `/clients/[id]?tab=contracts`. Submit via `Button loading`.
- [ ] **Step 2:** Success toast + redirect to the new contract detail `/contracts/[id]` (or back to the contracts tab). Keep server action + validation/error display.
- [ ] **Step 3:** Verify the full create flow visually (incl. conditional fields).
- [ ] **Step 4: Commit** `refactor(contracts): new-contract form on ui primitives + breadcrumb + cancel + toast`

### Task 31: Add work form

**Files:**
- Modify: `lumina/src/app/(app)/clients/[id]/annexes/[annexId]/works/new/page.tsx`, `AddWorkForm.tsx`

- [ ] **Step 1:** Breadcrumb `Clients › {client} › Contracts › {contract} › Annex {n} › New work` (load enough context for the chain; if expensive, shorten to `… › Add work`). Migrate fields to `Field`/`Input`/`Select`. Cancel → contract detail. Submit `Button loading`.
- [ ] **Step 2:** Success toast + redirect back to the contract detail. Keep server action.
- [ ] **Step 3:** Verify visually.
- [ ] **Step 4: Commit** `refactor(works): add-work form on ui primitives + breadcrumb + toast`

### Task 32: Generate-contract page

**Files:**
- Modify: `lumina/src/app/(app)/contracts/[id]/generate/page.tsx`, `GenerateContractForm.tsx`

- [ ] **Step 1:** Breadcrumb `Contracts › {contract} › Generate PDF`. Migrate the summary to `Card`s + `Badge`s. Add an "Edit contract" link (→ contract detail / its edit path if one exists; if no edit route exists, link to contract detail) so a user who spots an error has a way out. Submit `Button loading`.
- [ ] **Step 2:** Success: keep the download link but also show a success `Toast`; render the download as a `buttonClasses('secondary')` link.
- [ ] **Step 3:** Verify generate + download visually (PDF opens).
- [ ] **Step 4: Commit** `refactor(contracts): generate page on ui primitives + edit escape hatch + toast`

### Task 33: Upload form pickers

**Files:**
- Modify: `lumina/src/app/(app)/documents/upload/page.tsx`, `UploadDocumentForm.tsx`

**Interfaces:**
- Consumes: a server-loaded list of selectable clients→contracts→annexes (minimal `{id,label}` shape) passed into the form for the pickers.

- [ ] **Step 1:** Breadcrumb `Documents › Upload`. Replace the raw contract-ID/annex-ID text inputs with `Select` pickers (client → contract → annex, dependent). Load the options server-side in `page.tsx` and pass to the form (respect RBAC — only show records the user may see). Keep file input as `FileInput`. Keep the existing server action signature (still submit the chosen IDs).
- [ ] **Step 2:** Success toast + redirect to `/documents`. Cancel link.
- [ ] **Step 3:** Verify upload-with-picker flow visually (uploaded doc shows in list with correct context).
- [ ] **Step 4: Commit** `feat(documents): upload form with client/contract/annex pickers + toast`

### Task 34: Search results clickable

**Files:**
- Modify: `lumina/src/app/(app)/search/page.tsx`

- [ ] **Step 1:** Breadcrumb `Search`. Migrate the search input to `Field`/`Input` + `Button`. Render results as `Table`/`Card`s where each result links to its record (document → secured doc route; if results carry a client/contract id, link there). Keep the three empty states (no query / error / no results) using `EmptyState`.
- [ ] **Step 2:** Verify a result click navigates correctly.
- [ ] **Step 3: Commit** `refactor(search): clickable results + ui primitives`

---

## Phase E — Tests & polish

### Task 35: Rewrite Playwright e2e for the new UI

**Files:**
- Modify: all specs under `lumina/tests/e2e/` (selectors changed by the overhaul)

- [ ] **Step 1:** Run the existing e2e to see what breaks: from `lumina/`, `npm run test:e2e` (start dependencies per `docker-compose.yml` + the documented setup). Record failures.
- [ ] **Step 2:** Update selectors/flows to the new IA: sidebar nav (not top bar), `/overview` landing, tabbed client page (`?tab=`), contract/work detail routes, modal-based quick-adds (annex/release/track/folder/attach), toasts as success signals, picker-based upload. Prefer role/label/`getByRole`/`getByText` selectors over brittle CSS.
- [ ] **Step 3:** Re-run until green: `npm run test:e2e`.
- [ ] **Step 4: Commit** `test(e2e): update selectors/flows for sidebar IA, tabs, detail pages, modals`

### Task 36: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1:** From `lumina/`: `npm run lint` → clean.
- [ ] **Step 2:** `npx tsc --noEmit` → clean.
- [ ] **Step 3:** `npx vitest run` → all unit tests pass (incl. new `ui/` tests).
- [ ] **Step 4:** `npm run build` → succeeds.
- [ ] **Step 5:** `npm run test:e2e` → green.
- [ ] **Step 6:** Manual RTL + LTR pass: toggle locale, walk overview → clients → client tabs → contract detail → work detail → upload → search; confirm sidebar side flips, breadcrumbs read correctly, no layout breakage, redaction holds. Controller captures screenshots and Reads them.
- [ ] **Step 7:** If all green, this branch is ready for PR (use `superpowers:finishing-a-development-branch`).

---

## Self-Review (author checklist — completed)

- **Spec coverage:** visual refresh → Task 1; sidebar → 14–15; breadcrumbs → every page task; break up client page → 19–24; detail pages → 25, 26; actionable lists → 27–29; consistent add pattern (modal vs full-page) → 21–24 (modals) + 30–31 (full-page); feedback toasts → ToastProvider (12,15) + per-form tasks; empty states → every list/tab; pickers → 33; search clickable → 34; design-system layer → Tasks 3–14; semantic status → Task 6. All spec sections mapped.
- **Placeholder scan:** primitives carry full source; page migrations specify exact files, the existing wiring to preserve, and explicit acceptance — the implementer migrates a real existing file, not a blank. Status enum lists in Task 6 and Next-16 async `params`/`searchParams` APIs are flagged as "confirm against the actual schema/docs" rather than guessed, by design.
- **Type consistency:** `buttonClasses`, `statusVariant`, `Tabs({tabs,param,active})`, `Dialog({open,onClose,title})`, `useToast().toast({title,description,variant})`, `Sidebar({name,role,items})` are referenced consistently across tasks.
- **Risk:** RBAC redaction is called out as preserve-exactly in every data-bearing task; no schema/security task exists (correct — out of scope).
