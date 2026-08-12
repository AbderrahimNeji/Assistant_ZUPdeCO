/**
 * Expand how-to / process questions so hybrid retrieval lands on the right
 * functional chapters (e.g. CR auto-generation rules).
 */
export function expandDocumentationQuery(query: string): string {
  const q = query?.trim() || '';
  if (!q) return q;

  const parts: string[] = [q];

  const isReport =
    /\b(comptes?\s*-?\s*rendu\w*|compte.?rendu\w*|session report|\breports?\b|\bcr\b)\b/i.test(
      q,
    );
  const isHowTo =
    /\b(comment|how (do|does|can|to)|qu['’]est[- ]ce|c['’]est quoi|explique|étapes?|etapes?|onboard)\b/i.test(
      q,
    ) ||
    /\b(cr[ée]er?|crée|cree|faire|g[ée]n[ée]rer|remplir|saisir|ajouter|affecter|valider)\b/i.test(
      q,
    );

  if (isReport && (isHowTo || /\b(automatique|génér|gener|absence|statut|à saisir|a saisir)\b/i.test(q))) {
    parts.push(
      'Le CR est créé automatiquement par le système',
      'Génération du compte rendu',
      'Une séance génère au maximum un CR',
      'généré à la clôture de la séance',
      'À saisir Saisi Validé',
      'séance annulée pas de compte rendu',
      'absence élève compte rendu',
    );
  }

  if (/\b(parent|guardian|responsable l[ée]gal)\b/i.test(q)) {
    parts.push(
      'parcours parent inscription',
      'ajouter un élève parent',
      'Mes comptes rendus parent',
      'parent ne peut pas modifier le compte rendu',
      'rôle du parent',
    );
  }

  if (/\b(onboard\w*|inscription (tuteur|tutor)|prospect|lead qualifi)\b/i.test(q)) {
    parts.push(
      'parcours tuteur onboarding',
      'étapes d’onboarding tuteur',
      'questionnaire pré-qualification',
      'Lead qualifié casier judiciaire',
      'réunion d’information',
    );
  }

  if (/\b(matching|bin[oô]me|appari)\b/i.test(q)) {
    parts.push(
      'matching auto-équilibré',
      'binôme cœur',
      'création de binôme',
      'règles d’affectation tuteur élève',
    );
  }

  if (/\b(s[ée]ance|session)\b/i.test(q) && /\b(dur[ée]e|dure|combien|minutes|heure|annul|cancel|what is|qu['’]est|tutoring session)\b/i.test(q)) {
    parts.push(
      'durée d’une séance 1h30',
      '90 minutes',
      'annulation de séance',
      'séance annulée pas de CR',
      'définition séance de tutorat',
      'une séance de tutorat',
    );
  }

  if (/\b(automatique|automatically|est[- ]il cr[ée]{1,2}|are .+ created automatically)\b/i.test(q) && isReport) {
    parts.push(
      'Le CR est créé automatiquement par le système',
      'généré à la clôture',
      'séance annulée aucun compte rendu',
    );
  }

  if (/\b(parent).{0,40}(ajout|add|élève|student)|ajoute[- ]t[- ]il un [ée]lève\b/i.test(q)) {
    parts.push(
      'parcours parent inscription',
      'ajouter un élève',
      'parent ajoute élève',
    );
  }

  if (/\b(absence).{0,30}(cr|compte.?rendu)|impact.{0,20}absence\b/i.test(q)) {
    parts.push(
      'absence élève compte rendu',
      'séance réalisée malgré absence',
      'génération du compte rendu',
    );
  }

  if (/\bscoring\b/i.test(q)) {
    parts.push(
      'scoring élève',
      'statuts scoring',
      'le scoring ne bloque pas le flux métier',
    );
  }

  if (/\b(tuteur|tutor)\b/i.test(q) && /\b(r[oô]le|qu['’]est|what is|c['’]est quoi)\b/i.test(q)) {
    parts.push('rôle du tuteur dans Zupdeco', 'bénévole accompagnement élève');
  }

  if (parts.length === 1) return q;
  return parts.join(' — ');
}
