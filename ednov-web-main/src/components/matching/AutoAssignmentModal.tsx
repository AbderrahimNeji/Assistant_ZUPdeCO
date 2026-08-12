import * as React from 'react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import { Heart, History, Scale, Zap, X } from 'lucide-react';

interface AutoAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

interface PriorityCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  priority: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

const PriorityCard: React.FC<PriorityCardProps> = ({
  icon: Icon,
  title,
  description,
  priority,
  bgColor,
  borderColor,
  textColor,
  iconColor,
}) => {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md"
      style={{
        background: bgColor,
        borderColor: borderColor,
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-lg shrink-0"
        style={{
          background: `color-mix(in srgb, ${iconColor} 20%, transparent)`,
          border: `2px solid ${iconColor}`,
        }}
      >
        <Icon className="w-6 h-6" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: iconColor,
              color: 'white',
            }}
          >
            Priorité {priority}
          </span>
          <h4 className="font-bold text-base" style={{ color: textColor }}>
            {title}
          </h4>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: textColor }}>
          {description}
        </p>
      </div>
    </div>
  );
};

export const AutoAssignmentModal: React.FC<AutoAssignmentModalProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="lg"
      header={{
        icon: Zap,
        iconColor: 'var(--color-2-nuance-1)',
        iconBgColor: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
        title: 'Affectation Automatique',
        titleColor: 'var(--color-1-nuance-1)',
        titleSize: 'lg',
        titleWeight: 'bold',
        subtitle: "Le système appliquera les priorités suivantes dans l'ordre",
      }}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="cancel"
            size="md"
            icon={X}
            iconPosition="left"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Zap}
            iconPosition="left"
            loading={isLoading}
            onClick={onConfirm}
          >
            Lancer l'affectation
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <PriorityCard
          icon={Heart}
          title="Binôme Cœur"
          description="Élèves et tuteurs non matchés ayant 5 séances terminées ensemble. Ces binômes ont fait leurs preuves et seront priorisés."
          priority={1}
          bgColor="color-mix(in srgb, rgb(220, 38, 38) 10%, transparent)"
          borderColor="rgb(220, 38, 38)"
          textColor="rgb(185, 28, 28)"
          iconColor="rgb(220, 38, 38)"
        />

        <PriorityCard
          icon={History}
          title="Matching Historique"
          description="Élèves et tuteurs ayant entre 1 et 4 séances terminées ensemble. L'historique de collaboration est pris en compte."
          priority={2}
          bgColor="color-mix(in srgb, var(--color-1-nuance-1) 10%, transparent)"
          borderColor="var(--color-1-nuance-1)"
          textColor="var(--color-1-nuance-1)"
          iconColor="var(--color-1-nuance-1)"
        />

        <PriorityCard
          icon={Scale}
          title="Matching Équilibré"
          description="Répartition équilibrée des élèves sur les tuteurs disponibles pour optimiser la charge de travail."
          priority={3}
          bgColor="color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)"
          borderColor="var(--color-2-nuance-1)"
          textColor="var(--color-2-nuance-1)"
          iconColor="var(--color-2-nuance-1)"
        />

        <div
          className="mt-2 p-3 rounded-lg border"
          style={{
            background: 'color-mix(in srgb, var(--color-3-nuance-1) 8%, transparent)',
            borderColor: 'var(--color-3-nuance-1)',
          }}
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Note:</strong> L'algorithme appliquera ces priorités
            automatiquement pour créer les meilleurs matchings possibles. Les affectations manuelles
            existantes seront préservées.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
