import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getModuleEntityFields } from '../module-entity-fields';
import type { RuleEntityFilter } from '@/types/role.types';

interface EntityFilterSelectorProps {
  interfaceName: string;
  value: RuleEntityFilter | null | undefined;
  onChange: (filter: RuleEntityFilter | null) => void;
  disabled?: boolean;
}

export function EntityFilterSelector({
  interfaceName,
  value,
  onChange,
  disabled,
}: EntityFilterSelectorProps) {
  const availableFields = getModuleEntityFields(interfaceName);
  const [selectedField, setSelectedField] = useState(value?.field || '');

  if (availableFields.length === 0) {
    return null;
  }

  const currentFieldConfig = availableFields.find((f) => f.field === selectedField);
  const selectedValues = value?.values || [];

  const handleFieldChange = (field: string) => {
    setSelectedField(field);
    if (!field) {
      onChange(null);
    } else {
      onChange({
        field,
        operator: 'in',
        values: [],
      });
    }
  };

  const toggleValue = (val: string) => {
    if (disabled || !selectedField) return;

    const newValues = selectedValues.includes(val)
      ? selectedValues.filter((v) => v !== val)
      : [...selectedValues, val];

    onChange({
      field: selectedField,
      operator: 'in',
      values: newValues,
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Filtre par type (optionnel)
        </label>
        <select
          value={selectedField}
          onChange={(e) => handleFieldChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Tous les types (règle par défaut) --</option>
          {availableFields.map((field) => (
            <option key={field.field} value={field.field}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      {selectedField && currentFieldConfig && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Valeurs autorisées</label>
          <div className="flex flex-wrap gap-2">
            {currentFieldConfig.options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  disabled={disabled}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-colors
                    ${
                      isSelected
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {option.label}
                  {isSelected && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
