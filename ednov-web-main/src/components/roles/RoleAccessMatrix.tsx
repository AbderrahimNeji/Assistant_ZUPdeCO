import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/forms/Checkbox';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { getAllInterfaceElements } from '@/services/interface-elements.service';
import type { InterfaceElement } from '@/types/interface-elements.types';
import type { RoleBinding } from '@/types/role.types';

export type { RoleBinding };

interface RoleAccessMatrixProps {
  value: RoleBinding[];
  onChange: (bindings: RoleBinding[]) => void;
  hierarchyLevel?: number;
  roleGroupCode?: string;
  mode?: 'in_person' | 'remote' | 'hybrid';
  inheritedBindings?: RoleBinding[];
}

interface ModuleGroup {
  moduleName: string;
  moduleLabel: string;
  icon: string | null;
  elements: InterfaceElement[];
}

// Libellés des scopes (5 colonnes fixes)
const SCOPE_COLUMNS = [
  { code: 'unrestricted', label: 'Tout' },
  { code: 'same_establishment', label: 'Mon ét.' },
  { code: 'managed_by', label: 'Gérés' },
  { code: 'assignment', label: 'Affect.' },
  { code: 'relation_overlap', label: 'Cheval.' },
] as const;

type ScopeCode = (typeof SCOPE_COLUMNS)[number]['code'];

