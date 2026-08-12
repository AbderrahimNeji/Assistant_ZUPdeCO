/**
 * Registry of filterable entity fields per module.
 * Used by RuleCard to allow filtering rules by entity type/subcategory.
 */

export interface EntityFieldOption {
  value: string;
  label: string;
}

export interface ModuleEntityFields {
  /** Field name in the entity (e.g. 'type', 'sessionFormat') */
  field: string;
  /** Human-readable label for the field */
  label: string;
  /** Available options for this field */
  options: EntityFieldOption[];
}

/**
 * Maps module interface names to their filterable fields.
 * Only modules with entity subcategories need to be listed here.
 */
export const MODULE_ENTITY_FIELDS: Record<string, ModuleEntityFields[]> = {
  sessions: [
    {
      field: 'type',
      label: 'Type de séance',
      options: [
        { value: 'homework_help', label: 'Aide aux devoirs' },
        { value: 'individual_tutoring', label: 'Tutorat individuel' },
        { value: 'workshop', label: 'Atelier' },
        { value: 'whole_class', label: 'Classe entière' },
        { value: 'group_tutoring', label: 'Tutorat' },
      ],
    },
    {
      field: 'sessionFormat',
      label: 'Format de séance',
      options: [
        { value: 'in_person', label: 'Présentiel' },
        { value: 'remote', label: 'Distanciel' },
        { value: 'hybrid', label: 'Hybride' },
      ],
    },
  ],
  users: [
    {
      field: 'roles',
      label: 'Rôles',
      options: [
        { value: 'student', label: 'Élève' },
        { value: 'tutor', label: 'Tuteur' },
        { value: 'volunteer', label: 'Bénévole' },
        { value: 'coordinator', label: 'Coordinateur' },
        { value: 'manager', label: 'Manager' },
        { value: 'admin', label: 'Admin' },
      ],
    },
  ],
  // Add other modules as needed
};

/**
 * Returns the filterable fields for a given module, or an empty array if none.
 */
export function getModuleEntityFields(interfaceName: string): ModuleEntityFields[] {
  return MODULE_ENTITY_FIELDS[interfaceName] || [];
}
