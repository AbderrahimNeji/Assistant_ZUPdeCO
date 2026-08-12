# Guide d’utilisation — Ednov Mobile v2

Application mobile **Ednov** pour les **tuteurs** : suivi des séances, comptes rendus, présences, progression et notifications. Elle est construite avec Expo (iOS, Android, web).

---

## 1. Première ouverture et connexion

### 1.1 Connexion par e-mail et mot de passe

1. Sur l’écran de connexion, saisissez votre **adresse e-mail** et votre **mot de passe** (minimum 6 caractères).
2. Validez pour vous connecter via Firebase Authentication.
3. Si l’application est reliée au serveur (`API` configurée), un chargement « Connexion et chargement du thème… » peut s’afficher : le profil et la charte graphique de votre structure sont alors récupérés avant l’accueil.

**Sans connexion Internet**, un message vous invite à réessayer plus tard.

### 1.2 Connexion par téléphone (SMS)

1. Saisissez un **numéro de téléphone français valide** (identifiant reconnu comme téléphone, pas comme e-mail).
2. Aucun mot de passe n’est demandé : un **code OTP** est envoyé par SMS.
3. Saisissez le code sur l’écran suivant pour finaliser la connexion.

### 1.3 Mot de passe oublié

- **Par e-mail** : indiquez votre adresse ; un **lien de réinitialisation** est envoyé (vérifiez aussi les courriers indésirables).
- **Par téléphone** : un **code** est envoyé, puis vous pouvez définir un nouveau mot de passe (parcours OTP dédié).

Le retour à l’écran de connexion se fait via le bouton prévu à cet effet.

---

## 2. Navigation principale

Après connexion, l’application propose **cinq sections** dans la barre du bas (sur **grand écran web**, une **barre latérale** remplace cette barre) :

| Onglet | Rôle |
|--------|------|
| **Tableau de bord** | Vue synthétique de l’activité, prochaine séance, calendrier rapide |
| **Séances** | Liste des séances, filtres, accès au détail et à l’historique de présence |
| **Comptes rendus** | Liste des CR, saisie et suivi (badge indiquant le nombre de CR à saisir) |
| **Participants** | Liste des élèves (affichage respectant la confidentialité) |
| **Profil** | Infos personnelles, progression, réglages, déconnexion |

**Calendrier** : il n’apparaît pas comme onglet ; on y accède depuis le **tableau de bord** (widget calendrier ou lien « plein écran ») ou via la navigation interne.

Un **bandeau hors ligne** peut s’afficher en haut lorsque le réseau est indisponible. Des **messages de synchronisation** peuvent confirmer la remontée des actions effectuées hors connexion.

---

## 3. Tableau de bord

### 3.1 Progression (gamification)

Une carte **« Votre progression »** (niveau, XP, prochain palier) peut être affichée ; un appui ouvre le **Profil** pour le détail.

### 3.2 Période d’analyse

Des boutons permettent de choisir la **période** utilisée pour les indicateurs : **Semaine**, **Mois**, **Trimestre**, **Semestre**, **Année scolaire**.  
Une info-bulle explique que **toutes les cartes** (séances, CR, heures) s’alignent sur cette plage.

### 3.3 Rappel des comptes rendus

Si des CR restent à saisir et que les **rappels CR** sont activés dans les préférences, une **alerte** renvoie vers l’onglet Comptes rendus avec le filtre adapté.

### 3.4 Indicateurs (cartes statistiques)

Selon les données serveur : **Séances**, **Élèves suivis**, **CR complétés**, **CR en retard**, **Heures validées**. Des **info-bulles** décrivent chaque indicateur.

### 3.5 Prochaine séance

- Affichage de la **prochaine séance** avec date, lieu et **statut** (badge coloré).
- Bouton **« Rejoindre la séance »** : ouvre le **détail** de cette séance.

### 3.6 Calendrier (aperçu)

- **Appui sur une date** : ouverture du **calendrier** en vue **jour** pour cette date.
- **Appui sur un événement** : détail de la **séance** correspondante.
- Lien pour ouvrir le calendrier en **vue mois**.

### 3.7 Accès rapides

- Lien vers la liste des **élèves** et le nombre suivis sur la période.
- Rappel du nombre de **séances cette semaine** avec lien vers la liste des **Séances**.

**Tirer vers le bas** sur l’écran pour actualiser le tableau de bord et la progression.

---

## 4. Séances

### 4.1 Liste et recherche

- Champ **recherche** : date, lieu ou salle.
- Bouton **actualiser** pour recharger la liste.
- Bouton **filtres avancés** (compteur si des filtres sont actifs).

