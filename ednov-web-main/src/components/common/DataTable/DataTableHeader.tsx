import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';
import type { ActionButton } from '@/types/data-table.types';

interface DataTableHeaderProps {
  title: string;
  actions?: ActionButton[];
  className?: string;
}

export const DataTableHeader: React.FC<DataTableHeaderProps> = ({ title, actions, className }) => {
  if (!title && (!actions || actions.length === 0)) return null;

  return (
    <div className={cn('section-header', className)}>
      {title && <h2 className="section-title">{title}</h2>}
      {actions && actions.length > 0 && (
        <div className="section-actions">
          {actions.map((action) => (
            <Button
              key={action.id}
              preset="section-action"
              icon={action.icon}
              onClick={action.onClick}
              tooltipText={action.tooltip}
              showBadge={action.badge}
            />
          ))}
        </div>
      )}
    </div>
  );
};
