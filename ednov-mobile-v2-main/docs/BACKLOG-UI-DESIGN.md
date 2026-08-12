# Backlog UI & Design — Aligner ednov-mobile-v2 sur v1

Objectif : faire ressembler **ednov-mobile-v2** (version minimale, nouveau backend) à **ednov-mobile-v1** au niveau de l’UI et du design, zone par zone.

---

## Scope v2 (tutor uniquement)

- **Rôle** : v2 est réservé aux **tuteurs** ; pas de flux parent, élève (app), recruteur ou coordinateur.
- **Auth** : **Login** + **Mot de passe oublié** uniquement. Pas d’inscription (register) ni d’onboarding dans v2 ; les comptes tuteurs sont gérés côté backend / admin.
- **Fonctionnalités** : après connexion, les écrans tuteur (tableau de bord, séances, comptes rendus, élèves, profil) alignés sur v1 en UI.
- **Interfaces de référence** : pour l’alignement UI, se baser **uniquement sur les écrans et composants tuteur de v1** (ex. `TutorDashboard`, `TutorSessions`, `TutorCompteRenduScreen`, `TutorStudents`, `TutorProfile`). Ne pas prendre pour référence les interfaces parent, élève, recruteur ou coordinateur de v1.

---

## Conventions

- **Priorité** : P1 = critique pour la parité visuelle, P2 = important, P3 = amélioration.
- **Référence** : v1 = `ednov-mobile-v1`, v2 = `ednov-mobile-v2`. Les mentions “comme v1” ou “aligné sur v1” désignent **uniquement les interfaces tuteur de v1** (pas les écrans parent, élève, recruteur, coordinateur).
- **Scope** : v2 reste une version minimale (pas de duplication de toute la logique v1), mais l’apparence doit se rapprocher des écrans tuteur de v1.

---

## 1. Login

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| L1 | **Logo de marque** | Remplacer l’icône “school” par le **ZupDeCo logo** (SVG) en haut de l’écran, comme v1. | P1 | `LoginScreen.tsx` → `ZupDeCoLogo` |
| L2 | **Cartes de contenu** | Utiliser des **Cards** (style v1) pour la zone “Bienvenue” et le formulaire, au lieu d’un seul bloc sheet. | P2 | `Card` + `globalStyles.cardLarge` |
| L3 | **Champs de formulaire** | Aligner sur v1 : label “Email ou Téléphone” (un seul champ identifiant), champs **outlined** (style Paper), icônes à gauche (email/phone, cadenas), placeholder type “email@exemple.com ou +33123456789”. | P1 | `TextInput` mode="outlined", left icon |
| L4 | **Connexion par téléphone (optionnel)** | v1 : email **ou** téléphone avec OTP. Pour v2 minimal : au moins prévoir le même libellé / même disposition (Email ou Téléphone) même si OTP téléphone est désactivé. | P3 | `isEmailOrPhone`, `PhoneLoginOTPScreen` |
| L5 | **Affichage mot de passe** | Ajouter le bouton **œil** (show/hide password) à droite du champ mot de passe, comme v1. | P2 | `TextInput.Icon` right, eye/eye-off |
| L6 | **Messages d’erreur** | Afficher les erreurs **sous les champs** (inline) comme v1, en plus ou à la place du bandeau unique. Option : conserver un Snackbar pour l’erreur globale. | P2 | `identifierError`, `passwordError` |
| L7 | **Bouton “Se connecter”** | Style bouton **contained** avec icône “login”, comme v1. | P2 | `Button` mode="contained", icon |
| L8 | **Lien secondaire** | Ajouter “Mot de passe oublié ?” (lien texte) sous le formulaire. v2 n’a pas d’inscription : pas de lien “S’inscrire”. Comportement peut rester minimal (écran placeholder ou réel selon implémentation). | P2 | `ForgotPassword` |
| L9 | **Toast / Snackbar** | En cas d’erreur, utiliser un **Snackbar** en bas (style v1) en plus des messages inline. | P2 | `Snackbar` |

---

## 2. Dashboard

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| D1 | **Structure de page** | Vérifier que la structure (SafeArea, conteneur principal, scroll) correspond à v1 (ScreenContainer + cartes). | P2 | `TutorDashboard.tsx`, `ScreenContainer` |
| D2 | **Cartes de statistiques** | Aligner le style des **StatisticsCard** (ombre, rayon, padding, icônes dans un cercle coloré) sur v1. | P1 | `StatisticsCard` |
| D3 | **Sélecteur de période** | Conserver Semaine / Mois ; style visuel (chips / boutons) aligné sur v1. | P2 | Période dashboard v1 |
| D4 | **Calendrier** | Vérifier que le **CalendarWidget** (ou équivalent) a le même rendu (mois, jours marqués, thème clair/sombre). v2 a déjà un Calendar ; aligner couleurs et typo. | P2 | `CalendarWidget` |
| D5 | **Prochaine séance** | Même mise en forme que v1 (carte dédiée, icône, texte date/heure/lieu, bouton d’action type “Rejoindre” si lien présent). | P2 | Bloc next session v1 |
| D6 | **Élèves actifs / raccourcis** | Si v1 affiche une section “Élèves actifs” ou raccourcis (ex. ressources), ajouter une section équivalente en style carte. | P3 | `activeStudents`, `ResourceQuickAccess` |
| D7 | **États vide / erreur** | Style des états “chargement”, “erreur”, “réessayer” identique à v1 (spinner, texte, bouton). | P2 | `LoadingSpinner`, `ErrorMessage` |