**Filtres rapides (puces)** : **Toutes**, **Cette semaine**, **À venir**, **Passées**.

**Filtres avancés (modal)** :

- **Statut de la séance** : toutes, à venir, en cours, réalisée, annulée.
- **Période** : toutes, cette semaine, à venir, passées.
- **Statut du compte rendu** : tous, à saisir, saisi, validé.

Sur **mobile**, le bas de liste charge davantage de séances au **scroll** ou via **« Voir plus »**. Sur **grand écran web**, la **pagination** par pages est disponible.

### 4.2 Historique de présence

Depuis la liste des séances, le bouton **« Historique présence »** ouvre une liste des **séances passées** avec possibilité d’**déplier** chaque ligne pour voir la **présence des élèves**, puis **« Voir le détail »** pour ouvrir la séance.

### 4.3 Détail d’une séance

**Informations** : date et heure, lieu / établissement, **format** (présentiel, visio, hybride), disponibilité du **lien de réunion**.

**Candidats à l’assignation** (si la fonctionnalité est activée côté serveur) : listes d’**élèves** et de **tuteurs** éligibles.

**Tuteurs, bénévoles et élèves — présence** :

- Tant que la séance est **en cours** (`in_progress`), vous pouvez **modifier la présence** en appuyant sur une ligne.
- **Élèves** : choix typiquement **Présent** / **Absent** (boîte de dialogue).
- **Tuteurs / bénévoles** : **Présent**, **Absence justifiée** (motifs dont Examen, Malade, Autre), **Absence non justifiée**.
- Sur **web**, des écrans dédiés remplacent certaines boîtes de dialogue.
- **Après la fin de séance**, la présence **n’est plus modifiable** (message explicite).

**Rejoindre la séance** : visible si un **lien** existe et que le statut permet de rejoindre (séance prévue ou en cours) ; ouvre le lien (visioconférence) dans le navigateur ou l’app adaptée.

**Assistant IA** (si l’API est configurée et hors mode démo) : accès au **chat** pour poser des questions sur la séance.

**Enregistrement pour génération de CR par IA** (séance **en cours** et API configurée) :

- **Démarrer l’enregistrement** : lance la capture ; une **barre flottante** en bas permet de contrôler l’enregistrement.
- Pendant l’upload ou le traitement, des états **« Génération du CR en cours… »** ou messages d’erreur peuvent s’afficher ; un **modal de traitement IA** peut prendre le relais après validation.
- Un seul enregistrement à la fois : si une autre séance est déjà en cours d’enregistrement, un message l’indique.

**Après analyse** (si un rapport existe) :

- **Résultats de l’analyse** : script, brouillon de CR, ressources.
- **Voir le CR** : ouvre le compte rendu lié pour consultation ou modification.

**Actualisation** : utilisez le bouton prévu ou les gestes système selon l’écran.

---

## 5. Comptes rendus (CR)

### 5.1 Liste

- **Recherche** (libellés liés aux séances).
- **Actualiser**.
- **Filtres** (modal) : **période** (tous, cette semaine, ce mois) et **statut** (tous, à saisir, saisi, validé).
- **Puces** : raccourcis de statut **Tous**, **CR à saisir**, **Saisi**, **Validé**.

Chaque ligne indique le **statut**, la **date de séance** et un **aperçu** (matière, note…).

### 5.2 Ouvrir ou créer un CR

- **CR non soumis** : ouverture du **formulaire de saisie** (`nouveau`) pour la séance concernée.
- **CR déjà saisi** : ouverture du **détail** en lecture (avec actions possibles selon les droits : marquer comme saisi, validation, etc.).

### 5.3 Formulaire de saisie (nouveau / édition)

Champs typiques :

- **Séance** associée (sélection si pertinent).
- **Note globale** : nombre **entre 0 et 5** (obligatoire).
- **Matière** (obligatoire).
- **Commentaire** (optionnel).
- **Ressenti** de l’élève : par ex. très à l’aise → en difficulté (liste prédéfinie).

Si une **suggestion IA** est disponible pour la même séance (suite à un enregistrement analysé), vous pouvez **l’appliquer** au commentaire.

**Soumission** : impossible **sans réseau** (message d’erreur). Après succès, retour vers la liste ou vers la **séance d’origine** selon le contexte.

### 5.4 Détail d’un CR

Affichage des informations de la séance, du statut, de la note (souvent avec **étoiles**), du ressenti, des participants, et actions possibles (**soumettre**, **valider** selon le profil — par ex. validation réservée aux coordinateurs côté métier).

