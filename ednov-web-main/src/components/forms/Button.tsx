import * as React from 'react';
import { Button as ShadcnButton } from '@/components/ui/button';
import {
  LucideIcon,
  Loader2,
  Eye,
  Edit,
  Trash2,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  Upload,
  Check,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ButtonPreset =
  | 'row-view'
  | 'row-edit'
  | 'row-delete'
  | 'row-validate'
  | 'row-cancel'
  | 'section-action'
  | 'download'
  | 'form-close'
  | 'pagination-prev'
  | 'pagination-next'
  | 'pagination-page'
  | 'form-save'
  | 'form-cancel'
  | 'create-entity'
  | 'import-csv'
  | 'modal-confirm'
  | 'modal-danger'
  | 'modal-cancel'
  | 'modal-edit'
  | 'postit-color'
  | 'postit-action'
  | 'postit-card-action'
  | 'toolbar-filter'
  | 'toolbar-create'
  | 'toolbar-export'
  | 'filter-configure'
  | 'toolbar-sort'
  | 'column-pagination-prev'
  | 'column-pagination-next';

interface PresetConfig {
  variant?: CustomButtonProps['variant'];
  color?: string;
  size?: CustomButtonProps['size'];
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  tooltipText?: string;
  className?: string;
}

const BUTTON_PRESETS: Record<ButtonPreset, PresetConfig> = {
  // Row/Card action buttons
  'row-view': {
    variant: 'outline',
    size: 'icon',
    icon: Eye,
    tooltipText: 'Voir les détails',
  },
  'row-edit': {
    variant: 'ghost',
    size: 'icon',
    icon: Edit,
    tooltipText: 'Modifier',
  },
  'row-delete': {
    variant: 'delete',
    size: 'icon',
    icon: Trash2,
    tooltipText: 'Supprimer',
  },
  'row-validate': {
    variant: 'outline',
    size: 'icon',
    icon: CheckCircle2,
    color: 'var(--color-3-nuance-1)',
    tooltipText: 'Valider',
  },
  'row-cancel': {
    variant: 'outline',
    size: 'icon',
    icon: X,
    color: 'rgb(var(--color-error))',
  },
  // Section action button (icon variable)
  'section-action': {
    variant: 'ghost',
    size: 'icon',
    className: 'section-action-button',
  },
  // Icon-only avec icône prédéfinie
  download: {
    variant: 'ghost',
    size: 'icon',
    icon: Download,
    className: 'section-action-button',
    tooltipText: 'Exporter sous format Excel',
  },
  'form-close': {
    variant: 'ghost',
    size: 'icon',
    icon: X,
    tooltipText: 'Fermer',
  },
  'pagination-prev': {
    variant: 'ghost',
    size: 'icon',
    icon: ChevronLeft,
    className: 'table-pagination-button',
    tooltipText: 'Page précédente',
  },
  'pagination-next': {
    variant: 'ghost',
    size: 'icon',
    icon: ChevronRight,
    className: 'table-pagination-button',
    tooltipText: 'Page suivante',
  },
  'pagination-page': {
    size: 'sm',
    className: 'table-pagination-button',
  },
  // Toolbar DataTable buttons
  'toolbar-filter': {
    variant: 'ghost',
    size: 'icon',
    icon: Filter,
    className: 'section-action-button',
    tooltipText: 'Filtrer',
  },
  'toolbar-create': {
    variant: 'ghost',
    size: 'icon',
    icon: Plus,
    className: 'section-action-button',
  },
  'toolbar-export': {
    variant: 'ghost',
    size: 'icon',
    icon: Download,
    className: 'section-action-button',
    tooltipText: 'Exporter en Excel',
  },
  'filter-configure': {
    variant: 'ghost',
    size: 'icon',
    icon: SlidersHorizontal,
    className: 'shrink-0 section-action-button',
    tooltipText: "Configurer l'affichage des filtres",
  },
  'toolbar-sort': {
    variant: 'ghost',
    size: 'icon',
    icon: ArrowUpDown,
    className: 'section-action-button',
  },
  'column-pagination-prev': {
    variant: 'ghost',
    size: 'icon',
    icon: ChevronLeft,
    className: 'section-action-button',
    tooltipText: 'Page précédente',
  },
  'column-pagination-next': {
    variant: 'ghost',
    size: 'icon',
    icon: ChevronRight,
    className: 'section-action-button',
    tooltipText: 'Page suivante',
  },
  // Boutons formulaires avec texte
  'form-save': {
    variant: 'primary',
    size: 'md',
    icon: Save,
    iconPosition: 'left',
  },
  'form-cancel': {
    variant: 'outline',
    size: 'md',
    icon: X,
    iconPosition: 'left',
  },
  'create-entity': {
    variant: 'primary',
    size: 'lg',
    icon: Plus,
    iconPosition: 'left',
    className: 'management-page-create-button',
  },
  'import-csv': {
    variant: 'secondary',
    size: 'lg',
    icon: Upload,
    iconPosition: 'left',
    className: 'management-page-create-button',
  },
  // Boutons modales
  'modal-confirm': {
    variant: 'primary',
    size: 'md',
    icon: Check,
  },
  'modal-danger': {
    variant: 'danger',
    size: 'md',
    icon: Trash2,
  },
  // Boutons PostIt
  'postit-color': {
    // Swatch circulaire de sélection de couleur
    // Le caller fournit la couleur de fond + l'état actif via className
    variant: 'custom',
    size: 'sm',
    iconOnly: true,
    className: 'w-7 h-7 rounded-full border-2 transition-all',
  },
  'postit-action': {
    // Bouton icône toggle (priorité, statut…)
    // Le caller fournit la couleur d'état actif via className
    variant: 'custom',
    size: 'icon',
    iconOnly: true,
    className: 'p-1 rounded-lg transition-all hover:scale-105 bg-black/5',
  },
  'postit-card-action': {
    // Bouton icône dans la carte post-it (bg transparent, couleur adaptive)
    // Le caller fournit la couleur via className
    variant: 'custom',
    size: 'icon',
    iconOnly: true,
    className:
      'p-1.5 rounded-md transition-all duration-200 bg-transparent hover:bg-transparent hover:scale-125 hover:drop-shadow-md active:scale-95',
  },
  'modal-cancel': {
    variant: 'cancel',
    size: 'md',
    icon: X,
  },
  'modal-edit': {
    variant: 'primary',
    size: 'md',
    icon: Edit,
  },
};

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'cancel'
    | 'danger'
    | 'ghost'
    | 'outline'
    | 'delete'
    | 'custom';
  /** Couleur dynamique pour variant ghost/outline (comme LabelBadge). Ex: "var(--color-3-nuance-1)" ou "#7c3aed" */
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  preset?: ButtonPreset;
  tooltipText?: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  showBadge?: boolean;
  active?: boolean;
}

