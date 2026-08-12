# Scripts

## login-and-set-theme.sh

One-click pipeline: Firebase login → backend login (get `companyId`) → set company theme (and optionally upload logo). The app loads theme and logo from config (`GET /branding/complete`) when you are logged in.

**Requirements:** `curl`. Optional: `jq` for robust JSON parsing.

**Usage (Git Bash / WSL / macOS / Linux):**

```bash
cd ednov-mobile-v2
./scripts/login-and-set-theme.sh
```

By default, if `assets/logo-icon.png` exists, the script also uploads it via `POST /branding/logo` (stored under `{companyId}/logo.png` in Firebase Storage). To skip logo upload, set `LOGO_PATH=` (empty).

**Override defaults with env:**

```bash
# Different credentials
EMAIL=other@yopmail.fr PASSWORD=Pass123# ./scripts/login-and-set-theme.sh

# Different theme colors (then open the app to see them)
PRIMARY="#FF0000" SECONDARY="#00FF00" ACCENT="#FF8A65" ./scripts/login-and-set-theme.sh

# Custom logo file
LOGO_PATH=./path/to/your-logo.png ./scripts/login-and-set-theme.sh

# Different API base (no .env)
API_BASE=http://localhost:3000/api/v1 ./scripts/login-and-set-theme.sh
```

Defaults are read from `.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_FIREBASE_API_KEY`) or the script defaults (email `admin.admiin@yopmail.fr`, password `Pass123#`, orange primary).

**Backend:** The script calls `PUT /api/v1/branding` for theme and, when a logo file is present, `POST /api/v1/branding/logo` (multipart) to upload the logo. The app fetches theme and logo URLs from `GET /api/v1/branding/complete` and displays them (dynamic theme + `AppLogo` with fallback to ZupDeCo).

---

## upload-logo.sh

Upload only a logo for the current company (no theme change). Uses the same Firebase login and then `POST /branding/logo`.

**Usage:**

```bash
./scripts/upload-logo.sh
LOGO_PATH=./path/to/logo.png ./scripts/upload-logo.sh
```

Default logo path: `assets/logo-icon.png`. Put your logo there, or pass `LOGO_PATH`.