---

## 6. Participants (élèves)

- **Recherche** par **nom affiché** (pseudonyme ou identifiant public — **confidentialité**).
- **Filtres** par **niveau** ou **programme** (puces « Tous » + tags dérivés des données).
- Les cartes affichent **initiales**, nom d’affichage et **niveau** le cas échéant.

> Les noms peuvent être **génériques** ou masqués volontairement : se référer aux textes d’aide à l’écran.

---

## 7. Profil

### 7.1 Carte utilisateur

Photo ou initiales, **nom**, rôle **Tuteur**, date d’inscription, bouton **Modifier** (voir ci-dessous).

### 7.2 Progression

Niveau, **XP**, barre de progression, **badges**, liens :

- **Voir le classement** : **top 20** des utilisateurs avec XP ; votre ligne peut être mise en évidence ; si vous êtes au-delà du top affiché, une section **« Votre position »** peut apparaître.

- **Historique d’activité** : fil d’événements (séance réalisée, CR soumis, badge obtenu) avec **navigation** vers la séance ou la liste des CR selon le type.

### 7.3 Casier judiciaire

Si l’API est active : **téléversement d’un PDF** (ajout ou remplacement), **consultation** du document (ouverture dans le navigateur). En **démo** ou sans API, l’upload réel est désactivé (message explicite).

### 7.4 Coordonnées et créneaux

- **Téléphone**, **établissement**.
- **Créneaux d’engagement** (jour et plage horaire) ou message si aucun créneau.

### 7.5 Apparence

**Interrupteur jour / nuit** (thème clair ou sombre).

### 7.6 Notifications

Écran dédié : **rappels de CR** et **rappels de séance** (activation / désactivation), avec choix des **délais** (ex. rappel séance : 5 min à 1 h avant ; rappel CR : 30 min à 24 h après la fin de séance).  
L’activation peut demander l’**autorisation système** de notification.

### 7.7 Déconnexion

Bouton **Déconnexion** → confirmation dans une boîte de dialogue → retour à l’écran de connexion.

### 7.8 Modifier le profil

Écran séparé : **prénom**, **nom** (obligatoires), **téléphone** (optionnel, format français). Enregistrement impossible **hors ligne**.

---

## 8. Calendrier (écran plein)

- **Retour** arrière.
- **Aujourd’hui** : place la vue sur le jour courant en **vue jour**.
- **Navigation** mois par mois (vue mois) ou jour par jour (vue jour).
- **Vue mois** : les jours avec séance sont mis en évidence ; appuyer sur un jour passe en **vue jour** avec la liste des séances.
- **Vue jour** : liste des séances ; appui sur une ligne → **détail de la séance**.
- **Tirer pour actualiser** recharge les séances.

---

## 9. Comportements transverses

### 9.1 Thème et charte

Couleurs et logo peuvent refléter la **charte** de votre organisation après chargement du profil et du branding.

### 9.2 Accessibilité

De nombreux éléments ont des **libellés accessibilité** (lecteurs d’écran) et des **rôles** (boutons, en-têtes).

### 9.3 Rappels CR sur le tableau de bord

Le bandeau « CR à saisir » du tableau de bord respecte le paramètre **Rappel CR** dans **Profil → Notifications**.

### 9.4 Mode hors ligne

Sans réseau, certaines actions (connexion, envoi de formulaires, etc.) sont bloquées avec message ; des **files d’attente** peuvent synchroniser des opérations une fois le réseau revenu (bandeau de confirmation possible).

### 9.5 Notifications push (Expo)

Sur certaines configurations (par ex. **Expo Go sur Android**), les rappels locaux peuvent être **limités** selon la version d’Expo : privilégiez un build natif pour un comportement complet.

---

## 10. Récapitulatif des parcours fréquents

| Objectif | Où aller |
|----------|----------|
| Voir les séances à venir | **Séances** → filtre **À venir** |
| Noter les présences | **Séances** → ouvrir une séance **en cours** → section Présence |
| Rejoindre une visio | **Détail séance** → **Rejoindre la séance** |
| Saisir un CR | **Comptes rendus** ou bannière du **Tableau de bord** → ligne **À saisir** |
| Consulter le classement XP | **Profil** → **Voir le classement** |
| Changer le délai des rappels | **Profil** → **Notifications** |
| Voir l’historique des présences passées | **Séances** → **Historique présence** |

---

*Document généré à partir du comportement de l’application **Ednov Mobile v2** (code source). Les libellés exacts à l’écran peuvent évoluer avec les mises à jour.*
