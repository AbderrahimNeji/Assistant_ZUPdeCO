# Notifications (Rappel CR & Rappel séance) — À vérifier plus tard

Notes issues du review post-implémentation. À traiter quand on retravaille la zone ou en cas de bug.

---

## 1. Pagination des séances pour les rappels CR

**Contexte**  
`useCrReminders` / `useSessionsForCrReminders` appelle `fetchSessions({ dateFrom, dateTo, pageSize: 50 })`. Une seule page est récupérée.

**À vérifier**  
Si un tuteur a plus de 50 séances sur les 14 derniers jours, les séances au-delà de la première page ne recevront jamais de rappel CR.

**Options**  
- Paginer (boucle sur les pages jusqu’à tout récupérer) si le produit exige de couvrir toutes les séances.
- Ou documenter la limite (« au plus 50 séances prises en compte pour les rappels CR ») et l’accepter en V1.

---

## 2. Invalidation après soumission d’un CR

**Contexte**  
Quand un CR est soumis, les rappels CR devraient être recalculés (cette séance ne doit plus avoir de notification). Les mutations invalident `['sessions']` et `['sessions', 'report-kpis']`.

**À vérifier**  
La query des rappels CR a la clé `['sessions', 'cr-reminders', dateFrom, dateTo]`. S’assurer que l’invalidation par préfixe (ex. `queryClient.invalidateQueries({ queryKey: ['sessions'] })`) refait bien cette query. Sinon, ajouter une invalidation explicite de la query cr-reminders après soumission d’un CR (ou après toute mutation qui ajoute un `reportId` à une séance).

**Fichiers concernés**  
- `hooks/useSubmitCompteRendu.ts` (et tout endroit qui soumet ou valide un CR)
- `hooks/useCrReminders.ts` (query key)

---

## 3. Fuseau horaire (optionnel)

**Contexte**  
Les dates de séance sont passées à `new Date(...)` puis on utilise `getDate()`, `getMonth()`, `getHours()` (heure locale). Si le backend envoie des dates en UTC, l’affichage et le calcul de la fin de séance dépendent du fuseau de l’appareil.

**À vérifier**  
Si un jour le backend envoie des ISO en UTC, documenter ou centraliser la conversion (ex. helper `toLocalSessionDate(session.date)`) pour éviter les décalages d’affichage ou de planification.

---

## 4. Ordre des séances sans CR (mineur)

**Contexte**  
Dans `crReminders.ts`, on filtre les séances sans CR puis `.slice(0, MAX_CR_REMINDERS)` sans tri explicite.

**À vérifier**  
Si l’ordre de l’API change, un tri explicite (ex. par date de fin décroissante) rend le comportement prévisible (ex. « les 20 séances les plus récentes sans CR »).

---

*Dernière mise à jour : review post-implémentation Rappel CR / Rappel séance.*
