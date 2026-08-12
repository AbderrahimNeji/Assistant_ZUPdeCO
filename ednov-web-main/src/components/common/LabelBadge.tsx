import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'ghost'
  | 'outlined'
  | 'solid'
  | 'active'
  | 'disabled'
  | 'on-hold'
  | 'male'
  | 'female';

interface LabelBadgeProps {
  label: string;
  icon?: LucideIcon | React.ReactNode;
  variant: BadgeVariant;
  color?: string; // requis sauf pour active/disabled/on-hold
  size?: 'sm' | 'md';
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  icon: Icon,
  variant,
  color,
  size = 'sm',
  className,
}) => {
  const paddingClass = size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5';

  const baseClasses = cn(
    'inline-flex items-center justify-center gap-1',
    'rounded-md text-xs font-medium',
    'min-w-[135px]',
    'transition-all',
    'border',
    paddingClass,
  );

  const renderIcon = () => {
    if (!Icon) return null;

    if (React.isValidElement(Icon)) {
      return Icon;
    }

    const IconComponent = Icon as LucideIcon;
    return React.createElement(IconComponent, {
      className: 'w-3 h-3',
    });
  };

  // Semantic variants with predefined colors
  const semanticColors: Record<'active' | 'disabled' | 'on-hold' | 'male' | 'female', string> = {
    active: 'rgb(var(--status-success))',
    disabled: 'rgb(var(--status-neutral))',
    'on-hold': 'rgb(var(--status-pending))',
    male: 'rgb(var(--gender-male))',
    female: 'rgb(var(--gender-female))',
  };

  const effectiveColor =
    variant === 'active' ||
    variant === 'disabled' ||
    variant === 'on-hold' ||
    variant === 'male' ||
    variant === 'female'
      ? semanticColors[variant]
      : color;

  if (!effectiveColor) {
    console.warn('LabelBadge: color is required for non-semantic variants');
    return null;
  }

  let style: React.CSSProperties = {
    borderColor: effectiveColor,
  };

  if (variant === 'ghost') {
    style = {
      ...style,
      backgroundColor: `color-mix(in srgb, ${effectiveColor} 15%, transparent)`,
      color: effectiveColor,
    };
  } else if (
    variant === 'outlined' ||
    variant === 'active' ||
    variant === 'disabled' ||
    variant === 'on-hold' ||
    variant === 'male' ||
    variant === 'female'
  ) {
    style = {
      ...style,
      backgroundColor: 'hsl(var(--card))',
      color: effectiveColor,
    };
  } else if (variant === 'solid') {
    style = {
      ...style,
      backgroundColor: effectiveColor,
      color: 'white',
    };
  }

  return (
    <div className={cn(baseClasses, className)} style={style}>
      {renderIcon()}
      <span className="text-center">{label}</span>
    </div>
  );
};