---

## 3. Séances (Sessions) — Liste, Filtres, Détail

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| S1 | **Barre de recherche + filtre** | v1 a une **SearchFilterCard** en en-tête fixe : champ recherche “Rechercher tuteur ou élève…” + bouton Filtres avec badge (nombre de filtres actifs). Reproduire ce composant en tête de liste. | P1 | `SearchFilterCard`, `TutorSessions` |
| S2 | **Modal / panneau de filtres** | v1 : **SessionFilterModal** avec statut (à venir, réalisée, annulée, etc.), période de dates, statut CR. En v2 minimal : proposer au moins les mêmes options visuelles (même si une partie est désactivée ou simplifiée). | P1 | `SessionFilterModal`, `DatePeriod`, `crStatus` |
| S3 | **Cartes de séance** | Style des lignes de liste aligné sur **SessionCard** v1 : date/heure, lieu, statut (badge), élève/tuteur si affiché, ombre et bordures. | P1 | `SessionCard` |
| S4 | **Badge de statut** | Utiliser les mêmes libellés et couleurs que v1 pour les statuts (planifiée, en cours, réalisée, annulée, etc.). | P1 | `SessionStatusBadge`, `mapSessionStatus` |
| S5 | **Liste vide** | Message et icône “Aucune séance” / “Aucune séance trouvée” comme v1 (**EmptyState**). | P2 | `EmptyState` |
| S6 | **Détail de séance** | Même structure que **SessionDetailScreen** v1 : en-tête avec titre + statut, cartes d’info (date, heure, lieu, établissement, lien de réunion), boutons “Rejoindre la séance” et “Voir le CR” si applicable. | P1 | `SessionDetailScreen` |
| S7 | **Bouton “Rejoindre”** | Si le backend fournit un lien de séance, afficher le bouton “Rejoindre” et ouvrir le lien (comportement v1 avec URL cryptée si nécessaire). | P2 | `handleJoinSession`, `generateEncryptedUrl` |

---

## 4. Comptes rendus (CR) — Liste, Filtres, Détail

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| C1 | **En-tête avec recherche + filtres** | Comme v1 : **SearchFilterCard** + ouverture d’un panneau/modal de filtres (période, statut du CR : à saisir / saisi / validé). | P1 | `TutorCompteRenduScreen`, `SearchFilterCard` |
| C2 | **Filtres CR** | Proposer les mêmes options que v1 : **DatePeriodFilter**, **ReportStatusFilter** (tous, à saisir, partiellement saisi, saisi, validé). En v2 on peut limiter aux statuts supportés par le backend. | P1 | `DatePeriodFilter`, `ReportStatusFilter` |
| C3 | **Cartes de CR** | Style **ReportCard** v1 : session/date, élève, statut, aperçu (note, matière), ombre et bordures. | P1 | `ReportCard` |
| C4 | **Bouton principal “Saisir un CR”** | Toujours visible (FAB ou barre fixe en bas) comme v1. v2 a déjà un bouton ; aligner le style (icône + texte). | P2 | FAB / barre “Saisir un CR” |
| C5 | **Détail CR** | Aligner sur **CompteRenduDetailScreen** v1 : cartes par section (session, élève, note avec étoiles si applicable, matière, commentaire, date de soumission), statut, bouton “Modifier” si pertinent. | P1 | `CompteRenduDetailScreen` |
| C6 | **Note avec étoiles** | Si v1 affiche une notation en étoiles, reprendre le même rendu (ex. `renderStars`) dans le détail CR v2. | P2 | `renderStars` dans CompteRenduDetail |

---

## 5. Élèves — Liste, Filtre, Détail

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| E1 | **Barre de recherche** | Même style que v1 : **SearchBar** “Rechercher un élève…” en haut (dans une carte ou bandeau fixe). | P1 | `SearchBar`, `TutorStudents` |
| E2 | **Filtre par programme** | v1 : **FilterBar** avec options (Tous + liste des programmes). Ajouter un filtre par programme/parcours si les données le permettent. | P1 | `FilterBar`, `programs` |
| E3 | **Cartes élève** | Style **StudentCard** v1 : avatar (photo ou initiales), nom, infos secondaires (programme, niveau), chevron. | P1 | `StudentCard` |
| E4 | **Avatar** | v1 utilise **getAvatarUrl** (image métier) ou initiales. En v2 : au minimum initiales dans un cercle coloré ; si possible même logique d’avatar que v1. | P2 | `getAvatarUrl`, `avatarUtils` |
| E5 | **Écran détail élève** | **Créer** l’écran **Détail élève** (équivalent **StudentDetailScreen** v1) : navbar avec retour + nom, carte profil (avatar, nom, statut), sections Infos personnelles, Établissement, Résumé des séances / progression. | P1 | `StudentDetailScreen` |
| E6 | **Navigation liste → détail** | Depuis la liste élèves, clic sur une ligne ouvre le détail élève (avec passage de l’id ou de l’objet élève). | P1 | Navigation vers `students/[id]` |
| E7 | **Liste vide** | Message et icône “Aucun élève” / “Aucun élève trouvé” comme v1 (**EmptyState**). | P2 | `EmptyState` |

