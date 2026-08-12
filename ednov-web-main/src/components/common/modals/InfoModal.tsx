import * as React from 'react';
import { BaseModal } from './BaseModal';
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';

interface InfoSection {
  id: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  title?: string;
  content: React.ReactNode;
  className?: string;
}

interface InfoBadge {
  id: string;
  icon?: LucideIcon;
  label: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

interface InfoAction {
  id: string;
  label: string;
  onClick: () => void;
  preset?: 'modal-cancel' | 'modal-edit' | 'modal-confirm' | 'modal-danger';
  variant?: 'primary' | 'secondary' | 'cancel' | 'danger' | 'ghost' | 'custom';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

interface InfoModalProps {
  open: boolean;
  onClose: () => void;

  // Header
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  badge?: React.ReactNode;
  title: string;
  titleColor?: string;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;

  // Badges (displayed below header)
  badges?: InfoBadge[];

  // Content sections
  sections?: InfoSection[];

  // Custom content (if sections not used)
  children?: React.ReactNode;

  // Actions
  actions?: InfoAction[];

  // Modal config
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  /** For calendar event modal: applied as data-event-type on dialog */
  dataEventType?: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  open,
  onClose,
  icon,
  iconColor,
  iconBgColor,
  iconSize = 'md',
  badge,
  title,
  titleColor,
  titleSize = 'xl',
  subtitle,
  badges,
  sections,
  children,
  actions,
  size = 'lg',
  className,
  dataEventType,
}) => {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size={size}
      className={className}
      dataEventType={dataEventType}
      header={{
        icon,
        iconColor,
        iconBgColor,
        iconSize,
        badge,
        title,
        titleColor,
        titleSize,
        titleWeight: 'bold',
        subtitle,
      }}
      footer={
        actions && actions.length > 0 ? (
          <div className="flex gap-2 justify-end">
            {actions.map((action) =>
              action.variant === 'custom' && (action.className || action.style) ? (
                <Button
                  key={action.id}
                  variant="custom"
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                    'hover:opacity-90 active:scale-95',
                    action.disabled && 'opacity-50 cursor-not-allowed',
                    action.className,
                  )}
                  style={action.className ? undefined : action.style}
                >
                  {action.label}
                </Button>
              ) : (
                <Button
                  key={action.id}
                  preset={action.preset}
                  variant={action.preset ? undefined : action.variant || 'primary'}
                  onClick={action.onClick}
                  icon={action.icon}
                  loading={action.loading}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              ),
            )}
          </div>
        ) : undefined
      }
    >
      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          {badges.map((badgeItem) => {
            const BadgeIcon = badgeItem.icon;
            return (
              <div
                key={badgeItem.id}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                  badgeItem.borderColor && 'border',
                )}
                style={{
                  backgroundColor:
                    badgeItem.bgColor ||
                    'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
                  color: badgeItem.textColor || 'var(--color-2-nuance-1)',
                  borderColor: badgeItem.borderColor,
                }}
              >
                {BadgeIcon && (
                  <BadgeIcon
                    className="w-4 h-4"
                    style={{ color: badgeItem.textColor || 'var(--color-2-nuance-1)' }}
                  />
                )}
                <span>{badgeItem.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sections */}
      {sections && sections.length > 0 && (
        <div className="space-y-5">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div
                key={section.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-[var(--color-1-nuance-3)]/30',
                  section.className,
                )}
              >
                {SectionIcon && (
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                    style={{
                      backgroundColor:
                        section.iconBgColor ||
                        'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                    }}
                  >
                    <SectionIcon
                      className="w-5 h-5"
                      style={{ color: section.iconColor || 'var(--color-2-nuance-1)' }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {section.title && (
                    <p className="font-semibold text-foreground mb-1">{section.title}</p>
                  )}
                  <div className="text-sm text-muted-foreground">{section.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom content */}
      {children && !sections && <div>{children}</div>}
    </BaseModal>
  );
};
