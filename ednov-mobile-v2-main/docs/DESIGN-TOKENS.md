# Design Tokens — Ednov Mobile

All UI must use **design tokens** (Tailwind theme or `Colors` from constants). Do **not** use hardcoded hex or rgba in components or screens.

## Single source of truth

- **Tailwind**: [../tailwind.config.js](../tailwind.config.js) — `theme.extend.colors` (light) and `theme.extend.colors.dark` (dark).
- **Constants**: [../constants/Colors.ts](../constants/Colors.ts) — mirrors the same values for backward compatibility with `Themed` and non-Tailwind code. Keep in sync with `tailwind.config.js`.

## Semantic color tokens

| Token                 | Light     | Dark                    | Usage                  |
| --------------------- | --------- | ----------------------- | ---------------------- |
| `primary`             | `#FF6B43` | `#FF6B43`               | Primary actions, links |
| `background`          | `#ffffff` | `#000000`               | Screen background      |
| `backgroundSecondary` | `#f5f5f5` | `#1a1a1a`               | Cards, code blocks     |
| `text`                | `#000000` | `#ffffff`               | Primary text           |
| `textSecondary`       | `#666666` | `#a3a3a3`               | Muted text             |
| `tint`                | `#FF6B43` | `#ffffff`               | Tab bar, links         |
| `tabIconDefault`      | `#cccccc` | `#cccccc`               | Inactive tab icon      |
| `tabIconSelected`     | `#FF6B43` | `#ffffff`               | Active tab icon        |
| `border`              | `#e5e5e5` | `rgba(255,255,255,0.1)` | Borders                |
| `separator`           | `#eeeeee` | `rgba(255,255,255,0.1)` | Dividers               |
| `success`             | `#14cc70` | `#14cc70`               | Success states, positive actions, confirmations |
| `warning`             | `#ff9800` | `#ff9800`               | Warnings, cautions, non-critical alerts         |
| `danger`              | `#ff4444` | `#ff4444`               | Errors, destructive actions, critical alerts     |
| `info`                | `#49bcd8` | `#49bcd8`               | Informational messages and neutral notices      |

## How to use

### With NativeWind (Tailwind)

- Use `className` with token names: `bg-background`, `text-text`, `bg-separator`, etc.
- Dark mode: use the `dark:` variant and `dark-*` colors: `bg-background dark:bg-dark-background`, `bg-separator dark:bg-dark-separator`.
- Example: `app/(tabs)/index.tsx` uses `className="h-px w-4/5 my-8 bg-separator dark:bg-dark-separator"` for the separator.

### With constants (Themed components)

- Import `Colors` from `@/constants/Colors`.
- Use `Colors.light.*` and `Colors.dark.*` for `lightColor` / `darkColor` on `Themed.Text` and `Themed.View`, or `Colors[useColorScheme() ?? 'light'].*` in styles.

### Root layout and dark mode

- Root layout ([app/_layout.tsx](../app/_layout.tsx)) wraps the app in a `View` with `className="flex-1 bg-background"` and adds the `dark` class when `useColorScheme() === 'dark'` so that `dark:` classes apply correctly.

## Adding or changing tokens

1. Update `tailwind.config.js` (`theme.extend.colors` and `theme.extend.colors.dark`).
2. Update `constants/Colors.ts` to match (same keys and values).
3. Document new tokens in this file.
