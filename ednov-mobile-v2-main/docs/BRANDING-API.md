# Branding API — theme and colors by company

The app loads theme/colors from the backend **by company id** after login. The company id is taken from `GET /users/login` (response field `companyId`) and stored locally; it is then used to call the branding endpoint on each app initialization (and when the user is logged in).

## Flow

1. User signs in (email or phone). After successful Firebase auth, the app calls `GET /api/v1/users/login` (with Firebase JWT).
2. Response must include `companyId`. The app stores it (persisted so it survives app restarts).
3. On app load (and when company id is available), the app calls `GET /api/v1/branding/complete?companyId=<companyId>` (with Firebase JWT).
4. Response is used to override **primary** (and optionally **secondary** / **accent**) in the app. Light/dark mode is **not** sent or used in the payload; system colors (text, background, borders) stay from the OS theme.

On sign-out, the app clears the stored company id and stops using branding until the next login.

## GET response (recommended: theme-only, no light/dark)

The app supports a **theme-only** payload: one set of colors used for both light and dark mode. This is the recommended shape.

### Response body (JSON)

```json
{
  "primary": "#FF6B43",
  "secondary": "#1a1a1a",
  "accent": "#FF8A65"
}
```

| Field       | Type   | Required | Description |
| ----------- |--------|----------|-------------|
| `primary`   | string | Yes      | Hex color for main brand (buttons, selected tab, links). Applied as `tint` and `tabIconSelected`. |
| `secondary` | string | No       | Reserved for future use (e.g. secondary UI). |
| `accent`    | string | No       | Used for hover/accent; defaults to `primary` if omitted. |

- **No `light` / `dark`** in the payload. The app uses these values for both modes; only primary (and accent) override the default palette. Text, background, and borders stay from the system light/dark theme.

### Optional fields (logos, font)

You can extend the response with the same structure as the full branding DTO (e.g. `logos`, `fontFamily`, `fontUrl`, `customCss`) if the backend provides them. The app currently uses only `primary` and `accent` for colors.

## POST payload (for saving/updating branding on the backend)

If your backend exposes a **POST** (or PUT) endpoint to create/update branding by company, the app expects the same theme-only shape. Use this payload so the mobile app and backend stay in sync:

### Request body (JSON)

```json
{
  "primary": "#FF6B43",
  "secondary": "#1a1a1a",
  "accent": "#FF8A65"
}
```

- Do **not** include `light` / `dark` or per-mode color objects for theme colors. The app ignores mode for primary/secondary/accent; other colors are system-defined.

### Example: create or update branding for a company

- **POST** `/api/v1/branding` (or `/api/v1/companies/:companyId/branding`)  
- **Body:** `{ "primary": "#FF6B43", "secondary": "#1a1a1a", "accent": "#FF8A65" }`  
- **Response:** Same shape as GET (theme-only), or 204 No Content.

## Legacy: bimodal response (light/dark per color)

If the backend still returns the full bimodal structure (`colors.color1.nuance1.light` / `colors.color1.nuance1.dark`, etc.), the app supports it. Prefer the theme-only shape so the API does not depend on light/dark for primary/secondary.

## Endpoints summary

| Method | Endpoint                         | Auth   | Description |
|--------|----------------------------------|--------|-------------|
| GET    | `/api/v1/users/login`            | Bearer | Returns user profile including `companyId`. |
| GET    | `/api/v1/branding/complete?companyId=<id>` | Bearer | Returns branding (theme-only or full) for the company. |
| POST   | (backend-defined)               | Bearer | Create/update branding; use theme-only body above. |

## One-click script (test theme in the app)

From the repo root (Git Bash / WSL / macOS / Linux):

```bash
./scripts/login-and-set-theme.sh
```

This signs in with Firebase (using credentials from `.env` or defaults), calls the backend to get `companyId`, then creates or updates the company theme. Override colors with env: `PRIMARY="#FF0000" SECONDARY="#00FF00" ./scripts/login-and-set-theme.sh`. See [scripts/README.md](../scripts/README.md).
