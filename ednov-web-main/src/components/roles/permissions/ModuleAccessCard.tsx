import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { Checkbox } from '@/components/forms/Checkbox';
import { RuleCard } from './RuleCard';
import { NaturalLanguagePreview } from './NaturalLanguagePreview';
import type { RoleBindingRule } from '@/types/role.types';
import type { InterfaceElement } from '@/types/interface-elements.types';

interface ModuleAccessCardProps {
  moduleName: string;
  moduleLabel: string;
  moduleIcon: string | null;
  interfaceName: string;
  elements: InterfaceElement[];
  rules: RoleBindingRule[];
  enabled: boolean;
  onToggleEnabled: () => void;
  onRulesChange: (rules: RoleBindingRule[]) => void;
  tabs?: string[] | null;
  onTabsChange?: (tabs: string[] | null) => void;
  hierarchyLevel?: number;
  roleGroup?: string;
  disabled?: boolean;
}

export function ModuleAccessCard({
  moduleName,
  moduleLabel,
  moduleIcon,
  interfaceName,
  elements,
  rules,
  enabled,
  onToggleEnabled,
  onRulesChange,
  tabs,
  onTabsChange,
  hierarchyLevel,
  roleGroup,
  disabled,
}: ModuleAccessCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const availableActions = elements.filter((el) => el.elementType === 'action');
  const availableTabs = elements.filter((el) => el.elementType === 'tab');

  const handleTabToggle = (tabElementId: string) => {
    if (!onTabsChange || disabled) return;

    // Si tabs est undefined/null, tous les tabs sont sélectionnés par défaut
    const currentTabs = tabs ?? availableTabs.map((t) => t.elementId);

    if (currentTabs.includes(tabElementId)) {
      // Décocher: retirer ce tab
      const newTabs = currentTabs.filter((id) => id !== tabElementId);
      // Si tous les tabs sont cochés après retrait d'un, on peut garder l'array
      onTabsChange(newTabs.length === 0 ? [] : newTabs);
    } else {
      // Cocher: ajouter ce tab
      const newTabs = [...currentTabs, tabElementId];
      // Si tous les tabs sont maintenant cochés, on peut mettre undefined (tous inclus)
      onTabsChange(newTabs.length === availableTabs.length ? undefined : newTabs);
    }
  };

  const isTabSelected = (tabElementId: string): boolean => {
    if (tabs === undefined || tabs === null) {
      // undefined/null = tous sélectionnés
      return true;
    }
    return tabs.includes(tabElementId);
  };

  const defaultRule = rules.find((r) => !r.entityFilter);
  const specificRules = rules.filter((r) => r.entityFilter);

  const handleAddRule = () => {
    const newRule: RoleBindingRule = {
      id: `rule-${Date.now()}`,
      entityFilter: null,
      read: null,
      actions: [],
    };
    onRulesChange([...rules, newRule]);
  };

  const handleUpdateRule = (ruleId: string, updatedRule: RoleBindingRule) => {
    onRulesChange(rules.map((r) => (r.id === ruleId ? updatedRule : r)));
  };

  const handleDeleteRule = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId));
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {moduleIcon && <DynamicIcon name={moduleIcon} className="w-5 h-5 text-gray-700" />}

          <span className="text-base font-semibold text-gray-900">{moduleLabel}</span>

          <span className="text-xs text-gray-500">
            ({rules.length} règle{rules.length > 1 ? 's' : ''})
          </span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-700">Activer</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggleEnabled}
            disabled={disabled}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-gray-50 border-t border-gray-100">
          {!enabled ? (
            <p className="text-sm text-gray-600 rounded-lg bg-amber-50 text-amber-900 px-3 py-3 shadow-sm ring-1 ring-amber-200/80">
              Activez le module avec la case <strong>Activer</strong> (à droite) pour définir le
              périmètre de lecture et les actions. Sinon, aucune permission n’est enregistrée pour
              ce module.
            </p>
          ) : (
            <>
              <NaturalLanguagePreview rules={rules} moduleLabel={moduleLabel} />

              {availableTabs.length > 0 && onTabsChange && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Onglets visibles</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {availableTabs.map((tab) => (
                      <Checkbox
                        key={tab.elementId}
                        checked={isTabSelected(tab.elementId)}
                        onCheckedChange={() => handleTabToggle(tab.elementId)}
                        disabled={disabled}
                        label={tab.elementLabel}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sélectionnez les onglets que ce rôle peut voir dans ce module. Si tous sont
                    cochés, tous les onglets sont accessibles.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {defaultRule && (
                  <RuleCard
                    key={defaultRule.id}
                    rule={defaultRule}
                    interfaceName={interfaceName}
                    availableActions={availableActions}
                    onUpdate={(updated) => handleUpdateRule(defaultRule.id, updated)}
                    onDelete={() => handleDeleteRule(defaultRule.id)}
                    disabled={disabled}
                    isDefault
                  />
                )}

                {specificRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    interfaceName={interfaceName}
                    availableActions={availableActions}
                    onUpdate={(updated) => handleUpdateRule(rule.id, updated)}
                    onDelete={() => handleDeleteRule(rule.id)}
                    disabled={disabled}
                    isDefault={false}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddRule}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Ajouter une règle spécifique
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
