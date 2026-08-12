import * as React from 'react';
import { GraduationCap, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user.types';

interface UserCardProps {
  user: UserWithProfile;
  type: 'tutor' | 'student';
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ user, type, className }) => {
  const Icon = type === 'tutor' ? GraduationCap : User;
  const colorVar = type === 'tutor' ? '--color-2-nuance-1' : '--color-3-nuance-1';

  return (
    <div className={cn('matching-user-card', className)}>
      <div className="flex items-center gap-2 flex-1">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0"
          style={{
            background: `color-mix(in srgb, var(${colorVar}) 15%, transparent)`,
            borderColor: `var(${colorVar})`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: `var(${colorVar})` }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {type === 'student'
              ? user.displayName || user.email || 'Utilisateur'
              : `${user.firstName} ${user.lastName}`.trim() ||
                user.displayName ||
                user.email ||
                'Utilisateur'}
          </p>
        </div>
      </div>
    </div>
  );
};
