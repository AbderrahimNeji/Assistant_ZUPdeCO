# Transitions de statut des séances

**Ce document décrit le cycle de vie des séances : ce qui est calculé à la lecture (jamais écrit en base) et ce qui est stocké (écrit en base + historique).**

---

## Vue d’ensemble


| Statut      | Origine                | Déclencheur                                    |
| ----------- | ---------------------- | ---------------------------------------------- |
| PLANNED     | Stocké                 | Création de la séance                          |
| IN_PROGRESS | Calculé **ou** stocké  | Heure de début dépassée **ou** premier présent |
| COMPLETED   | **Calculé uniquement** | Heure de fin dépassée                          |
| CLOSED      | Stocké                 | Validation du CR                               |
| CANCELLED   | Stocké                 | Annulation via PATCH session                   |


---

## Ce qui est calculé (au GET, jamais stocké)

Les statuts liés au temps ne sont **pas** écrits en base. Ils sont dérivés à chaque lecture à partir de la date/heure de la séance et de l’instant courant.


| Transition calculée     | Condition                                                      | Où c’est appliqué                                   |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| PLANNED → IN_PROGRESS   | `now >=` instant début (voir fuseau ci‑dessous), statut stocké = PLANNED   | Tous les endpoints qui renvoient une ou des séances |
| IN_PROGRESS → COMPLETED | `now >=` instant fin, statut stocké = IN_PROGRESS | Idem                                                |


**APIs concernées (le champ `status` renvoyé est le statut effectif calculé) :**

- `GET /sessions` (liste paginée)
- `GET /sessions/:id` (détail d’une séance)
- Export CSV des séances (via `findAllForExport`)
- Tableaux de bord : sessions du jour (coordinateur), prochaines séances (tuteur)
- Réponse de `PATCH /sessions/:id` (après mise à jour)

**Fuseau horaire (heure locale de la séance) :** les champs `session_date`, `start_time` et `end_time` sont interprétés comme une **heure murale** dans :

1. `timeZoneOverride` si fourni (usage interne / tests) ;
2. sinon `establishment.timezone` (IANA, ex. `Europe/Paris`) lorsque l’établissement est chargé avec la séance ;
3. sinon **`Europe/Paris`** par défaut.

Le calcul utilise **Luxon** (`DateTime.fromISO` avec `zone`) pour convertir ces instants en UTC avant comparaison avec `now`.

**Implémentation :** fonction `getEffectiveStatus(session, now?, timeZoneOverride?)` dans `session-status.transitions.ts`, appelée avant de renvoyer les séances. Les tests unitaires passent souvent `'UTC'` en 3ᵉ argument pour figer l’interprétation « heure murale = UTC ».

---

## Ce qui est stocké (écrit en base + historique)

Chaque transition stockée met à jour la colonne `status` de la table `sessions` et enregistre une ligne dans `session_status_history` (from_status, to_status, trigger_type, actor_id, created_at).


| Transition stockée    | Trigger         | API / moment                                 | Rôle de l’API                                                                                                                                                                                     |
| --------------------- | --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PLANNED → IN_PROGRESS | `attendance`    | Premier élève ou tuteur marqué **présent**   | `POST /sessions/:sessionId/participants` (création avec `attendanceStatus: 'present'`) ou `PATCH /sessions/:sessionId/participants/:participantId` (mise à jour en `attendanceStatus: 'present'`) |
| PLANNED → CANCELLED   | `manual`        | Annulation par un utilisateur                | `PATCH /sessions/:id` avec `body: { "status": "CANCELLED" }` (autorisé uniquement depuis PLANNED)                                                                                                 |
| IN_PROGRESS → CLOSED  | `cr_validation` | Validation du compte rendu (CR) de la séance | `PATCH /sessions/:sessionId/reports/:reportId` avec statut du rapport à `validated` et/ou `validatedById` renseigné ; la séance doit être en IN_PROGRESS (stocké)                                 |


**Règles :**

- Seule la transition **PLANNED → CANCELLED** est autorisée via PATCH sur la séance. Toute autre demande de statut (ex. PLANNED → CLOSED) renvoie une erreur.
- IN_PROGRESS (stocké) ne peut passer à CLOSED que via la validation du CR, pas via PATCH session.

---

## Récapitulatif des APIs par effet


| API                                                                              | Effet sur le statut                                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /sessions`, `GET /sessions/:id`, export CSV, dashboards                     | Retournent le **statut effectif** (calculé) ; aucune écriture.                                   |
| `POST /sessions/:sessionId/participants` avec `attendanceStatus: 'present'`      | Si la séance est en PLANNED → passage **stocké** à IN_PROGRESS + ligne d’historique.             |
| `PATCH /sessions/:sessionId/participants/:id` avec `attendanceStatus: 'present'` | Même règle : PLANNED → IN_PROGRESS **stocké** + historique.                                      |
| `PATCH /sessions/:id` avec `status: "CANCELLED"`                                 | Si la séance est en PLANNED → passage **stocké** à CANCELLED + historique.                       |
| `PATCH /sessions/:sessionId/reports/:reportId` (validation du CR)                | Si le rapport est validé et la séance en IN_PROGRESS → passage **stocké** à CLOSED + historique. |


---

## Table d’historique

Table `**session_status_history`** : une ligne par transition stockée.

- `session_id`, `from_status`, `to_status`, `trigger_type` (`'manual'`  `'attendance'`  `'cr_validation'`), `created_at`, `actor_id` (optionnel).

Les transitions **calculées** (temps) ne créent pas de ligne d’historique.