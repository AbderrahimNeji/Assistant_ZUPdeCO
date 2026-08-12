import React from 'react';
import { Eye } from 'lucide-react';
import { getScopePreview } from '../scope-labels';
import type { RoleBindingRule } from '@/types/role.types';

interface NaturalLanguagePreviewProps {
  rules: RoleBindingRule[];
  moduleLabel: string;
}

export function NaturalLanguagePreview({ rules, moduleLabel }: NaturalLanguagePreviewProps) {
  if (rules.length === 0) {
    return <div className="text-sm text-gray-500 italic">Aucune règle définie pour ce module</div>;
  }

  const defaultRule = rules.find((r) => !r.entityFilter);
  const specificRules = rules.filter((r) => r.entityFilter);

  const hasReadAccess = defaultRule?.read && defaultRule.read.relations.length > 0;

  return (
    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
        <Eye className="w-4 h-4" />
        <span>Aperçu des permissions</span>
      </div>

      <div className="text-sm text-blue-800 space-y-1">
        {hasReadAccess && defaultRule.read ? (
          <p>
            <strong>Lecture:</strong> Cet utilisateur pourra voir les {moduleLabel.toLowerCase()}{' '}
            dont{' '}
            <strong>{getScopePreview(defaultRule.read.relations, defaultRule.read.logic)}</strong>.
          </p>
        ) : (
          <p>
            <strong>Lecture:</strong> Aucune restriction de lecture (tous les éléments visibles).
          </p>
        )}

        {defaultRule && defaultRule.actions.length > 0 && (
          <p>
            <strong>Actions générales:</strong>{' '}
            {defaultRule.actions.length === 1
              ? '1 action autorisée'
              : `${defaultRule.actions.length} actions autorisées`}
            .
          </p>
        )}

        {specificRules.length > 0 && (
          <p>
            <strong>Règles spécifiques:</strong> {specificRules.length} règle(s) supplémentaire(s)
            pour certains types.
          </p>
        )}
      </div>
    </div>
  );
}
