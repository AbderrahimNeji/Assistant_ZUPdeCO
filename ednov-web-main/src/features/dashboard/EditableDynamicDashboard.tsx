import * as React from 'react';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { AdvancedDynamicLayout } from '@/components/layout/AdvancedDynamicLayout';
import { StatCard } from '@/components/cards/StatCard';
import { InterfaceElement } from '@/types/interface-elements.types';
import {
  Users,
  Calendar,
  BookOpen,
  TrendingUp,
  DollarSign,
  Award,
  Edit,
  Save,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { updateInterfaceConfig } from '@/services/preferences.service';
import { useQueryClient } from '@tanstack/react-query';
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

export const EditableDynamicDashboard: React.FC = () => {
  const { elements, allElements, isLoading, error, refetch } = useInterfaceElements('dashboard');
  const canConfigure = !!allElements.find((el) => el.elementId === 'action-configure-dashboard');
  const [editMode, setEditMode] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const queryClient = useQueryClient();

  const handleReorder = async (reorderedElements: InterfaceElement[]) => {
    setIsSaving(true);
    try {
      // Save to API
      await updateInterfaceConfig('dashboard', {
        elements: reorderedElements.map((el, index) => ({
          id: el.elementId,
          visible: el.userVisible ?? el.visible ?? true,
          order: index,
        })),
      });

      // Note: No need to invalidate cache - the store will react to preferences changes

      // Layout saved successfully
    } catch (err) {
      // Failed to save layout
      if (err instanceof Error) {
        // Handle error silently or show toast
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    setEditMode(false);
    await refetch();
  };

  const renderElement = React.useCallback(
    (element: InterfaceElement) => {
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
                canConfigure && !editMode
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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Table component for {element.elementId}
                </p>
                <div className="h-32 bg-muted/50 rounded flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Table data would appear here</p>
                </div>
              </div>
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
    },
    [editMode],
  );

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
            {editMode ? (
              <span className="text-primary font-medium">
                ✏️ Edit Mode - Drag elements to reorder
              </span>
            ) : (
              <>
                Showing {elements.length} element{elements.length === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                variant="secondary"
                icon={X}
                onClick={() => {
                  setEditMode(false);
                  refetch();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button variant="primary" icon={Save} onClick={handleSaveAndExit} loading={isSaving}>
                Save Layout
              </Button>
            </>
          ) : (
            <Button variant="secondary" icon={Edit} onClick={() => setEditMode(true)}>
              Edit Layout
            </Button>
          )}
        </div>
      </div>

      {editMode && (
        <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
          <p className="text-sm text-primary font-medium">
            💡 Drag the grip icon (⋮⋮) on any element to reorder it. Changes are saved
            automatically.
          </p>
        </div>
      )}

      <AdvancedDynamicLayout
        elements={elements}
        renderElement={renderElement}
        onReorder={handleReorder}
        editMode={editMode}
      />
    </div>
  );
};
