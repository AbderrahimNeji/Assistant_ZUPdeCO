import * as React from 'react';
import { User, Users, CalendarPlus } from 'lucide-react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { cn } from '@/lib/utils';
import type { PlanificationType } from '@/types/session.types';

interface SelectPlanificationTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: PlanificationType) => void;
}

interface PlanificationOption {
  id: PlanificationType;
  title: string;
  description: string;
  icon: typeof User;
  accentVar: string;
}

const OPTIONS: PlanificationOption[] = [
  {
    id: 'individual',
    title: 'Planification individuelle',
    description: 'Séance dédiée à un tutorat individuel.',
    icon: User,
    accentVar: 'var(--color-1-nuance-1)',
  },
  {
    id: 'collective',
    title: 'Planification collective',
    description: 'Aide aux devoirs, atelier, tutorat ou classe entière pour un groupe.',
    icon: Users,
    accentVar: 'var(--color-2-nuance-1)',
  },
];

export const SelectPlanificationTypeModal: React.FC<SelectPlanificationTypeModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="lg"
      header={{
        icon: CalendarPlus,
        iconSize: 'md',
        title: 'Planification des séances',
        subtitle: 'Choisissez le type de planification pour démarrer.',
        titleSize: 'lg',
        titleWeight: 'semibold',
      }}
      hideContentWrapper
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(
                'group relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all',
                'hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2',
              )}
              style={
                {
                  borderColor: 'var(--color-1-nuance-3)',
                  background: 'color-mix(in srgb, var(--color-1-nuance-3) 3%, transparent)',
                  ['--hover-border' as string]: option.accentVar,
                } as React.CSSProperties
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = option.accentVar;
                e.currentTarget.style.background = `color-mix(in srgb, ${option.accentVar} 8%, transparent)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-1-nuance-3)';
                e.currentTarget.style.background =
                  'color-mix(in srgb, var(--color-1-nuance-3) 3%, transparent)';
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all"
                style={{
                  borderColor: option.accentVar,
                  background: `color-mix(in srgb, ${option.accentVar} 10%, transparent)`,
                }}
              >
                <Icon className="h-6 w-6" style={{ color: option.accentVar }} />
              </div>
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: 'var(--color-1-nuance-1)' }}
                >
                  {option.title}
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </BaseModal>
  );
};
