import * as React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  /** Couleur du titre (par défaut = même que l'icône) */
  titleColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    differenceValue?: number;
  };
  description?: string;
  /** Définition du KPI affichée dans une infobulle au survol de l'icône */
  tooltip?: string;
  comparisonLabel?: string;
  isFilter?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

const StatCardContent: React.FC<{
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor?: string;
  titleColor?: string;
  trend?: { value: number; isPositive: boolean; differenceValue?: number };
  description?: string;
  tooltip?: string;
  comparisonLabel?: string;
}> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  titleColor,
  trend,
  description,
  tooltip,
  comparisonLabel,
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className={cn('stat-card-title', titleColor)}>{title}</p>
        {tooltip && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="stat-card-tooltip-trigger"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" variant="dark" className="stat-card-tooltip-content">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
      {trend && (
        <span
          className={cn(
            'stat-card-trend',
            trend.isPositive ? 'stat-card-trend-positive' : 'stat-card-trend-negative',
          )}
        >
          {trend.isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {trend.value}%
          {trend.differenceValue !== undefined && (
            <span className="ml-1">
              ({trend.isPositive ? '+' : ''}
              {trend.differenceValue})
            </span>
          )}
          {comparisonLabel && <span className="ml-1 text-xs opacity-80">{comparisonLabel}</span>}
        </span>
      )}
      {description && <p className="stat-card-description">{description}</p>}
    </div>
    <div className={cn('stat-card-icon-container', iconBgColor)}>
      <Icon className={cn('h-6 w-6', iconColor)} />
    </div>
  </div>
);

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor = 'text-[var(--color-2-nuance-1)]',
  iconBgColor,
  titleColor,
  trend,
  description,
  tooltip,
  comparisonLabel,
  isFilter = false,
  isActive = false,
  onClick,
  className,
}) => {
  const cardClassName = cn(
    'stat-card animate-fade-in-up',
    onClick && 'stat-card-clickable',
    isFilter && isActive && 'stat-card-active',
    className,
  );

  if (onClick) {
    return (
      <Button variant="custom" className={cardClassName} onClick={onClick}>
        <StatCardContent
          title={title}
          value={value}
          icon={icon}
          iconColor={iconColor}
          iconBgColor={iconBgColor}
          titleColor={titleColor}
          trend={trend}
          description={description}
          tooltip={tooltip}
          comparisonLabel={comparisonLabel}
        />
      </Button>
    );
  }

  return (
    <div className={cardClassName}>
      <StatCardContent
        title={title}
        value={value}
        icon={icon}
        iconColor={iconColor}
        iconBgColor={iconBgColor}
        titleColor={titleColor}
        trend={trend}
        description={description}
        tooltip={tooltip}
        comparisonLabel={comparisonLabel}
      />
    </div>
  );
};

StatCard.displayName = 'StatCard';
