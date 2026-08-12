import * as React from 'react';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import type { AttendanceStatus } from '@/types/attendance.types';
import { ATTENDANCE_STATUS_LABELS } from '@/constants/attendance.constants';
import type { TutorSlotAvailabilityStatus } from '@/components/sessions/session-tutor-availability';

interface ParticipantChipProps {
  user: {
    firstName: string | null;
    lastName: string | null;
    displayName?: string | null;
    photoUrl?: string | null;
  };
  role: 'tutor' | 'student' | 'volunteer';
  gender?: 'male' | 'female' | null;
  levelId?: string | null;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
  attendanceStatus?: AttendanceStatus;
  absenceJustification?: string | null;
  /** Affiche le motif sous le chip (compte-rendu, fiches où le survol seul n’est pas suffisant) */
  showAbsenceMotifInline?: boolean;
  /** Label du rôle volunteer spécifique (ex. "Volunteer", "Professeur") — affiché comme mini-badge */
  volunteerRoleLabel?: string;
  /** Disponibilité sur le créneau sélectionné (tuteurs / bénévoles uniquement). */
  slotAvailability?: TutorSlotAvailabilityStatus;
  /** Détail affiché au survol en cas de conflit horaire. */
  slotConflictHint?: string;
}

const roleColors = {
  tutor: {
    bg: 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]',
    border: 'border-[var(--color-2-nuance-1)]',
    text: 'text-[var(--color-2-nuance-1)]',
    hover: 'hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)]',
  },
  student: {
    bg: 'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]',
    border: 'border-[var(--color-1-nuance-1)]',
    text: 'text-[var(--color-1-nuance-1)]',
    hover: 'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)]',
  },
  volunteer: {
    bg: 'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)]',
    border: 'border-[var(--color-3-nuance-1)]',
    text: 'text-[var(--color-3-nuance-1)]',
    hover: 'hover:bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)]',
  },
};

const sizeConfig = {
  sm: {
    chip: 'px-2.5 py-1 text-xs gap-1.5',
    avatar: 'sm' as const,
  },
  md: {
    chip: 'px-3 py-1.5 text-xs gap-2',
    avatar: 'sm' as const,
  },
};

