import * as React from 'react';
import { createPortal } from 'react-dom';
import { DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DropAnimation } from '@dnd-kit/core';
import { UserCard } from './UserCard';
import type { UserWithProfile } from '@/types/user.types';

interface CustomDragOverlayProps {
  activeUser: UserWithProfile | null;
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

export const CustomDragOverlay: React.FC<CustomDragOverlayProps> = ({ activeUser }) => {
  if (!activeUser) return null;

  const userType = activeUser.userRoles?.[0]?.role?.code === 'tutor' ? 'tutor' : 'student';

  const overlay = (
    <DragOverlay dropAnimation={dropAnimationConfig} zIndex={9999}>
      <div style={{ width: '260px', pointerEvents: 'none' }}>
        <UserCard
          user={activeUser}
          type={userType}
          className="!opacity-100 rotate-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] !border-2 !border-[var(--color-2-nuance-1)]"
        />
      </div>
    </DragOverlay>
  );

  return createPortal(overlay, document.body);
};
