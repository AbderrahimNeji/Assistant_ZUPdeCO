# Gamification

## À quoi sert la gamification ?

La **gamification** récompense l’activité des **tuteurs** et **bénévoles** avec des **points d’expérience (XP)**, des **niveaux**, des **badges** et éventuellement des **défis** selon la configuration de votre organisation. Elle vise à valoriser l’engagement (présence, qualité pédagogique, etc.) de façon ludique. Les règles exactes (combien d’XP pour quelle action) sont définies par les **administrateurs** de la plateforme.

## Classement (leaderboard)

Sur le web, une page **classement** permet de voir un **leaderboard** : liste des tuteurs classés par **XP** avec leur **niveau** et parfois un visuel de badge. Le chemin d’URL interne est en général `/dashboard/gamification-leaderboard`. Le libellé exact dans le **menu latéral** dépend de votre paramétrage (il peut s’appeler « Gamification », « Classement », etc.). Si vous ne voyez pas ce menu, vous n’avez peut‑être pas la **permission** correspondante ou la fonctionnalité n’est pas exposée dans votre menu.

## Voir la gamification d’un tuteur ou bénévole (personnel staff)

Les rôles **staff** (par exemple coordinateur, manager, admin) peuvent consulter le **résumé de gamification** d’un **tuteur** ou **bénévole** depuis sa **fiche utilisateur** : section dédiée avec XP, niveau actuel, badges obtenus, etc. Cela complète le classement global pour le suivi individuel.

## Configuration (administrateurs et managers)

La **configuration** des niveaux, badges, règles d’XP et éléments associés est réservée aux profils **administrateur** et **manager** via l’**API d’administration** gamification (niveaux, badges, règles, activation). Il n’y a pas forcément un écran unique « Gamification admin » dans le menu web pour tout paramétrer : selon votre déploiement, la configuration peut passer par des outils internes ou des écrans spécifiques. En cas de doute, contactez l’administrateur technique de votre structure.

## Élèves et gamification

La gamification décrite ici cible en priorité les **tuteurs** et **bénévoles**. Les **élèves** ne sont en général pas concernés par le même dispositif XP / leaderboard dans cette interface d’administration.
