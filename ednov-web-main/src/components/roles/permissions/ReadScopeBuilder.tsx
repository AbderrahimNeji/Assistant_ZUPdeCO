import React from 'react';
import { X, Info } from 'lucide-react';
import { getAvailableRelations, SCOPE_LABELS, getScopePreview } from '../scope-labels';
import type { RuleReadScope } from '@/types/role.types';

interface ReadScopeBuilderProps {
  value: RuleReadScope | null | undefined;
  onChange: (scope: RuleReadScope | null) => void;
  disabled?: boolean;
}

export function ReadScopeBuilder({ value, onChange, disabled }: ReadScopeBuilderProps) {
  const availableRelations = getAvailableRelations();
  const selectedRelations = value?.relations || [];
  const logic = value?.logic || 'OR';

  const toggleRelation = (relationCode: string) => {
    if (disabled) return;

    const newRelations = selectedRelations.includes(relationCode)
      ? selectedRelations.filter((r) => r !== relationCode)
      : [...selectedRelations, relationCode];

    if (newRelations.length === 0) {
      onChange(null);
    } else {
      onChange({ relations: newRelations, logic });
    }
  };

  const toggleLogic = () => {
    if (disabled || selectedRelations.length < 2) return;
    onChange({ relations: selectedRelations, logic: logic === 'AND' ? 'OR' : 'AND' });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">Périmètre de lecture</div>

      <div className="flex flex-wrap gap-2">
        {availableRelations.map((relationCode) => {
          const label = SCOPE_LABELS[relationCode];
          const isSelected = selectedRelations.includes(relationCode);

          return (
            <button
              key={relationCode}
              type="button"
              onClick={() => toggleRelation(relationCode)}
              disabled={disabled}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors
                ${
                  isSelected
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={label?.description}
            >
              {label?.label || relationCode}
              {isSelected && <X className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {selectedRelations.length >= 2 && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <span className="text-sm text-gray-600">Logique:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleLogic}
              disabled={disabled}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${
                  logic === 'OR'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              OU
            </button>
            <button
              type="button"
              onClick={toggleLogic}
              disabled={disabled}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${
                  logic === 'AND'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              ET
            </button>
          </div>
        </div>
      )}

      {selectedRelations.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{getScopePreview(selectedRelations, logic)}</span>
        </div>
      )}

      {selectedRelations.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          Aucune restriction (tous les éléments visibles)
        </div>
      )}
    </div>
  );
}
