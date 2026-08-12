import * as React from 'react';

/**
 * Props du composant TableRow
 *
 * TableRow est un wrapper minimaliste pour les composants de ligne de tableau (xxxRow).
 * Contrairement à TableCard qui crée un élément <div>, TableRow retourne directement
 * ses enfants via un fragment React pour respecter la sémantique HTML des tableaux.
 *
 * Le <tr> parent doit être créé par le DataTable, pas par TableRow, car les <td>
 * doivent être des enfants directs du <tr> pour une structure HTML valide.
 */
interface TableRowProps {
  /**
   * Contenu de la ligne (typiquement des éléments <td>)
   */
  children: React.ReactNode;

  /**
   * Callback optionnel pour les clics (non utilisé actuellement)
   * Conservé pour compatibilité future et cohérence avec TableCard
   */
  onClick?: () => void;

  /**
   * Callback optionnel pour les événements clavier (non utilisé actuellement)
   * Conservé pour compatibilité future et cohérence avec TableCard
   */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTableRowElement>) => void;

  /**
   * Classe CSS additionnelle (non utilisée actuellement)
   * Conservée pour compatibilité future et cohérence avec TableCard
   */
  className?: string;

  /**
   * Label d'accessibilité (non utilisé actuellement)
   * Conservé pour compatibilité future et cohérence avec TableCard
   */
  ariaLabel?: string;
}

/**
 * Composant TableRow - Wrapper générique pour les lignes de tableau
 *
 * Ce composant sert de base commune pour tous les composants xxxRow (SessionRow,
 * StudentRow, EstablishmentRow, etc.), exactement comme TableCard l'est pour
 * les composants xxxCard.
 *
 * ## Différences avec TableCard
 *
 * - **TableCard** : Crée un `<div>` avec classe CSS, gestion clavier et accessibilité
 * - **TableRow** : Retourne directement `{children}` sans wrapper, car le `<tr>`
 *   est géré par le DataTable parent
 *
 * ## Architecture
 *
 * ```
 * DataTable
 *   └── <tr className="group animate-fade-in">
 *         └── SessionRow (= TableRow)
 *               └── <td>...</td>
 *               └── <td>...</td>
 * ```
 *
 * ## Pourquoi un fragment ?
 *
 * 1. **Sémantique HTML** : Les `<td>` doivent être enfants directs d'un `<tr>`
 * 2. **Zéro régression** : Ne modifie pas le DOM existant
 * 3. **Zéro overhead** : Les fragments React n'ajoutent pas de nœud dans le DOM
 * 4. **Animations** : Les animations stagger sur `<tr>` continuent de fonctionner
 *
 * ## Usage
 *
 * ```typescript
 * export const SessionRow: React.FC<SessionRowProps> = ({ session, ... }) => {
 *   return (
 *     <TableRow>
 *       <td>...</td>
 *       <td>...</td>
 *       <td>...</td>
 *     </TableRow>
 *   );
 * };
 * ```
 *
 * @param props - Les props du composant
 * @returns Un fragment React contenant les enfants
 */
export const TableRow: React.FC<TableRowProps> = ({
  children,
  // Les props suivantes ne sont pas utilisées actuellement mais conservées
  // pour compatibilité future et cohérence d'interface avec TableCard
  onClick,
  onKeyDown,
  className,
  ariaLabel,
}) => {
  // TableRow ne crée PAS de <tr>, il retourne les <td> enfants directement
  // via un fragment React pour respecter la sémantique HTML <table>
  return <>{children}</>;
};
