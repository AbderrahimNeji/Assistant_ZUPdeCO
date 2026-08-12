#!/bin/bash
# Installe les Cursor rules depuis .cursor/rules.example/
# Appelé par `npm run setup` — ne rien écraser si déjà présent

set -e

RULES_EXAMPLE_DIR=".cursor/rules.example"
RULES_DIR=".cursor/rules"

if [ ! -d "$RULES_EXAMPLE_DIR" ]; then
  echo "⚠️  Dossier $RULES_EXAMPLE_DIR introuvable — skip"
  exit 0
fi

mkdir -p "$RULES_DIR"

for f in "$RULES_EXAMPLE_DIR"/*.mdc; do
  [ -f "$f" ] || continue
  dest="$RULES_DIR/$(basename "$f")"
  if [ -f "$dest" ]; then
    echo "  $(basename "$f") existe déjà — ignoré (supprimez-le pour réinstaller)"
  else
    cp "$f" "$dest"
    echo "  ✅ $(basename "$f") installé"
  fi
done

echo "✅ Cursor rules prêtes"