---

## 6. Design system & global

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| G1 | **Thème / couleurs** | Aligner les couleurs (primary, surface, erreur, etc.) sur le thème v1 (**theme**, **colors**) pour cohérence visuelle. | P1 | `theme`, `useGlobalStyles`, `colors` |
| G2 | **Typographie** | Même hiérarchie (titres, sous-titres, corps, labels) et tailles/graisses que v1 (variant Paper ou équivalent). | P2 | `Text` variant, `globalStyles` |
| G3 | **Espacements et rayons** | Réutiliser les constantes v1 (**spacing**, **borderRadius**) pour les marges, paddings et rayons des cartes/boutons. | P2 | `globalStyles`: spacing, borderRadius |
| G4 | **Ombres** | Cartes et boutons : ombres légères en clair, plus marquées en sombre, comme v1 (**shadows**). | P2 | `shadows` |
| G5 | **Composants communs** | Où c’est pertinent, réutiliser ou recréer : **ScreenContainer**, **LoadingSpinner**, **ErrorMessage**, **EmptyState**, **Card** (style Paper ou équivalent). | P2 | Composants v1 listés |
| G6 | **Logo ZupDeCo** | Intégrer le composant **ZupDeCoLogo** (SVG) dans v2 et l’utiliser sur Login et éventuellement dans le header ou le profil. | P1 | `ZupDeCoLogo` |
| G7 | **Barre d’onglets (tabs)** | Icônes et libellés des onglets alignés sur v1 (Tableau de bord, Séances, Comptes rendus, Élèves, Profil). | P2 | TutorTabs / bottom tabs v1 |

---

## 7. Profil (optionnel pour ce backlog)

| ID | Tâche | Détail | Priorité | Réf. v1 |
|----|--------|--------|----------|---------|
| P1 | **Écran profil** | Structure et style de **TutorProfile** v1 : carte utilisateur, infos, déconnexion. | P3 | `TutorProfile` |

---

## Ordre de traitement suggéré

1. **Design system (G1–G6)** pour avoir une base cohérente.
2. **Login (L1–L9)** : première impression.
3. **Dashboard (D1–D7)**.
4. **Séances (S1–S7)** : liste, filtres, détail.
5. **Comptes rendus (C1–C6)** : liste, filtres, détail.
6. **Élèves (E1–E7)** : liste, filtre, **création du détail élève (E5–E6)**.
7. **Profil (P1)** si temps.

---

## Notes techniques

- **v1** : React Navigation (stack + tabs), React Native Paper, thème MD3, `useGlobalStyles`, services API v1. Plusieurs rôles (tuteur, parent, élève, recruteur, etc.) et flux register/onboarding.
- **v2** : Expo Router (fichiers sous `app/`), nouveau backend, **tuteur uniquement** : auth = login + mot de passe oublié ; pas de register ni onboarding. Paper et composants type v1 sont utilisés où pertinent pour aligner l’UI.
- **Références fichiers v1 (tuteur uniquement)** : toutes les références ci-dessous sont des écrans ou composants **du flux tuteur** dans v1. Ne pas utiliser les écrans parent, élève, recruteur ou coordinateur.
  - Auth : `ednov-mobile-v1/src/screens/auth/LoginScreen.tsx` (partagé ; utilisé par le flux tuteur)
  - Dashboard : `ednov-mobile-v1/src/screens/tutor/TutorDashboard.tsx`
  - Sessions : `TutorSessions.tsx`, `SessionDetailScreen.tsx` (sessions tuteur)
  - CR : `TutorCompteRenduScreen.tsx`, `CompteRenduDetailScreen.tsx` (CR tuteur)
  - Élèves : `TutorStudents.tsx`, `StudentDetailScreen.tsx` (liste/détail élèves vu par le tuteur)
  - Profil : `TutorProfile` (profil tuteur)
  - Composants : `SearchFilterCard`, `SessionFilterModal`, `SessionCard`, `ReportCard`, `StudentCard`, `ZupDeCoLogo`, `ScreenContainer`, `EmptyState`, etc. dans `src/components/` et `src/components/filters/` — tels qu’utilisés dans les écrans tuteur.

Ce document peut être utilisé comme backlog dans un outil de suivi (Jira, Linear, etc.) en important les lignes du tableau.
