import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { EntityFilterSelector } from './EntityFilterSelector';
import { ReadScopeBuilder } from './ReadScopeBuilder';
import { ActionsChecklist } from './ActionsChecklist';
import type { RoleBindingRule, RuleEntityFilter, RuleReadScope } from '@/types/role.types';
import type { InterfaceElement } from '@/types/interface-elements.types';

interface RuleCardProps {
  rule: RoleBindingRule;
  interfaceName: string;
  availableActions: InterfaceElement[];
  onUpdate: (updatedRule: RoleBindingRule) => void;
  onDelete: () => void;
  disabled?: boolean;
  isDefault?: boolean;
}

export function RuleCard({
  rule,
  interfaceName,
  availableActions,
  onUpdate,
  onDelete,
  disabled,
  isDefault,
}: RuleCardProps) {
  const handleEntityFilterChange = (filter: RuleEntityFilter | null) => {
    onUpdate({ ...rule, entityFilter: filter });
  };

  const handleReadScopeChange = (scope: RuleReadScope | null) => {
    onUpdate({ ...rule, read: scope });
  };

  const handleActionsChange = (actionIds: string[]) => {
    onUpdate({ ...rule, actions: actionIds });
  };

  const handleWriteScopesChange = (writeScopes: Record<string, RuleReadScope | null>) => {
    onUpdate({ ...rule, writeScopes });
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
          <span className="text-sm font-medium text-gray-900">
            {isDefault ? 'Règle par défaut (tous les types)' : 'Règle spécifique'}
          </span>
        </div>
        {!isDefault && !disabled && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Supprimer cette règle"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {!isDefault && (
          <EntityFilterSelector
            interfaceName={interfaceName}
            value={rule.entityFilter}
            onChange={handleEntityFilterChange}
            disabled={disabled}
          />
        )}

        <ReadScopeBuilder value={rule.read} onChange={handleReadScopeChange} disabled={disabled} />

        <ActionsChecklist
          actions={availableActions}
          selectedActionIds={rule.actions}
          onChange={handleActionsChange}
          writeScopes={rule.writeScopes}
          onWriteScopesChange={handleWriteScopesChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
