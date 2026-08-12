import * as React from 'react';
import { InterfaceElement } from '@/types/interface-elements.types';
import { calculateOptimalLayout, getResponsiveColumnSpan } from '@/utils/layout-calculator';
import { cn } from '@/lib/utils';

interface DynamicLayoutProps {
  elements: InterfaceElement[];
  renderElement: (element: InterfaceElement) => React.ReactNode;
  className?: string;
}

export const DynamicLayout: React.FC<DynamicLayoutProps> = ({
  elements,
  renderElement,
  className,
}) => {
  const layout = React.useMemo(() => calculateOptimalLayout(elements), [elements]);

  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No elements to display
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        `grid-cols-${layout.responsive.sm}`,
        `md:grid-cols-${layout.responsive.md}`,
        `lg:grid-cols-${layout.responsive.lg}`,
        `xl:grid-cols-${layout.responsive.xl}`,
        className,
      )}
    >
      {elements.map((element) => {
        const columnSpan = getResponsiveColumnSpan(element.width ?? 'auto', layout);

        return (
          <div
            key={element.id}
            className={cn(columnSpan)}
            data-element-id={element.elementId}
            data-element-type={element.elementType}
          >
            {renderElement(element)}
          </div>
        );
      })}
    </div>
  );
};
