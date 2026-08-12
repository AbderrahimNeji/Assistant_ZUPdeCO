#!/usr/bin/env bash
# Upload a logo for the current company (Firebase login → POST /branding/logo).
# Logo is stored in Firebase Storage under {companyId}/logo.png and URL saved in branding.
#
# Usage:
#   ./scripts/upload-logo.sh
#   LOGO_PATH=./path/to/logo.png ./scripts/upload-logo.sh
#
# Optional env: FIREBASE_KEY, API_BASE, EMAIL, PASSWORD, LOGO_PATH

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

FIREBASE_KEY="${EXPO_PUBLIC_FIREBASE_API_KEY:-${FIREBASE_KEY:-AIzaSyDlH82OVofyKPk-NgZTnOLB7dmmSbmY60o}}"
API_BASE="${EXPO_PUBLIC_API_URL:-${API_BASE:-http://localhost:3000/api/v1}}"
EMAIL="${EMAIL:-admin.admiin@yopmail.fr}"
PASSWORD="${PASSWORD:-Pass123#}"
LOGO_PATH="${LOGO_PATH:-$PROJECT_DIR/assets/logo-icon.png}"

API_BASE="${API_BASE%/}"

if [ ! -f "$LOGO_PATH" ]; then
  echo "Logo file not found: $LOGO_PATH"
  echo "Set LOGO_PATH to your logo image (PNG/JPEG/SVG) or add assets/logo-icon.png"
  exit 1
fi

echo "=== 1. Firebase sign-in ==="
FIREBASE_RESP=$(curl -s -S --ssl-no-revoke \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"returnSecureToken\":true}")

if echo "$FIREBASE_RESP" | grep -q '"idToken"'; then
  ID_TOKEN=$(echo "$FIREBASE_RESP" | sed -n 's/.*"idToken" *: *"\([^"]*\)".*/\1/p')
  [ -z "$ID_TOKEN" ] && command -v jq &>/dev/null && ID_TOKEN=$(echo "$FIREBASE_RESP" | jq -r '.idToken // empty')
else
  echo "Firebase login failed. Response: $FIREBASE_RESP"
  exit 1
fi

[ -n "$ID_TOKEN" ] || { echo "Could not extract idToken."; exit 1; }
echo "   Got Firebase idToken."

echo ""
echo "=== 2. Upload logo (POST /branding/logo) ==="
echo "   File: $LOGO_PATH"

UPLOAD_RESP=$(curl -s -S -w "\n%{http_code}" -X POST \
  "$API_BASE/branding/logo" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -F "file=@$LOGO_PATH")

UPLOAD_BODY=$(echo "$UPLOAD_RESP" | head -n -1)
UPLOAD_CODE=$(echo "$UPLOAD_RESP" | tail -n 1)

if [ "$UPLOAD_CODE" = "200" ] || [ "$UPLOAD_CODE" = "201" ]; then
  echo "   Logo uploaded (HTTP $UPLOAD_CODE)."
  echo ""
  echo "Done. Restart or refresh the app to see the logo (app loads config from GET /branding/complete)."
else
  echo "   Upload failed (HTTP $UPLOAD_CODE). Body: $UPLOAD_BODY"
  exit 1
fi