export const ParticipantChip: React.FC<ParticipantChipProps> = ({
  user,
  role,
  gender,
  levelId,
  size = 'sm',
  showTooltip = false,
  className,
  attendanceStatus,
  absenceJustification,
  showAbsenceMotifInline = false,
  volunteerRoleLabel,
  slotAvailability,
  slotConflictHint,
}) => {
  const colors = roleColors[role];
  const config = sizeConfig[size];

  const getInitials = () => {
    const first = user.firstName?.charAt(0)?.toUpperCase() || '';
    const last = user.lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  const getDisplayName = () => {
    if (role === 'student') {
      return user.displayName || 'Inconnu';
    }
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'Inconnu';
  };

  const getAttendanceStatusConfig = () => {
    if (!attendanceStatus) return null;

    const configs = {
      present: {
        icon: CheckCircle,
        color: 'rgb(10, 134, 66)',
        bgColor: 'color-mix(in srgb, rgb(10, 134, 66) 15%, transparent)',
        label: ATTENDANCE_STATUS_LABELS.present,
      },
      absent: {
        icon: XCircle,
        color: 'rgb(var(--color-error))',
        bgColor: 'color-mix(in srgb, rgb(var(--color-error)) 15%, transparent)',
        label: ATTENDANCE_STATUS_LABELS.absent,
      },
      excused: {
        icon: AlertCircle,
        color: 'rgb(var(--color-warning))',
        bgColor: 'color-mix(in srgb, rgb(var(--color-warning)) 15%, transparent)',
        label: ATTENDANCE_STATUS_LABELS.excused,
      },
      pending: {
        icon: Clock,
        color: 'var(--muted-foreground)',
        bgColor: 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)',
        label: ATTENDANCE_STATUS_LABELS.pending,
      },
    };

    return configs[attendanceStatus];
  };

  const getSlotAvailabilityConfig = () => {
    if (!slotAvailability || slotAvailability === 'unknown' || slotAvailability === 'available') {
      return null;
    }
    if (slotAvailability === 'checking') {
      return {
        icon: Clock,
        color: 'var(--muted-foreground)',
        bgColor: 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)',
        label: 'Vérification de la disponibilité…',
        chipBorderClass: '',
      };
    }
    return {
      icon: AlertCircle,
      color: 'rgb(var(--color-warning))',
      bgColor: 'color-mix(in srgb, rgb(var(--color-warning)) 15%, transparent)',
      label: slotConflictHint ?? 'Indisponible à cet horaire',
      chipBorderClass: '!border-[rgb(var(--color-warning))] bg-[rgb(var(--color-warning)_/_0.08)]',
    };
  };

  const getTooltipContent = () => {
    const fullName =
      role === 'student'
        ? user.displayName || 'Inconnu'
        : `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'Inconnu';
    const roleLabels: Record<typeof role, string> = {
      tutor: 'Tuteur',
      student: 'Élève',
      volunteer: volunteerRoleLabel || 'Bénévole',
    };

    const statusConfig = getAttendanceStatusConfig();
    const slotConfig = getSlotAvailabilityConfig();

    return (
      <div className="space-y-1">
        <p className="font-semibold">{fullName}</p>
        <p className="text-xs opacity-90">{roleLabels[role]}</p>
        {levelId && <p className="text-xs opacity-75">Niveau renseigné</p>}
        {slotConfig && (
          <p className="text-xs opacity-90 mt-2" style={{ color: slotConfig.color }}>
            {slotConfig.label}
          </p>
        )}
        {statusConfig && (
          <p className="text-xs opacity-90 mt-2" style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </p>
        )}
        {absenceJustification && (
          <p className="text-xs opacity-75 mt-1 italic">Motif: {absenceJustification}</p>
        )}
      </div>
    );
  };

  const statusConfig = getAttendanceStatusConfig();
  const slotConfig = getSlotAvailabilityConfig();
  const StatusIcon = statusConfig?.icon;
  const SlotIcon = slotConfig?.icon;
  const showSlotTooltip = !!slotConfig && slotAvailability === 'conflict';

  const chipContent = (
    <div className="inline-flex items-center gap-1">
      <div
        className={cn(
          'inline-flex items-center rounded-full border font-medium transition-all cursor-default select-none',
          'shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
          colors.bg,
          colors.border,
          colors.text,
          colors.hover,
          config.chip,
          slotConfig?.chipBorderClass,
          className,
        )}
      >
        <Avatar src={user.photoUrl} fallback={getInitials()} gender={gender} size={config.avatar} />
        <span className="whitespace-nowrap tracking-tight">{getDisplayName()}</span>
        {role === 'volunteer' && volunteerRoleLabel && (
          <span
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
            style={{
              background: 'color-mix(in srgb, var(--color-3-nuance-1) 20%, transparent)',
              color: 'var(--color-3-nuance-1)',
              border: '1px solid color-mix(in srgb, var(--color-3-nuance-1) 40%, transparent)',
            }}
          >
            {volunteerRoleLabel}
          </span>
        )}
      </div>
      {slotConfig && SlotIcon && !statusConfig && (
        <div
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border"
          style={{
            backgroundColor: slotConfig.bgColor,
            borderColor: slotConfig.color,
          }}
        >
          <SlotIcon className="w-3.5 h-3.5" style={{ color: slotConfig.color }} />
        </div>
      )}
      {statusConfig && StatusIcon && (
        <div
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border"
          style={{
            backgroundColor: statusConfig.bgColor,
            borderColor: statusConfig.color,
          }}
        >
          <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
        </div>
      )}
    </div>
  );

  const inlineMotif =
    showAbsenceMotifInline &&
    absenceJustification &&
    (attendanceStatus === 'absent' || attendanceStatus === 'excused') ? (
      <p className="text-xs text-muted-foreground leading-snug w-full">
        Motif&nbsp;: {absenceJustification}
      </p>
    ) : null;

  const mainBlock =
    showAbsenceMotifInline && inlineMotif ? (
      <div className="inline-flex flex-col items-start gap-1 min-w-0 max-w-full">
        {chipContent}
        {inlineMotif}
      </div>
    ) : (
      chipContent
    );

  if (!showTooltip && !showSlotTooltip) {
    return mainBlock;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{mainBlock}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="z-[1200] overflow-hidden rounded-xl border-2 border-[var(--color-1-nuance-3)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-lg animate-fade-in-down"
            sideOffset={5}
          >
            {getTooltipContent()}
            <TooltipPrimitive.Arrow className="fill-[var(--card)]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
