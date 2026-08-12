# Tests Maestro — Mode offline ednov

Suite de tests E2E couvrant les scénarios offline de l'application mobile ednov.

## Prérequis

| Outil | Version | Installation |
|---|---|---|
| Maestro CLI | ≥ 2.4.0 | `curl -Ls "https://get.maestro.mobile.dev" \| bash` |
| ADB (Android Debug Bridge) | ≥ 1.0.41 | inclus dans Android Studio SDK |
| Appareil/émulateur Android | API 26+ | émulateur AVD recommandé |

> **iOS** : `setAirplaneMode` est ignoré sur iOS — les tests réseau sont Android uniquement.

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `TEST_EMAIL` | Email d'un compte tuteur de test | `tuteur-test@example.com` |
| `TEST_PASSWORD` | Mot de passe du compte | `MotDePasse123` |

Le compte de test doit avoir **au moins 3 CRs "À saisir"** dans ses sessions pour que les flows 03, 04, 06 fonctionnent.

## Lancer les tests

### Suite complète

```bash
cd mobile

maestro test .maestro/suite.yaml \
  -e TEST_EMAIL=tuteur@example.com \
  -e TEST_PASSWORD=monmotdepasse
```

### Un flow individuel

```bash
maestro test .maestro/flows/03_offline_cr_create.yaml \
  -e TEST_EMAIL=tuteur@example.com \
  -e TEST_PASSWORD=monmotdepasse
```

### Mode continu (re-run automatique à chaque changement)

```bash
maestro test --continuous .maestro/suite.yaml \
  -e TEST_EMAIL=tuteur@example.com \
  -e TEST_PASSWORD=monmotdepasse
```

## Description des flows

| Flow | Nom | Scénario |
|---|---|---|
| `00` | Login + cache | Connexion en ligne, navigation sur tous les onglets pour peupler le cache |
| `01` | Bannière offline | Vérification de l'apparition/disparition de la bannière hors ligne |
| `02` | Navigation offline | Parcours de tous les écrans en mode avion → données en cache, aucune erreur |
| `03` | Création CR offline | Créer un CR sans réseau → file d'attente locale, snackbar de confirmation |
| `04` | Modification CR offline | Modifier un CR en attente → remplacement dans la file (pas de doublon) |
| `05` | Sync au retour réseau | Rétablir la connexion → synchronisation automatique et message de confirmation |
| `06` | Plusieurs CRs offline | Créer 2 CRs hors ligne → sync groupée au retour en ligne |
| `07` | Login bloqué offline | Tentative de login sans réseau → message d'erreur, pas de redirection |
| `08` | Relance app offline | Quitter + couper le réseau + relancer → chargement depuis cache, pas de spinner infini |

## Architecture des flows

```
.maestro/
├── suite.yaml              ← point d'entrée de la suite complète
├── README.md
├── flows/
│   ├── 00_login_and_cache.yaml
│   ├── 01_offline_banner.yaml
│   ├── 02_offline_browse.yaml
│   ├── 03_offline_cr_create.yaml
│   ├── 04_offline_cr_update.yaml
│   ├── 05_sync_on_reconnect.yaml
│   ├── 06_offline_multiple_crs.yaml
│   ├── 07_offline_login_blocked.yaml
│   └── 08_app_relaunch_offline.yaml
└── utils/
    └── login.yaml          ← sous-flow de connexion réutilisable
```

## TestIDs utilisés

Les flows se basent sur les `testID` ajoutés dans l'application :

| testID | Composant | Localisation |
|---|---|---|
| `login-identifier` | TextInput email/téléphone | `app/(auth)/login.tsx` |
| `login-password` | TextInput mot de passe | `app/(auth)/login.tsx` |
| `login-submit` | Bouton "Se connecter" | `app/(auth)/login.tsx` |
| `offline-banner` | Bannière hors ligne | `components/OfflineBanner.tsx` |
| `cr-note-{0..5}` | Boutons de note 0 à 5 | `app/(tabs)/comptes-rendus/new.tsx` |
| `cr-commentaire` | TextInput résumé de séance | `app/(tabs)/comptes-rendus/new.tsx` |
| `cr-submit-button` | Bouton enregistrer CR | `app/(tabs)/comptes-rendus/new.tsx` |
| `cr-list-item-{id}` | Ligne de liste CR | `app/(tabs)/comptes-rendus/index.tsx` |

## Dépannage

**`setAirplaneMode` ne fonctionne pas** : Vérifier que l'appareil est bien détecté par ADB (`adb devices`). Sur certains émulateurs, le mode avion peut nécessiter des permissions supplémentaires.

**Timeout sur "Tableau de bord"** : Augmenter le timeout Maestro par défaut avec `--timeout 60000` ou vérifier que le build inclut bien le compte de test.

**CR "À saisir" introuvable** : S'assurer que le compte de test a des sessions avec des CRs non remplis dans la période en cours.

**Tests instables** : Ajouter des `waitForAnimationToEnd` entre les étapes si l'animation de transition des écrans est lente sur l'appareil de test.
