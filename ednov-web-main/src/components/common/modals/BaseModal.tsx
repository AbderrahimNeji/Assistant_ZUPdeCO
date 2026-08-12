import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/forms/Button';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface HeaderConfig {
  icon?: LucideIcon;
  iconSize?: 'sm' | 'md' | 'lg';
  iconColor?: string;
  iconBgColor?: string;
  badge?: React.ReactNode;
  title?: string;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  titleColor?: string;
  titleWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  subtitle?: string;
  subtitleColor?: string;
}

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  className?: string;
  hideCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;

  // Header configuration
  header?: HeaderConfig;

  // Content
  children: React.ReactNode;
  description?: string;

  // Footer
  footer?: React.ReactNode;

  /** For calendar event modal: 'session' | 'postit' | 'holiday' - applied as data-event-type */
  dataEventType?: string;

  /** Use compact padding for details views to maximize content space */
  compactPadding?: boolean;

  /** Hide the colored content wrapper (for modals that display content via description only) */
  hideContentWrapper?: boolean;

  /** Classes optionnelles sur le séparateur sous l’en-tête / au-dessus du pied. */
  headerSeparatorClassName?: string;
  footerSeparatorClassName?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-6xl',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const iconContainerSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const titleSizeClasses = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

const titleWeightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onClose,
  size = 'md',
  className,
  hideCloseButton = false,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  header,
  children,
  description,
  footer,
  dataEventType,
  compactPadding = false,
  hideContentWrapper = false,
  headerSeparatorClassName,
  footerSeparatorClassName,
}) => {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose();
    }
  };

  const Icon = header?.icon;
  const iconSize = header?.iconSize || 'md';
  const titleSize = header?.titleSize || 'lg';
  const titleWeight = header?.titleWeight || 'bold';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(sizeClasses[size], className)}
        {...(dataEventType ? { 'data-event-type': dataEventType } : {})}
        onPointerDownOutside={(e) => {
          if (!closeOnOutsideClick) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!closeOnEscape) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        {header && (header.icon || header.badge || header.title || header.subtitle) && (
          <DialogHeader>
            <div className="flex items-center gap-3">
              {/* Icon with background and subtle glow */}
              {Icon && (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-xl shrink-0 transition-all',
                    iconContainerSizeClasses[iconSize],
                  )}
                  style={{
                    backgroundColor:
                      header.iconBgColor ||
                      'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                  }}
                >
                  <Icon
                    className={iconSizeClasses[iconSize]}
                    style={{ color: header.iconColor || 'var(--color-2-nuance-1)' }}
                  />
                </div>
              )}

              {/* Title */}
              {header.title && (
                <DialogTitle
                  className={cn(
                    titleSizeClasses[titleSize],
                    titleWeightClasses[titleWeight],
                    'flex-1',
                  )}
                  style={{ color: header.titleColor || 'var(--foreground)' }}
                >
                  {header.title}
                </DialogTitle>
              )}

              {/* Badge */}
              {header.badge && <div className="shrink-0">{header.badge}</div>}
            </div>

            {/* Subtitle */}
            {header.subtitle && (
              <p
                className="text-sm mt-1"
                style={{ color: header.subtitleColor || 'var(--muted-foreground)' }}
              >
                {header.subtitle}
              </p>
            )}

            {/* Description */}
            {description && (
              <DialogDescription className="mt-3 whitespace-pre-line">
                {description}
              </DialogDescription>
            )}

            {/* Elegant separator */}
            {(header.icon || header.title) && (
              <div
                className={cn(
                  'h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-2-nuance-1)_20%,transparent)] to-transparent mt-4',
                  headerSeparatorClassName,
                )}
              />
            )}
          </DialogHeader>
        )}

        {/* DialogTitle caché pour accessibilité si pas de header.title */}
        {!header?.title && (
          <VisuallyHidden>
            <DialogTitle>Modal</DialogTitle>
          </VisuallyHidden>
        )}

        {/* Content avec bordure colorée */}
        {!hideContentWrapper ? (
          <div
            className={cn('rounded-2xl border-2 transition-all', !header && 'mt-6')}
            style={{
              borderColor: 'var(--color-1-nuance-3)',
              background: 'color-mix(in srgb, var(--color-1-nuance-3) 3%, transparent)',
            }}
          >
            <div className={compactPadding ? 'p-2' : 'p-4'}>{children}</div>
          </div>
        ) : (
          children
        )}

        {/* Footer with improved spacing */}
        {footer && (
          <>
            <div
              className={cn(
                'h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)] to-transparent mb-4',
                footerSeparatorClassName,
              )}
            />
            <DialogFooter>{footer}</DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
