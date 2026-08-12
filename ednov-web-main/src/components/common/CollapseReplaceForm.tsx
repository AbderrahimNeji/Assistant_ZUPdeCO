import * as React from 'react';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';
import { X, Save, Plus, Edit, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapseReplaceFormProps {
  // Header
  formType: 'create' | 'edit';
  title: string;
  subtitle?: string;

  // Actions
  onClose: () => void;
  onSubmit: () => void;

  // Boutons
  submitLabel: string;
  submitIcon?: LucideIcon;
  isSubmitting: boolean;
  isValid: boolean;

  // Loading
  isLoading?: boolean;

  /** Si false, pas de pied de page (actions inline dans le contenu). */
  showFooter?: boolean;

  // Content
  children: React.ReactNode;
  className?: string;
}

export const CollapseReplaceForm: React.FC<CollapseReplaceFormProps> = ({
  formType,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel,
  submitIcon = Save,
  isSubmitting,
  isValid,
  isLoading = false,
  showFooter = true,
  children,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn('collapse-replace-form', className)}>
        <div className="collapse-replace-form-content">
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        </div>
      </div>
    );
  }

  const Icon = formType === 'create' ? Plus : Edit;

  return (
    <div className={cn('collapse-replace-form', className)}>
      <div className="collapse-replace-form-header">
        <div className="collapse-replace-form-header-content">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border-2"
              style={{
                background: 'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
                borderColor: 'var(--color-2-nuance-1)',
              }}
            >
              <Icon className="w-6 h-6" style={{ color: 'var(--color-2-nuance-1)' }} />
            </div>
            <div>
              <h2
                className="collapse-replace-form-title"
                style={{ color: 'var(--color-1-nuance-1)' }}
              >
                {title}
              </h2>
              {subtitle && <p className="collapse-replace-form-subtitle">{subtitle}</p>}
            </div>
          </div>
        </div>
        <Button preset="form-close" onClick={onClose} disabled={isSubmitting} />
      </div>

      <div className="collapse-replace-form-content">
        <div className="space-y-6">{children}</div>
      </div>

      {showFooter ? (
        <div className="collapse-replace-form-footer">
          <div className="flex gap-3 ml-auto">
            <Button preset="form-cancel" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              preset="form-save"
              icon={submitIcon}
              onClick={onSubmit}
              loading={isSubmitting}
              disabled={!isValid || isSubmitting}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