// Helper pour générer les classes de variant (réduit la complexité cognitive du composant)
const getVariantClasses = (variant: CustomButtonProps['variant'], color?: string) => {
  const variantMap = {
    primary: cn(
      'bg-[var(--color-2-nuance-1)] text-white shadow-md',
      'hover:bg-[var(--color-2-nuance-2)] hover:shadow-lg active:bg-[var(--color-2-nuance-1)]/90',
      'transition-all duration-200',
    ),
    secondary: cn(
      'bg-[var(--color-1-nuance-1)] text-white',
      'hover:bg-[var(--color-1-nuance-2)] hover:shadow-md active:bg-[var(--color-1-nuance-1)]/90',
      'transition-all duration-200',
    ),
    cancel: cn(
      'bg-[color-mix(in_srgb,white_99%,#e6e5e3_1%)] text-zinc-700 border border-zinc-400/85',
      'hover:bg-[color-mix(in_srgb,white_96%,#e0dfdc_4%)] hover:border-zinc-500 hover:text-zinc-800',
      'dark:bg-zinc-950 dark:text-zinc-200 dark:border-zinc-600',
      'dark:hover:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:text-zinc-100',
      'transition-all duration-200',
    ),
    danger: cn(
      'bg-destructive text-destructive-foreground',
      'hover:bg-destructive/90 active:bg-destructive/80',
      'transition-colors duration-200',
    ),
    ghost: color
      ? cn(
          'bg-[color-mix(in_srgb,var(--btn-color)_15%,transparent)]',
          'text-[var(--btn-color)]',
          'border border-[color-mix(in_srgb,var(--btn-color)_30%,transparent)]',
          'hover:bg-[color-mix(in_srgb,var(--btn-color)_24%,transparent)]',
          'hover:border-[color-mix(in_srgb,var(--btn-color)_50%,transparent)]',
          'hover:text-[var(--btn-color)]',
          'transition-all duration-200',
        )
      : cn(
          'bg-[color-mix(in_srgb,var(--color-1-nuance-3)_8%,transparent)]',
          'text-[var(--color-1-nuance-1)]',
          'border border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]',
          'hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]',
          'hover:border-[color-mix(in_srgb,var(--color-2-nuance-1)_50%,transparent)]',
          'hover:text-[var(--color-2-nuance-1)]',
          'transition-all duration-200',
        ),
    delete: cn(
      'bg-[color-mix(in_srgb,rgb(var(--color-error))_10%,transparent)]',
      'text-[rgb(var(--color-error))]',
      'border border-[rgb(var(--color-error))]',
      'hover:bg-[color-mix(in_srgb,rgb(var(--color-error))_15%,transparent)]',
      'hover:border-[rgb(var(--color-error))]',
      'hover:text-[rgb(var(--color-error))]',
      'transition-all duration-200',
    ),
    outline: color
      ? cn(
          'border border-[var(--btn-color)]',
          'bg-background',
          'text-[var(--btn-color)]',
          'hover:bg-[var(--btn-color)]',
          'hover:text-background',
          'shadow-sm hover:shadow-md',
          'transition-all duration-200',
        )
      : cn(
          'border border-[var(--color-2-nuance-1)]',
          'bg-background',
          'text-[var(--color-2-nuance-1)]',
          'hover:bg-[var(--color-2-nuance-1)]',
          'hover:text-background',
          'shadow-sm hover:shadow-md',
          'disabled:!bg-background disabled:!border-[color-mix(in_srgb,var(--color-2-nuance-1)_40%,transparent)] disabled:!text-[color-mix(in_srgb,var(--color-2-nuance-1)_40%,transparent)] disabled:!opacity-100',
          'disabled:!cursor-not-allowed disabled:shadow-none disabled:pointer-events-auto',
          'transition-all duration-200',
        ),
    custom: '',
  };

  return variantMap[variant ?? 'primary'];
};

