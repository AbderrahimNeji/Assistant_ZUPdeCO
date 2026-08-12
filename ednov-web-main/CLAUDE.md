# Ednov-web — Project Context

Education-platform frontend for tutoring/volunteering coordination. UI language: French.

## Tech Stack

| Layer         | Tech                                              |
| ------------- | ------------------------------------------------- |
| Framework     | React 19, TypeScript 5.6                          |
| Build         | Vite 6                                            |
| Styling       | Tailwind CSS 3 + CSS module files                 |
| Routing       | React Router 7                                    |
| State         | Zustand 5                                         |
| Server state  | TanStack React Query 5                            |
| Auth          | Firebase 11 (email, Google, Microsoft, phone OTP) |
| Forms         | React Hook Form + Zod                             |
| Backend       | Supabase (via MCP) + custom REST API              |
| UI primitives | Radix UI + custom Button/LabelBadge + shadcn ui/  |
| Charts        | Recharts, ApexCharts                              |
| DnD           | @dnd-kit                                          |
| Calendar      | react-big-calendar                                |

## Commands

```bash
npm.cmd run dev          # Vite dev server
npm.cmd run build        # tsc + vite build
npm.cmd run typecheck    # tsc --noEmit
npm.cmd run lint:fix     # ESLint auto-fix
npm.cmd run format       # Prettier
```

> Use `npm.cmd` not `npm` — this project runs in a Windows shell environment.

## Architecture

```
src/
  app/          # Router, App root
  features/     # Page-level components (one folder per domain)
  components/   # Shared UI (common/, forms/, ui/, domain-specific/)
  services/     # API calls (auth.service, establishments.service, …)
  hooks/        # Custom hooks
  stores/       # Zustand stores (authStore, interfaceElementsStore, preferencesStore, themeStore, layoutStore)
  types/        # TypeScript types per domain
  lib/          # Utilities (user-role-configs, date-utils, …)
  styles/       # CSS files
```

## Code Conventions

- **Functional components with hooks** — no class components
- **Named exports** — no default exports
- **No inline styles** — all styles go in matching `.css` files; `style={}` only for runtime-computed values (e.g. `left: ${x}px`) with an explanatory comment
- **No client-side pagination or filtering** — always pass `page`, `pageSize`, `filters` to the API
- **No `border-left` as visual accent** — use `box-shadow`, gradient, or `::before` pseudo-element instead
- **Match existing file style** — don't refactor adjacent code

## Generic Components — Always Use First

Before writing a button, badge, table, modal, or input:

### Button — `src/components/forms/Button.tsx`

- Use `preset` from `ButtonPreset` union for standard row actions, form controls, modals
- Use `variant` (`primary`, `secondary`, `cancel`, `danger`, `ghost`, `outline`, `delete`) when no preset fits
- Extend `ButtonPreset` / `BUTTON_PRESETS` for new repeated patterns instead of copying className strings

### LabelBadge — `src/components/common/LabelBadge.tsx`

- Use for all compact labels, statuses, category chips
- Variants: `ghost`, `outlined`, `solid`, `active`, `disabled`, `on-hold`, `male`, `female`
- Never use bespoke `rounded-md border px-2 …` stacks that duplicate this component

### DataTable — `src/components/common/DataTable/DataTable.tsx`

- Use for every list/table view — never build tables from scratch
- Key props: `data`, `totalItems`, `isLoading`, `currentPage`, `totalPages`, `renderTableHead`, `renderTableRow`, `renderCard`
- Pattern reference: `TutorsDataTable.tsx` + `tutor-configs.ts`

### Other generics

- Modals: `BaseModal`, `InfoModal` — check `src/components/common/modals/` before building custom
- Inputs/selects: check `src/components/forms/` first
- Detail views: `DetailField`, `DetailBadge`, `DetailChipList` — check `src/components/common/details/`

## Permission System — Dynamic UI

**UI visibility is driven by the database, not hardcoded role checks.**

Key tables (always query via Supabase MCP before implementing any gated UI):

- `interface_elements` — canonical list of UI elements (keys, types, labels)
- `roles` — role definitions
- `role_interface_elements` — join: per-role visibility and order

```tsx
// ❌ Never
{
  user.role === 'admin' && <AdminPanel />;
}

// ✅ Always
{
  hasAccess('admin_panel') && <AdminPanel />;
}
```

Before adding a new gated UI element:

1. Check if the element exists in `interface_elements`
2. Check which roles have access via `role_interface_elements`
3. Replicate the pattern from existing components

## User Roles

`VOLUNTEER | COORDINATOR | MANAGER | STUDENT | TUTOR`

Config and labels: `src/lib/user-role-configs.ts`

## Hub Files (most imported — read before touching)

- `api-client` — central HTTP client (23 dependents)
- `DetailBadge`, `DetailField`, `EmptyPlaceholder` — detail view primitives
- `content-renderers/render*.tsx` — per-role detail view renderers

## MCP Tools Available

- **`user-lean-ctx`** — mandatory: replaces Read/Grep/Shell for token efficiency
- **`user-supabase`** — DB inspection; SELECT freely, ask user before any INSERT/UPDATE/DELETE
- **`user-playwright`** — E2E tests
- **`user-chrome-devtools`** — live browser state

## Boundaries

- Never hardcode permissions (`user.role === '...'`) — use the dynamic interface element system
- Never paginate or filter on the client — always go through the API
- Never put `style={{}}` in JSX unless runtime-computed (add a comment explaining why)
- Never create a table, button, or badge from scratch without checking generic components first
- Never suggest clearing browser cache — if something doesn't update, re-read files and check terminal errors
- Never commit `.env` files or secrets
- Ask before modifying database schema or running write operations via Supabase MCP

## \*-configs.ts Pattern

Each domain has a `*-configs.ts` (or `*-config.ts`) file that defines:

- Available types/statuses
- Display labels (French)
- Badge colors/variants
- Filter options

Always consult these before hardcoding labels or colors. Examples:
`tutor-configs.ts`, `student-configs.ts`, `session-configs.ts`, `establishment-configs.ts`
