import * as React from 'react';
import { Button } from '@/components/forms/Button';
import type { EmptyStateConfig } from '@/types/data-table.types';

interface DataTableEmptyProps {
  config: EmptyStateConfig;
  colSpan?: number;
}

export const DataTableEmpty: React.FC<DataTableEmptyProps> = ({ config, colSpan = 5 }) => {
  const Icon = config.icon;

  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="table-empty">
          <Icon className="table-empty-icon" />
          <p className="table-empty-text">{config.title}</p>
          {config.description && (
            <p className="text-sm text-muted-foreground mt-2">{config.description}</p>
          )}
          {config.action && (
            <Button variant="primary" size="sm" onClick={config.action.onClick} className="mt-4">
              {config.action.label}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};
