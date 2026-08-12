# E2E / Manuel – Checklist « passage à l’API »

Cette checklist permet de valider le bon fonctionnement de l’app mobile une fois le basculement sur l’API effectué (données dynamiques au lieu du mode statique).

**Prérequis :**  
- `EXPO_PUBLIC_USE_STATIC_DATA=false`  
- `EXPO_PUBLIC_API_URL` défini (URL de l’API backend)

---

## Checklist

Cocher après chaque test manuel.

| # | Zone / flux | À vérifier | OK |
|---|-------------|------------|-----|
| 1 | **Login** | Connexion avec identifiants valides, redirection vers l’app | ☐ |
| 2 | **Dashboard** | KPIs affichés (séances, élèves suivis, CR, etc.) | ☐ |
| 3 | **Séances – liste** | Liste des séances chargée depuis l’API, filtres (statut) | ☐ |
| 4 | **Séance – détail** | Détail d’une séance (établissement, salle, présences) | ☐ |
| 5 | **Présence** | Mise à jour de la présence d’un participant (PATCH), liste à jour | ☐ |
| 6 | **Comptes rendus – liste** | Liste des CR, accès via « Voir le CR » (reportId) | ☐ |
| 7 | **Comptes rendus – nouveau / édition** | Création et modification d’un CR | ☐ |
| 8 | **Profil** | Affichage et édition du profil utilisateur | ☐ |
| 9 | **Historique** | Consultation de l’historique | ☐ |
| 10 | **Classement** | Écran classement (si applicable) | ☐ |
| 11 | **Ressources** | Consultation des ressources | ☐ |
| 12 | **Notifications** | Liste / paramètres des notifications | ☐ |
| 13 | **Élèves** | Liste Élèves (GET /users/students), recherche, navigation détail | ☐ |
| 14 | **Offline / sync** | Comportement hors ligne et resync (si implémenté) | ☐ |

---

**Done when:** La checklist est utilisable par l’équipe pour valider une release « switch to API ».
