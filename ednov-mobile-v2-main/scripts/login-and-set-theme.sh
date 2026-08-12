#!/usr/bin/env bash
# One-click pipeline: Firebase login → Backend login (get companyId) → Create/update company theme.
# Usage:
#   ./scripts/login-and-set-theme.sh
#   PRIMARY="#FF0000" SECONDARY="#00FF00" ./scripts/login-and-set-theme.sh
#   EMAIL=tutor.test@ednov.fr PASSWORD=Pass123* ./scripts/login-and-set-theme.sh
#
# Optional env (defaults from .env or below):
#   FIREBASE_KEY, API_BASE, EMAIL, PASSWORD, PRIMARY, SECONDARY, ACCENT
#   LOGO_PATH — if set and file exists, upload logo after setting theme (e.g. LOGO_PATH=./assets/logo-icon.png)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

# Load .env if present
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=../.env
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

# Config (env overrides .env)
FIREBASE_KEY="${EXPO_PUBLIC_FIREBASE_API_KEY:-${FIREBASE_KEY:-AIzaSyDlH82OVofyKPk-NgZTnOLB7dmmSbmY60o}}"
API_BASE="${EXPO_PUBLIC_API_URL:-${API_BASE:-http://localhost:3000/api/v1}}"
# print email and password
echo "Email: $EMAIL"
echo "Password: $PASSWORD"

# Blue theme (default for testing)
# PRIMARY="${PRIMARY:-#2563EB}"
# SECONDARY="${SECONDARY:-#1e3a8a}"
# ACCENT="${ACCENT:-#60A5FA}"

# Original orange theme (uncomment to restore):
PRIMARY="${PRIMARY:-#FF6B43}"
SECONDARY="${SECONDARY:-#1a1a1a}"
ACCENT="${ACCENT:-#FF8A65}"

LOGO_PATH="${LOGO_PATH:-$PROJECT_DIR/assets/logo-icon.png}"

# Strip trailing slash from API_BASE
API_BASE="${API_BASE%/}"

echo "=== 1. Firebase sign-in ==="
echo "   Email: $EMAIL"
FIREBASE_RESP=$(curl -s -S --ssl-no-revoke \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"returnSecureToken\":true}")

if echo "$FIREBASE_RESP" | grep -q '"idToken"'; then
  ID_TOKEN=$(echo "$FIREBASE_RESP" | sed -n 's/.*"idToken" *: *"\([^"]*\)".*/\1/p')
  if [ -z "$ID_TOKEN" ] && command -v jq &>/dev/null; then
    ID_TOKEN=$(echo "$FIREBASE_RESP" | jq -r '.idToken // empty')
  fi
else
  echo "   Firebase login failed. Response: $FIREBASE_RESP"
  exit 1
fi

[ -n "$ID_TOKEN" ] || { echo "   Could not extract idToken."; exit 1; }
echo "   Got Firebase idToken."

echo ""
echo "=== 2. Backend GET /users/login (get companyId) ==="
LOGIN_RESP=$(curl -s -S -w "\n%{http_code}" \
  "$API_BASE/users/login" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json")

HTTP_BODY=$(echo "$LOGIN_RESP" | head -n -1)
HTTP_CODE=$(echo "$LOGIN_RESP" | tail -n 1)

if [ "$HTTP_CODE" != "200" ]; then
  echo "   Backend login failed (HTTP $HTTP_CODE). Body: $HTTP_BODY"
  exit 1
fi

COMPANY_ID=$(echo "$HTTP_BODY" | sed -n 's/.*"companyId" *: *"\([^"]*\)".*/\1/p')
if [ -z "$COMPANY_ID" ] && command -v jq &>/dev/null; then
  COMPANY_ID=$(echo "$HTTP_BODY" | jq -r '.companyId // empty')
fi

[ -n "$COMPANY_ID" ] || { echo "   Could not extract companyId from response."; exit 1; }
echo "   companyId: $COMPANY_ID"

echo ""
echo "=== 3. Create/update theme for company ==="
echo "   primary=$PRIMARY secondary=$SECONDARY accent=$ACCENT"

# Backend PutBrandingDto: same value for light and dark (theme-only). Primary = color1 nuance1, accent = color3 nuance1.
THEME_JSON=$(cat <<EOF
{
  "lightColor1Nuance1": "$PRIMARY",
  "darkColor1Nuance1": "$PRIMARY",
  "lightColor3Nuance1": "$ACCENT",
  "darkColor3Nuance1": "$ACCENT"
}
EOF
)

# PUT /branding — company comes from JWT (user's companyId)
BRANDING_RESP=$(curl -s -S -w "\n%{http_code}" -X PUT \
  "$API_BASE/branding" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$THEME_JSON")

BRANDING_BODY=$(echo "$BRANDING_RESP" | head -n -1)
BRANDING_CODE=$(echo "$BRANDING_RESP" | tail -n 1)

if [ "$BRANDING_CODE" = "200" ] || [ "$BRANDING_CODE" = "201" ]; then
  echo "   Theme updated (HTTP $BRANDING_CODE)."
else
  echo "   Theme request failed (HTTP $BRANDING_CODE). Body: $BRANDING_BODY"
  exit 1
fi

# Optional: upload logo (stored under company-id folder in Firebase Storage)
if [ -n "$LOGO_PATH" ] && [ -f "$LOGO_PATH" ]; then
  echo ""
  echo "=== 4. Upload logo (POST /branding/logo) ==="
  echo "   File: $LOGO_PATH"
  LOGO_RESP=$(curl -s -S -w "\n%{http_code}" -X POST \
    "$API_BASE/branding/logo" \
    -H "Authorization: Bearer $ID_TOKEN" \
    -F "file=@$LOGO_PATH")
  LOGO_BODY=$(echo "$LOGO_RESP" | head -n -1)
  LOGO_CODE=$(echo "$LOGO_RESP" | tail -n 1)
  if [ "$LOGO_CODE" = "200" ] || [ "$LOGO_CODE" = "201" ]; then
    echo "   Logo uploaded (HTTP $LOGO_CODE)."
  else
    echo "   Logo upload failed (HTTP $LOGO_CODE). Body: $LOGO_BODY"
  fi
fi

echo ""
echo "Done. Open the app (logged in) to load theme and logo from config (GET /branding/complete)."
