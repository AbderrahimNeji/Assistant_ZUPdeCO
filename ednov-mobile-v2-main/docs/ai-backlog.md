# AI backlog — Intelligence artificielle (mobile)

Backlog des fonctionnalités IA à développer plus tard dans l’app mobile. Source : projet Linear [Intelligence artificielle](https://linear.app/zupdeco-plateforme/project/intelligence-artificielle-ba54fc6504cb) (Tutor Mobile App : assistant IA, consultation des ressources générées, CR généré).

**Status legend:** `To do` | `In progress` | `Done`

---

### IA-1. Comptes rendus générés automatiquement — consultation et validation (mobile)

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Mobile — CR / sessions |

**Description**  
Quand une séance a un lien visio (LiveKit), un bot IA peut rejoindre la séance, analyser les échanges et générer un brouillon de compte rendu. Le mobile doit permettre au tuteur de consulter ce brouillon, le modifier et le valider.

**Acceptance criteria**  
- [ ] Depuis la fiche séance (ou « Voir le CR »), le tuteur peut ouvrir un CR en brouillon généré par l'IA.
- [ ] Le tuteur peut modifier le contenu du brouillon (résumé, thèmes, difficultés, progrès, recommandations) avant validation.
- [ ] Le tuteur peut valider le CR (passage de brouillon à validé) depuis l'app.
- [ ] Si pas de CR auto : comportement actuel (création / édition manuelle du CR).

**Reference**  
Linear — Intelligence artificielle §4 (Feature 1 : Génération automatique de comptes rendus).

---

### IA-2. Assistant pédagogique IA pendant la séance (mobile)

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Mobile — séance / assistant |

**Description**  
Pendant une séance, le tuteur (et éventuellement l'élève) peut interagir avec un assistant IA pour poser des questions (explication d'un concept, exemple, exercice). L'IA s'adapte à la matière, au niveau scolaire et à la thématique de la séance.

**Acceptance criteria**  
- [ ] Depuis l'écran de séance (ou détail séance), accès à un « Assistant IA » (bouton ou onglet).
- [ ] Interface de chat ou Q/R avec l'assistant : le tuteur peut poser des questions et recevoir des réponses adaptées (explications, exemples, exercices).
- [ ] Contexte envoyé à l'IA : matière, niveau, thématique de la séance (à définir avec le backend).
- [ ] Réponses affichées de façon lisible (et si possible hors ligne après chargement).

**Reference**  
Linear — Intelligence artificielle §5 (Feature 2 : Assistant pédagogique IA).

---

### IA-3. Génération de ressources pédagogiques (mobile)

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | High |
| **Area** | Mobile — ressources / séance |

**Description**  
À partir des infos de la séance (matière, niveau, thématique), l'IA peut générer des ressources pédagogiques (exercices, fiches, exemples, explications). Le mobile doit permettre de demander ces ressources, de les consulter et de les utiliser (pendant la séance, envoi aux élèves, ou ajout à la bibliothèque).

**Acceptance criteria**  
- [ ] Depuis la préparation de séance ou la fiche séance : action « Générer des ressources avec l'IA » (ou équivalent).
- [ ] Sélection ou pré-remplissage : matière, niveau, thématique (aligné sur la séance).
- [ ] Affichage des ressources générées (liste ou détail) avec possibilité de les ouvrir / consulter.
- [ ] Actions possibles : utiliser pendant la séance, envoyer aux élèves, ajouter à la bibliothèque pédagogique (selon API et UX définies).

**Reference**  
Linear — Intelligence artificielle §6 (Feature 3 : Génération de ressources pédagogiques).

---

### IA-4. (Évolution) Analyse pédagogique — préparation mobile (optionnel)

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | Low |
| **Area** | Mobile — analytics / futur |

**Description**  
À terme, l'IA pourra analyser les données pédagogiques (difficultés récurrentes, décrochage, besoins). Le mobile pourrait afficher des indicateurs ou alertes dérivés de cette analyse (élèves en difficulté, matières problématiques). Pour l'instant, tâche de préparation ou suivi backend.

**Acceptance criteria**  
- [ ] Documenter ou prévoir un emplacement dans l'app pour de futurs indicateurs / alertes « Analyse pédagogique IA ».
- [ ] Lorsque le backend exposera des données d'analyse IA, définir les écrans ou widgets mobile à ajouter.

**Reference**  
Linear — Intelligence artificielle §7 (Feature 4 : Analyse pédagogique), §12 (Évolutions possibles).

---

### IA-5. Configuration et sécurité — respect des règles (mobile)

| Field | Value |
|-------|--------|
| **Status** | To do |
| **Priority** | Medium |
| **Area** | Mobile — config / conformité |

**Description**  
Les fonctionnalités IA peuvent être activées/désactivées par l'admin. Les échanges et ressources doivent rester accessibles uniquement aux participants concernés. Le mobile doit respecter ces règles (affichage conditionnel, pas d'accès hors périmètre).

**Acceptance criteria**  
- [ ] Les entrées « Assistant IA » et « Générer des ressources » ne sont visibles/actives que si la fonctionnalité IA est activée (selon config renvoyée par le backend).
- [ ] Pas d'accès aux CR ou ressources générées d'autres séances / utilisateurs que ceux autorisés.
- [ ] Logs / traçabilité : s'il existe des exigences côté client (ex. événements analytics), les implémenter.

**Reference**  
Linear — Intelligence artificielle §9 (Sécurité et protection des données), §10 (Configuration du module IA), §11 (Logs et traçabilité).

---

## Summary table

| ID   | Title | Priority | Area |
|------|--------|----------|------|
| IA-1 | CR générés auto — consultation et validation | High | Mobile — CR |
| IA-2 | Assistant pédagogique IA pendant la séance | High | Mobile — assistant |
| IA-3 | Génération de ressources pédagogiques | High | Mobile — ressources |
| IA-4 | (Évolution) Analyse pédagogique — préparation | Low | Mobile — futur |
| IA-5 | Configuration et sécurité IA | Medium | Mobile — config |

**Suggested order when developing:** IA-5 (config/feature flags) first, then IA-1, IA-2, IA-3 in parallel with backend; IA-4 when backend analysis is ready.
