# Backlog application mobile — Tuteur / VSC

État d'avancement des exigences fonctionnelles par rapport à l'application **ednov-mobile-v2**.

- **Statut** : Done = implémenté dans l'app | Not done = non implémenté
- **Priorité** : Must | Should | Could

---

## Sprint 1

### AUTH

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| A1 | Connexion tuteur/VSC | Écran de connexion sécurisé : email ou téléphone + mot de passe ou OTP | Must | **Done** |
| A2 | Se connecter | Modes d'authentification sécurisés (email+password, phone+OTP) | Must | **Done** |
| A3 | Session | Session conservée (rester connecté) | Must | **Done** |
| A4 | Réinitialisation mot de passe | Mot de passe oublié via email (lien sous le formulaire) | Must | **Done** |
| A5 | Réinitialisation via SMS OTP | Récupération de compte via SMS OTP (en plus de l'email) | Must | **Done** |

### PROFILE

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| P1 | Profil tuteur | Consulter ses informations personnelles | Must | **Done** |
| P2 | Coordonnées | Afficher coordonnées et établissement rattaché | Must | **Done** |
| P3 | Engagement | Jours et horaires de disponibilité déclarés | Must | **Done** |

### SECURITY

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| S0 | Accès sécurisé séance | Le tuteur n'accède qu'aux séances qui lui sont assignées | Must | **Done** (backend) |

---

## Sprint 2

### DASHBOARD

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| D1 | Dashboard tuteur | Tableau de bord qui synthétise les activités principales | Must | **Done** |
| D2 | KPI séances | Nombre total de séances sur une période donnée | Must | **Done** |
| D3 | KPI élèves | Nombre d'élèves accompagnés (calculé à partir des séances) | Must | **Done** |
| D4 | KPI comptes rendus | CR soumis et restant à compléter | Must | **Done** |
| D5 | KPI heures | Heures tutorées validées (durée des séances terminées) | Must | **Done** |

### SESSIONS

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| SE1 | Liste séances | Consulter toutes les séances affectées (date, statut, établissement) | Must | **Done** |
| SE2 | Filtre séances | Filtrer les séances (période, établissement) | Must / Should | **Done** |
| SE3 | Détail séance | Fiche séance : date, heure, salle, élèves, statut | Must | **Done** |
| SE4 | Mode séance | Afficher le type de séance (visio / présentiel) | Should | **Done** |

### STUDENTS

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| ST1 | Liste élèves | Consulter la liste des élèves accompagnés | Must | **Done** |
| ST2 | Recherche élève | Barre de recherche pour retrouver un élève | Must | **Done** |

### ATTENDANCE

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| AT1 | Voir présence | Liste des élèves avec statut de présence pour la séance | Must | **Done** |

### UX

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| UX1 | Interface mobile-first | UI optimisée pour l'usage mobile | Must | **Done** |
| UX2 | Navigation principale | Menu par onglets pour les sections principales | Must | **Done** |
| UX3 | Performance | Chargement des écrans principaux en moins de 2 secondes | Must | **À vérifier** |

---

## Sprint 3

### SESSIONS

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| SE5 | Lien visio | Rejoindre une séance visio depuis l'application | Should | **Done** |

### STUDENTS

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| ST3 | Fiche élève | Détail élève et informations pédagogiques essentielles | Must | **Done** |

### COMPTES RENDUS

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| CR1 | Accès CR | Accéder à la liste des CR liés aux séances du tuteur | Must | **Done** |
| CR2 | Liste CR non saisis | Voir les CR à compléter | Must | **Done** |
| CR3 | Saisie CR | Remplir un CR après une séance (évaluation, commentaire) | Must | **Done** |
| CR4 | Historique CR | Consulter les CR déjà soumis | Must | **Done** |
| CR5 | Modifier CR | Modifier le CR tant qu'il n'est pas validé | Must | **Done** |
| CR6 | Statut CR | Afficher l'état du compte rendu (À saisir / Saisi, etc.) | Must | **Done** |

### ATTENDANCE

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| AT2 | Modifier présence | Marquer les élèves présents ou absents en séance | Must | **Done** |
| AT3 | Historique présence | Consulter les présences passées | Should | **Done** |

### NOTIFICATIONS

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| N1 | Rappel CR | Notification si un CR n'est pas soumis | Should | **Done** |
| N2 | Rappel séance | Notification avant le début d'une séance | Could | **Done** |

### RESSOURCES

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| R1 | Liste ressources | Accès aux ressources pédagogiques | Should | **Done** |
| R2 | Détail ressource | Consulter le détail d'une ressource | Should | **Done** |
| R3 | Filtre ressources | Filtrer par matière ou niveau | Could | **Done** |

### GAMIFICATION

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| G1 | XP | Voir les XP cumulés | Should | **Done** |
| G2 | Niveau | Voir niveau et progression | Should | **Done** |
| G3 | Badges | Afficher les badges obtenus | Should | **Done** |
| G4 | Progression niveau | Barre de progression vers le prochain niveau | Should | **Done** |

### PROFILE

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| P4 | Modifier profil | Modifier certaines informations (prénom, nom, téléphone) | Should | **Done** |
| P5 | Paramètres notifications | Gérer les préférences de notifications (Rappel CR, Rappel séance) | Should | **Done** |

---

## Sprint 4

**Ordre suggéré pour ce sprint :** 1) G5 Classement → 2) O1 Historique activité → 3) O2 Mode hors ligne.

### GAMIFICATION

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| G5 | Classement | Leaderboard : top N + position du tuteur (ex. `GET /gamification/leaderboard` par périmètre/entreprise). Écran ou section mobile « Classement ». | Could | **Done** |

### AUTRES

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| O1 | Historique activité | Fil d'activité (séances, CR, badges) via ex. `GET /activity-feed/me`. Liste mobile « Historique » chronologique. | Could | **Done** |
| O2 | Mode hors ligne | Cache lecture (profil, séances, CR, KPIs) ; file d'écriture (CR, présence) ; synchro au retour en ligne. Indicateur offline + message « Données en cache » / synchro. | Could | **Done** |

**Détails techniques :** G5 — API leaderboard par périmètre ; O1 — API activity-feed/me ; O2 — cache lecture + file d'écriture + synchro (voir descriptions ci-dessus).

---

## Résumé

| Sprint | Done | Not done |
|--------|------|----------|
| **Sprint 1** | 9 | 0 |
| **Sprint 2** | 14 | 1 |
| **Sprint 3** | 22 | 0 |
| **Sprint 4** | 3 | 0 |
| **Total** | **48** | **1** |

---

*Dernière mise à jour : R3 Filtre ressources marqué Done (filtres matière et niveau sur la liste ressources, API query params subjectId/levelId, options dérivées des données).*
