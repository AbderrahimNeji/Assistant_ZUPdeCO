import * as React from 'react';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { DynamicLayout } from '@/components/layout/DynamicLayout';
import { StatCard } from '@/components/cards/StatCard';
import { InterfaceElement } from '@/types/interface-elements.types';
import {
  Users,
  Calendar,
  BookOpen,
  TrendingUp,
  DollarSign,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';

// Map of element IDs to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'card-students': Users,
  'card-sessions': Calendar,
  'card-courses': BookOpen,
  'card-revenue': DollarSign,
  'card-growth': TrendingUp,
  'card-achievements': Award,
};

export const DynamicDashboard: React.FC = () => {
  const { elements, allElements, isLoading, error } = useInterfaceElements('dashboard');
  const canConfigure = !!allElements.find((el) => el.elementId === 'action-configure-dashboard');

  const renderElement = React.useCallback((element: InterfaceElement) => {
    switch (element.elementType) {
      case 'stat_card':
        return (
          <StatCard
            title={element.elementLabel}
            value={(element.config.value as string | number) || 0}
            icon={iconMap[element.elementId] || Users}
            iconColor={(element.config.iconColor as string) || 'text-primary'}
            iconBgColor={(element.config.iconBgColor as string) || 'bg-primary/10'}
            description={element.config.description as string}
            trend={element.config.trend as { value: number; isPositive: boolean } | undefined}
            onClick={
              canConfigure
                ? () => {
                    // Navigate to element (to be implemented)
                  }
                : undefined
            }
          />
        );

      case 'table':
        return (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">{element.elementLabel}</h3>
            <p className="text-sm text-muted-foreground">Table component for {element.elementId}</p>
            {!canConfigure && (
              <p className="text-xs text-muted-foreground mt-2">(Read-only view)</p>
            )}
          </div>
        );

      case 'chart':
        return (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">{element.elementLabel}</h3>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded">
              <p className="text-sm text-muted-foreground">Chart: {element.elementId}</p>
            </div>
          </div>
        );

      case 'widget':
        return (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">{element.elementLabel}</h3>
            <p className="text-sm text-muted-foreground">Widget: {element.elementId}</p>
          </div>
        );

      default:
        return (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">{element.elementLabel}</h3>
            <p className="text-sm text-muted-foreground">Custom element: {element.elementType}</p>
          </div>
        );
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner variant="default" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Error loading dashboard elements</p>
        <Button onClick={() => globalThis.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No dashboard elements available for your role</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-1-nuance-1)]">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Showing {elements.length} element{elements.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <DynamicLayout elements={elements} renderElement={renderElement} />
    </div>
  );
};
