import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Button } from '@/components/forms/Button';
import { ParticipantChip } from './ParticipantChip';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user.types';
import { getVolunteerRoleLabel } from '@/types/user.types';
import type { TutorSlotAvailabilityStatus } from '@/components/sessions/session-tutor-availability';

interface RemovableParticipantChipProps {
  user: UserWithProfile;
  role: 'tutor' | 'student' | 'volunteer';
  onRemove: () => void;
  size?: 'sm' | 'md';
  className?: string;
  draggable?: boolean;
  slotAvailability?: TutorSlotAvailabilityStatus;
  slotConflictHint?: string;
}

export const RemovableParticipantChip: React.FC<RemovableParticipantChipProps> = ({
  user,
  role,
  onRemove,
  size = 'sm',
  className,
  draggable = false,
  slotAvailability,
  slotConflictHint,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `participant-${user.id}`,
    data: { type: role, user },
    disabled: !draggable,
  });

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={cn('relative inline-flex', isDragging && 'opacity-50', className)}
    >
      <ParticipantChip
        user={user}
        role={role}
        size={size}
        showTooltip={slotAvailability === 'conflict'}
        slotAvailability={role !== 'student' ? slotAvailability : undefined}
        slotConflictHint={role !== 'student' ? slotConflictHint : undefined}
        volunteerRoleLabel={
          role === 'volunteer' ? (getVolunteerRoleLabel(user) ?? undefined) : undefined
        }
        className={cn('!pr-14', draggable && '!cursor-grab active:!cursor-grabbing')}
      />
      <Button
        variant="ghost"
        size="icon"
        icon={X}
        iconOnly
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 right-1.5 w-4 h-4 rounded-full border',
          '!bg-[rgb(var(--color-error))] !text-white !border-[rgb(var(--color-error))]',
          'transition-all duration-200',
          'hover:scale-110 hover:brightness-90',
          'focus:ring-2 focus:ring-[rgb(var(--color-error)_/_0.5)]',
          'shadow-md',
        )}
        aria-label={`Retirer ${user.firstName} ${user.lastName}`}
      />
    </div>
  );
};
