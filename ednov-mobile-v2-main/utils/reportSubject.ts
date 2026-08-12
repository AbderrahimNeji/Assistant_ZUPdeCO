/**
 * Affichage des matières : liste de libellés → chaîne séparée par des virgules.
 */
export function joinMatiereLabels(labels: string[]): string {
  return labels.map((s) => s.trim()).filter(Boolean).join(', ');
}
