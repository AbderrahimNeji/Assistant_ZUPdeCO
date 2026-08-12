import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Checkbox } from '@/components/forms/Checkbox';
import { ReadScopeBuilder } from './ReadScopeBuilder';
import type { InterfaceElement } from '@/types/interface-elements.types';
import type { RuleReadScope } from '@/types/role.types';

interface ActionsChecklistProps {
  actions: InterfaceElement[];
  selectedActionIds: string[];
  onChange: (actionIds: string[]) => void;
  writeScopes?: Record<string, RuleReadScope | null>;
  onWriteScopesChange?: (writeScopes: Record<string, RuleReadScope | null>) => void;
  disabled?: boolean;
}

export function ActionsChecklist({
  actions,
  selectedActionIds,
  onChange,
  writeScopes = {},
  onWriteScopesChange,
  disabled,
}: ActionsChecklistProps) {
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  // Separate regular actions from role creation options
  const regularActions = actions.filter(
    (a) =>
      !a.config?.subtype ||
      (typeof a.config.subtype === 'string' && !a.config.subtype.includes('role')),
  );
  const roleCreationActions = actions.filter(
    (a) => a.config?.subtype === 'create-role' || a.config?.subtype === 'edit-role',
  );

  const toggleAction = (actionId: string) => {
    if (disabled) return;

    const newSelection = selectedActionIds.includes(actionId)
      ? selectedActionIds.filter((id) => id !== actionId)
      : [...selectedActionIds, actionId];

    onChange(newSelection);

    // Si on décoche, supprimer le write scope
    if (!newSelection.includes(actionId) && writeScopes[actionId] !== undefined) {
      const newWriteScopes = { ...writeScopes };
      delete newWriteScopes[actionId];
      onWriteScopesChange?.(newWriteScopes);
    }
  };

  const toggleExpanded = (actionId: string) => {
    const newExpanded = new Set(expandedActions);
    if (newExpanded.has(actionId)) {
      newExpanded.delete(actionId);
    } else {
      newExpanded.add(actionId);
    }
    setExpandedActions(newExpanded);
  };

  const handleWriteScopeChange = (actionId: string, scope: RuleReadScope | null) => {
    if (disabled || !onWriteScopesChange) return;
    onWriteScopesChange({ ...writeScopes, [actionId]: scope });
  };

  if (regularActions.length === 0 && roleCreationActions.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">Aucune action disponible pour ce module</div>
    );
  }

  const renderActionItem = (action: InterfaceElement) => {
    const isChecked = selectedActionIds.includes(action.elementId);
    const isExpanded = expandedActions.has(action.elementId);
    const hasWriteScope = onWriteScopesChange !== undefined;

    return (
      <div key={action.id} className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            label={action.elementLabel}
            checked={isChecked}
            onCheckedChange={() => toggleAction(action.elementId)}
            disabled={disabled}
            className="flex-1"
          />
          {isChecked && hasWriteScope && (
            <button
              type="button"
              onClick={() => toggleExpanded(action.elementId)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              disabled={disabled}
              title="Configurer le périmètre d'écriture (write scope) — peut différer du périmètre de lecture"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>
        {isChecked && isExpanded && hasWriteScope && (
          <div className="ml-6 pl-4 border-l-2 border-gray-200">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Périmètre d'écriture pour cette action
              </div>
              <ReadScopeBuilder
                value={writeScopes[action.elementId] ?? null}
                onChange={(scope) => handleWriteScopeChange(action.elementId, scope)}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {regularActions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-700">Actions standard</div>
            {onWriteScopesChange !== undefined && (
              <div
                className="group relative flex items-center"
                title="Le périmètre d'écriture (write scope) restreint les entités sur lesquelles une action peut être effectuée. Exemple : un rôle peut voir toutes les séances de l'établissement (read scope) mais ne modifier que celles qui lui sont assignées (write scope)."
              >
                <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
              </div>
            )}
          </div>
          <div className="space-y-1">{regularActions.map(renderActionItem)}</div>
        </div>
      )}

      {roleCreationActions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Peut créer / modifier ces types d'utilisateurs
          </div>
          <div className="bg-blue-50 rounded-lg p-3 mb-2">
            <div className="flex items-start gap-2 text-xs text-blue-900">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Ces options permettent à ce rôle de créer ou modifier des utilisateurs d'autres
                rôles. Par exemple, cocher "Coordinateur" permet de créer et gérer des
                coordinateurs.
              </p>
            </div>
          </div>
          <div className="space-y-1">{roleCreationActions.map(renderActionItem)}</div>
        </div>
      )}
    </div>
  );
}