export const Button = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  (
    {
      preset,
      variant: variantProp,
      color: colorProp,
      size: sizeProp,
      icon: iconProp,
      iconPosition: iconPositionProp,
      iconOnly: iconOnlyProp,
      loading = false,
      fullWidth = false,
      children,
      className: classNameProp,
      disabled,
      tooltipText: tooltipTextProp,
      tooltipSide = 'top',
      showBadge = false,
      active,
      style: styleProp,
      ...props
    },
    ref,
  ) => {
    // Résolution du preset
    const presetConfig = preset ? BUTTON_PRESETS[preset] : {};

    // Merge preset avec props explicites (props explicites ont priorité)
    // Logique spéciale pour pagination-page : variant dépend de active
    const isPaginationPagePreset = preset === 'pagination-page' && active !== undefined;
    const paginationVariant = active ? 'primary' : 'ghost';
    const resolvedPresetVariant = isPaginationPagePreset ? paginationVariant : presetConfig.variant;

    const variant = variantProp ?? resolvedPresetVariant ?? 'primary';
    const color = colorProp ?? presetConfig.color;
    const size = sizeProp ?? presetConfig.size ?? 'md';
    const Icon = iconProp ?? presetConfig.icon;
    const iconPosition = iconPositionProp ?? presetConfig.iconPosition ?? 'left';
    const iconOnly = iconOnlyProp ?? presetConfig.iconOnly ?? false;
    const tooltipText = tooltipTextProp ?? presetConfig.tooltipText;
    const presetClassName = presetConfig.className ?? '';

    // Determine if this is an icon-only button
    const isIconButton = iconOnly || size === 'icon' || (Icon && !children);

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs rounded-lg',
      md: 'h-10 px-4 text-sm rounded-lg',
      lg: 'h-12 px-6 text-base rounded-xl',
      icon: 'h-8 px-3 text-xs rounded-lg',
    };

    const iconButtonSizeClasses = {
      sm: 'h-8 w-8 p-0 rounded-lg',
      md: 'h-9 w-9 p-0 rounded-lg',
      lg: 'h-10 w-10 p-0 rounded-xl',
      icon: 'h-8 w-8 p-0 rounded-lg',
    };

    const iconSizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      icon: 'h-4 w-4',
    };

    // Build final className
    const buttonClassName = cn(
      getVariantClasses(variant, color),
      isIconButton ? iconButtonSizeClasses[size] : sizeClasses[size],
      fullWidth && !isIconButton && 'w-full',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
      showBadge && 'relative',
      presetClassName,
      classNameProp,
    );

    const buttonStyle: React.CSSProperties = color
      ? ({ '--btn-color': color, ...styleProp } as React.CSSProperties)
      : (styleProp ?? {});

    const buttonContent = (
      <ShadcnButton
        ref={ref}
        className={buttonClassName}
        disabled={disabled || loading}
        style={buttonStyle}
        {...props}
      >
        {loading && (
          <Loader2
            className={cn(
              'animate-spin',
              iconSizeClasses[size],
              !isIconButton && children && 'mr-2',
            )}
          />
        )}
        {!loading && Icon && isIconButton && <Icon className={iconSizeClasses[size]} />}
        {!loading && Icon && !isIconButton && iconPosition === 'left' && (
          <Icon className={cn(iconSizeClasses[size], children && 'mr-2')} />
        )}
        {!isIconButton && children}
        {!loading && Icon && !isIconButton && iconPosition === 'right' && (
          <Icon className={cn(iconSizeClasses[size], children && 'ml-2')} />
        )}
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-2-nuance-1)]" />
        )}
      </ShadcnButton>
    );

    // Si tooltip intégré demandé
    if (tooltipText) {
      // Wrapper dans span si disabled pour que tooltip fonctionne sur bouton disabled
      const triggerContent = disabled ? (
        <span className="inline-flex">{buttonContent}</span>
      ) : (
        buttonContent
      );

      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{triggerContent}</TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonContent;
  },
);

Button.displayName = 'Button';
