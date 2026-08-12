import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { ModuleAccessCard } from './ModuleAccessCard';
import { getAllInterfaceElementsForBuilder } from '@/services/interface-elements.service';
import type { RoleBindingRules, RoleMode } from '@/types/role.types';
import type { InterfaceElement } from '@/types/interface-elements.types';

interface ModuleGroup {
  moduleName: string;
  moduleLabel: string;
  icon: string | null;
  interfaceName: string;
  elements: InterfaceElement[];
}

interface RolePermissionsBuilderProps {
  value: Record<string, RoleBindingRules>;
  onChange: (bindings: Record<string, RoleBindingRules>) => void;
  mode?: RoleMode | null;
  hierarchyLevel?: number;
  roleGroup?: string;
  disabled?: boolean;
}

export function RolePermissionsBuilder({
  value,
  onChange,
  mode,
  hierarchyLevel,
  roleGroup,
  disabled,
}: RolePermissionsBuilderProps) {
  const [modules, setModules] = useState<ModuleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadElements = async () => {
      try {
        setLoading(true);
        const groupedElements = await getAllInterfaceElementsForBuilder();

        const moduleGroups: ModuleGroup[] = Object.entries(groupedElements)
          .map(([moduleName, elements]) => {
            const filteredElements = mode
              ? elements.filter((el) => !el.mode || el.mode === mode)
              : elements;

            const firstElement = filteredElements[0];
            return {
              moduleName,
              moduleLabel: firstElement?.groupLabel || moduleName,
              icon: firstElement?.groupIcon || null,
              interfaceName: firstElement?.interfaceName || moduleName,
              elements: filteredElements,
            };
          })
          .filter((m) => m.elements.length > 0);

        setModules(moduleGroups);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadElements();
  }, [mode]);

  const getModuleBinding = (interfaceName: string): RoleBindingRules => {
    return (
      value[interfaceName] || {
        rules: [
          {
            id: 'rule-default',
            entityFilter: null,
            read: null,
            actions: [],
          },
        ],
      }
    );
  };

  const isModuleEnabled = (interfaceName: string): boolean => {
    const binding = value[interfaceName];
    return binding !== undefined && binding.rules.length > 0;
  };

  const toggleModuleEnabled = (interfaceName: string) => {
    if (disabled) return;

    const newBindings = { ...value };

    if (isModuleEnabled(interfaceName)) {
      delete newBindings[interfaceName];
    } else {
      newBindings[interfaceName] = {
        rules: [
          {
            id: 'rule-default',
            entityFilter: null,
            read: null,
            actions: [],
          },
        ],
      };
    }

    onChange(newBindings);
  };

  const updateModuleRules = (interfaceName: string, rules: RoleBindingRules['rules']) => {
    if (disabled) return;

    const newBindings = { ...value };
    newBindings[interfaceName] = { ...getModuleBinding(interfaceName), rules };
    onChange(newBindings);
  };

  const updateModuleTabs = (interfaceName: string, tabs: string[] | null | undefined) => {
    if (disabled) return;

    const newBindings = { ...value };
    newBindings[interfaceName] = { ...getModuleBinding(interfaceName), tabs };
    onChange(newBindings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Chargement des modules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-700">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>Erreur: {error}</span>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">Aucun module disponible pour ce mode.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Configuration des permissions par module</p>
          <p>
            Pour chaque module, activez l'accès et définissez une ou plusieurs règles. Chaque règle
            peut filtrer par type d'entité, définir un périmètre de lecture (quelles entités
            l'utilisateur voit), et autoriser des actions spécifiques (créer, modifier, supprimer,
            etc.).
          </p>
        </div>
      </div>

      {modules.map((module) => (
        <ModuleAccessCard
          key={module.interfaceName}
          moduleName={module.moduleName}
          moduleLabel={module.moduleLabel}
          moduleIcon={module.icon}
          interfaceName={module.interfaceName}
          elements={module.elements}
          rules={getModuleBinding(module.interfaceName).rules}
          tabs={getModuleBinding(module.interfaceName).tabs}
          enabled={isModuleEnabled(module.interfaceName)}
          onToggleEnabled={() => toggleModuleEnabled(module.interfaceName)}
          onRulesChange={(rules) => updateModuleRules(module.interfaceName, rules)}
          onTabsChange={(tabs) => updateModuleTabs(module.interfaceName, tabs)}
          hierarchyLevel={hierarchyLevel}
          roleGroup={roleGroup}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
