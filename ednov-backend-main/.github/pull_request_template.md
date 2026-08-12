## Linear

> Closes [POC-](https://linear.app/zupdeco-plateforme/issue/POC-)
> *(remplacer le numéro du ticket, ex: Closes [POC-123](https://linear.app/zupdeco-plateforme/issue/POC-123))*

## Description

<!-- Pourquoi ce changement ? Quel problème résout-il ? Soyez précis — ce texte sera posté automatiquement en commentaire sur le ticket Linear. -->

## Type de changement

- [ ] `feat` — nouvelle fonctionnalité
- [ ] `fix` — correction de bug
- [ ] `chore` — refactor, dépendances, configuration
- [ ] `migration` — contient une migration BDD ⚠️

## Comment tester

<!-- Instructions étape par étape pour le QA / reviewer -->
1. 
2. 
3. 

## Checklist

- [ ] `make ci` passe localement (lint + typecheck + tests)
- [ ] La branche respecte la convention : `type/poc-XXX-description`
- [ ] **Si migration** : `make migrate-create NAME=Xxx` + `run` / `revert` / `run` testés localement
- [ ] **Si migration** : le fichier de migration est commité avec le code dans la même PR
- [ ] Pas de `console.log` oublié
- [ ] Pas de secrets ou credentials dans le code

## Screenshots (si applicable)

<!-- Capture d'écran avant/après pour les changements UI -->
