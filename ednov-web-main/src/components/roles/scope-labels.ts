/**
 * Human-readable labels and tooltips for visibility scope relation codes.
 * Used throughout the role permissions builder UI.
 */

export interface ScopeLabel {
  code: string;
  label: string;
  description: string;
}

export const SCOPE_LABELS: Record<string, ScopeLabel> = {
  unrestricted: {
    code: 'unrestricted',
    label: 'Tous (aucune restriction)',
    description: "L'utilisateur voit toutes les entités de la société",
  },
  establishment: {
    code: 'establishment',
    label: 'Même établissement',
    description: "L'établissement de l'entité est le même que celui(ceux) de l'utilisateur",
  },
  program: {
    code: 'program',
    label: 'Même programme',
    description: "Le programme de l'entité est commun avec ceux de l'utilisateur",
  },
  department: {
    code: 'department',
    label: 'Même département',
    description:
      "Le département de l'entité (via l'établissement) est le même que celui de l'utilisateur",
  },
  managedBy: {
    code: 'managedBy',
    label: "Utilisateurs qu'il gère",
    description: "L'utilisateur est le responsable (managed_by) de l'entité",
  },
  assignment: {
    code: 'assignment',
    label: 'Ses assignations',
    description:
      "L'utilisateur fait partie des participants assignés à l'entité (tuteur, bénévole, élève)",
  },
  subject: {
    code: 'subject',
    label: 'Même matière',
    description: "La matière de l'entité correspond aux spécialités de l'utilisateur",
  },
  roleTarget: {
    code: 'roleTarget',
    label: 'Utilisateurs de rôle ciblé',
    description:
      'Utilisateurs ayant un rôle spécifique (nécessite de préciser le code du rôle cible)',
  },
};

/**
 * Returns the list of available relation codes for the scope builder.
 * Excludes 'unrestricted' (handled separately) and 'roleTarget' (requires extra config).
 */
export function getAvailableRelations(): string[] {
  return ['establishment', 'program', 'department', 'managedBy', 'assignment', 'subject'];
}

/**
 * Returns a natural language preview of a scope configuration.
 * Example: "Même établissement ET Même programme" or "Même établissement OU Utilisateurs qu'il gère"
 */
export function getScopePreview(relations: string[], logic: 'AND' | 'OR'): string {
  if (relations.length === 0) {
    return 'Aucune restriction';
  }

  const labels = relations.map((rel) => SCOPE_LABELS[rel]?.label || rel).filter(Boolean);

  if (labels.length === 1) {
    return labels[0];
  }

  const connector = logic === 'AND' ? ' ET ' : ' OU ';
  return labels.join(connector);
}