// Composant Accordion
interface AccordionItemProps {
  title: string;
  icon?: string | null;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
        {icon && <DynamicIcon name={icon} className="w-5 h-5 text-gray-700 flex-shrink-0" />}
        <span className="font-medium text-gray-900 flex-1 text-left">{title}</span>
        {badge && (
          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
            {badge}
          </span>
        )}
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

// Composant grille d'accès pour un module
interface ModuleAccessGridProps {
  module: ModuleGroup;
  bindings: RoleBinding[];
  inheritedBindings: RoleBinding[];
  onUpdateBinding: (elementId: string, scopes: string[], logic: 'AND' | 'OR') => void;
}

const ModuleAccessGrid: React.FC<ModuleAccessGridProps> = ({
  module,
  bindings,
  inheritedBindings,
  onUpdateBinding,
}) => {
  const actions = module.elements.filter((el) => el.elementType === 'action');

  const getActiveScopes = (elementId: string): string[] => {
    const binding = bindings.find((b) => b.elementId === elementId);
    if (binding?.visibilityScope?.relations) {
      return binding.visibilityScope.relations;
    }
    const inherited = inheritedBindings.find((b) => b.elementId === elementId);
    return inherited?.visibilityScope?.relations || [];
  };

  const getLogic = (elementId: string): 'AND' | 'OR' => {
    const binding = bindings.find((b) => b.elementId === elementId);
    if (binding?.visibilityScope) return binding.visibilityScope.logic;
    const inherited = inheritedBindings.find((b) => b.elementId === elementId);
    return inherited?.visibilityScope?.logic || 'OR';
  };

  const isInherited = (elementId: string): boolean => {
    return inheritedBindings.some((b) => b.elementId === elementId && b.enabled);
  };

  const isScopeChecked = (elementId: string, scope: ScopeCode): boolean => {
    const scopes = getActiveScopes(elementId);
    return scopes.includes(scope);
  };

  const toggleScope = (elementId: string, scope: ScopeCode, checked: boolean) => {
    const currentScopes = getActiveScopes(elementId);
    const currentLogic = getLogic(elementId);

    let newScopes: string[];

    if (scope === 'unrestricted') {
      // Si on coche "Tout", désélectionner tout le reste
      if (checked) {
        newScopes = ['unrestricted'];
      } else {
        newScopes = [];
      }
    } else {
      // Décocher "Tout" automatiquement si on coche autre chose
      const filtered = currentScopes.filter((s) => s !== 'unrestricted');

      if (checked) {
        newScopes = [...filtered, scope];
      } else {
        newScopes = filtered.filter((s) => s !== scope);
      }
    }

    onUpdateBinding(elementId, newScopes, currentLogic);
  };

  const toggleLogic = (elementId: string) => {
    const currentScopes = getActiveScopes(elementId);
    const currentLogic = getLogic(elementId);
    const newLogic = currentLogic === 'AND' ? 'OR' : 'AND';
    onUpdateBinding(elementId, currentScopes, newLogic);
  };

  const hasUnrestrictedChecked = (elementId: string): boolean => {
    return isScopeChecked(elementId, 'unrestricted');
  };

  const hasMultipleScopes = (elementId: string): boolean => {
    const scopes = getActiveScopes(elementId).filter((s) => s !== 'unrestricted');
    return scopes.length > 1;
  };

  if (actions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700">
                Action
              </th>
              {SCOPE_COLUMNS.map((col) => (
                <th
                  key={col.code}
                  className="border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => {
              const inherited = isInherited(action.id);
              const hasUnrestricted = hasUnrestrictedChecked(action.id);
              const showLogicToggle = hasMultipleScopes(action.id);
              const logic = getLogic(action.id);

              return (
                <React.Fragment key={action.id}>
                  <tr className={inherited ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                    <td className="border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{action.elementLabel}</span>
                        {inherited && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Hérité
                          </span>
                        )}
                      </div>
                    </td>
                    {SCOPE_COLUMNS.map((col) => (
                      <td key={col.code} className="border border-gray-200 px-3 py-2 text-center">
                        <Checkbox
                          checked={isScopeChecked(action.id, col.code)}
                          onCheckedChange={(checked) => toggleScope(action.id, col.code, checked)}
                          disabled={inherited || (hasUnrestricted && col.code !== 'unrestricted')}
                        />
                      </td>
                    ))}
                  </tr>
                  {showLogicToggle && (
                    <tr>
                      <td colSpan={6} className="border border-gray-200 px-3 py-1 bg-blue-50">
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <span>Logique entre périmètres cochés :</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`logic-${action.id}`}
                              checked={logic === 'OR'}
                              onChange={() => toggleLogic(action.id)}
                              disabled={inherited}
                              className="w-3 h-3"
                            />
                            <span>OU</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`logic-${action.id}`}
                              checked={logic === 'AND'}
                              onChange={() => toggleLogic(action.id)}
                              disabled={inherited}
                              className="w-3 h-3"
                            />
                            <span>ET</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Composant principal
export const RoleAccessMatrix: React.FC<RoleAccessMatrixProps> = ({
  value,
  onChange,
  mode,
  inheritedBindings = [],
}) => {
  const [modules, setModules] = React.useState<ModuleGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadElements = async () => {
      try {
        setLoading(true);
        const groupedElements = await getAllInterfaceElements();

        const moduleGroups: ModuleGroup[] = Object.entries(groupedElements).map(
          ([moduleName, elements]) => {
            const filteredElements = mode
              ? elements.filter((el) => !el.mode || el.mode === mode)
              : elements;

            const firstElement = filteredElements[0];
            return {
              moduleName,
              moduleLabel: firstElement?.groupLabel || moduleName,
              icon: firstElement?.groupIcon || null,
              elements: filteredElements,
            };
          },
        );

        setModules(moduleGroups);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadElements();
  }, [mode]);

  const updateBinding = (elementId: string, scopes: string[], logic: 'AND' | 'OR') => {
    const existingIndex = value.findIndex((b) => b.elementId === elementId);

    if (existingIndex >= 0) {
      const newBindings = [...value];
      newBindings[existingIndex] = {
        ...newBindings[existingIndex],
        enabled: scopes.length > 0,
        visibilityScope:
          scopes.length > 0
            ? {
                relations: scopes,
                logic,
              }
            : null,
      };
      onChange(newBindings);
    } else {
      onChange([
        ...value,
        {
          elementId,
          enabled: scopes.length > 0,
          visibilityScope:
            scopes.length > 0
              ? {
                  relations: scopes,
                  logic,
                }
              : null,
        },
      ]);
    }
  };

  const countActiveActions = (module: ModuleGroup): string => {
    const actions = module.elements.filter((el) => el.elementType === 'action');
    const activeCount = actions.filter((action) => {
      const binding = value.find((b) => b.elementId === action.id);
      if (binding?.enabled) return true;
      const inherited = inheritedBindings.find((b) => b.elementId === action.id);
      return inherited?.enabled ?? false;
    }).length;
    return `${activeCount}/${actions.length}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-900">{error}</p>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">Aucun module disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          Cochez les scopes pour chaque action. Si "Tout" est coché, les autres scopes sont
          désactivés. Les permissions héritées sont affichées en grisé.
        </p>
      </div>

      {modules.map((module) => (
        <AccordionItem
          key={module.moduleName}
          title={module.moduleLabel}
          icon={module.icon}
          badge={countActiveActions(module)}
        >
          <ModuleAccessGrid
            module={module}
            bindings={value}
            inheritedBindings={inheritedBindings}
            onUpdateBinding={updateBinding}
          />
        </AccordionItem>
      ))}
    </div>
  );
};
