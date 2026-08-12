# Guide de contribution — Ednov Mobile

## Sommaire

1. [Setup local](#1-setup-local)
2. [Branching strategy & Linear](#2-branching-strategy--linear)
3. [Workflow PR](#3-workflow-pr)
4. [Cursor rules](#4-cursor-rules)
5. [CI/CD & automatisations](#5-cicd--automatisations)
6. [Règles d'or](#6-règles-dor)

---

## 1. Setup local

```bash
git clone git@github.com:Ednov-v2/ednov-mobile-v2.git
cd ednov-mobile-v2
npm run setup       # installe dépendances + Cursor rules
npx expo start      # lance l'app (scanner QR avec Expo Go)
```

`npm run setup` fait automatiquement :
- `npm ci` — installe les dépendances (active aussi les hooks Husky via `prepare`)
- `bash scripts/setup-cursor-rules.sh` — copie les règles Cursor depuis `.cursor/rules.example/`

**Mettre à jour les règles Cursor** (après un pull qui modifie `rules.example/`) :
```bash
npm run cursor-rules:update
```

---

## 2. Branching strategy & Linear

### Branches principales

```
main      ← production uniquement
develop   ← env dev/QA (tests QA ici)
```

### Convention de nommage des branches

**Format obligatoire : `<type>/poc-<numéro>-<description>`**

```
feat/poc-123-add-session-attendance
fix/poc-456-fix-cr-display
chore/poc-789-update-expo-sdk
```

**Source du nom** : toujours copier depuis Linear — ticket → **"Copy git branch name"**, puis adapter le préfixe de type (`feat/`, `fix/`, etc.).

Le hook `pre-push` Husky **bloque automatiquement** tout push avec un nom de branche non conforme.

Pour renommer une branche :
```bash
git branch -m ancien-nom feat/poc-XXX-nouveau-nom
```

### Workflow Linear automatique

| Événement | Statut ticket Linear |
|---|---|
| PR ouverte (ticket en Todo/Backlog) | → **In Progress** |
| PR mergée → `develop` | → **In Review** + commentaire automatique |
| PR mergée → `main` | → **Done** + commentaire automatique |

---

## 3. Workflow PR

```
1. Prendre le ticket POC-XXX sur Linear → le passer "In Progress"
2. git checkout develop && git pull
3. git checkout -b feat/poc-XXX-ma-feature
4. Développer + tester iOS ET Android
5. gh pr create  →  template chargé automatiquement
6. Remplir la section Linear du template (Closes POC-XXX)
7. Review → CI verte → Merge sur develop
   → ticket "In Review" auto + commentaire ✅
8. QA valide → PR develop → main
   → ticket "Done" auto ✅
```

### Template PR

Le template `.github/pull_request_template.md` se charge automatiquement avec `gh pr create`.

Sections à remplir :
- **Linear** : lien vers le ticket `Closes [POC-XXX](https://linear.app/...)`
- **Description** : ce qui est fait et pourquoi (ce texte apparaîtra en commentaire sur le ticket Linear)
- **Comment tester** : étapes pour le QA
- **Checklist** : iOS + Android testés, pas de console.log

---

## 4. Cursor rules

Les règles Cursor sont dans `.cursor/rules.example/` (versionnées) et copiées localement dans `.cursor/rules/` (gitignorées).

| Fichier | Description |
|---|---|
| `dev-framework.mdc` | Conventions branches, Linear, workflow PR |
| `ednov-mobile.mdc` | Expo, React Native, TypeScript conventions |
| `ednov-mobile-data-state.mdc` | React Query, Zustand, env vars |
| `ednov-mobile-expo-router.mdc` | Routing Expo Router |
| `ednov-mobile-accessibility.mdc` | Accessibilité |
| `ednov-mobile-styling.mdc` | NativeWind, design tokens |

Voir aussi `docs/DEVELOPMENT.md` pour les conventions de code détaillées.

---

## 5. CI/CD & automatisations

### Hooks Husky (local)

| Hook | Déclencheur | Action |
|---|---|---|
| `pre-commit` | `git commit` | `npm run lint` |
| `pre-push` | `git push` | Vérifie le nom de branche |

### GitHub Actions

| Workflow | Déclencheur | Action |
|---|---|---|
| `linear-sync.yml` | PR opened/merged | Sync statut ticket Linear + commentaire |

---

## 6. Règles d'or

```
✅ Branche depuis develop à jour
✅ Convention branche feat/poc-XXX-description
✅ Testé iOS + Android avant PR
✅ Template PR rempli (Linear + description + comment tester)
✅ Screenshots pour les changements UI

❌ Jamais committer sur develop ou main directement
❌ PR sans numéro de ticket Linear
❌ PR sans tests iOS/Android pour les changements UI
```
