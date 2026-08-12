import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuthStore();
  const { logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [cachedUserName, setCachedUserName] = React.useState<string>('');
  const [cachedRole, setCachedRole] = React.useState<string>('');

  // Calculate user initials (e.g., "Leo Messi" -> "LM")
  const initials = React.useMemo(() => {
    if (!user?.firstName || !user?.lastName) {
      return user?.displayName?.substring(0, 2).toUpperCase() || '??';
    }
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }, [user]);

  // Get primary role name
  const primaryRole = React.useMemo(() => {
    if (roles && roles.length > 0) {
      return roles[0].label || 'Utilisateur';
    }
    return 'Utilisateur';
  }, [roles]);

  // Update cached values when user data is available
  React.useEffect(() => {
    if (user) {
      const displayName =
        user.displayName ||
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Utilisateur');
      setCachedUserName(displayName);
    }
  }, [user]);

  React.useEffect(() => {
    if (primaryRole) {
      setCachedRole(primaryRole);
    }
  }, [primaryRole]);

  // Check if user should see the modal (volunteer, coordinator, manager, admin)
  const shouldShowProfileModal = React.useMemo(() => {
    if (!roles || roles.length === 0) return false;
    const roleCodes = roles.map((r) => r.code.toLowerCase());
    return roleCodes.some((code) =>
      ['volunteer', 'coordinator', 'manager', 'admin'].includes(code),
    );
  }, [roles]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const handleProfileClick = () => {
    if (shouldShowProfileModal) {
      setIsProfileModalOpen(true);
    } else {
      navigate('/profile');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="user-menu-button" aria-label="Menu utilisateur">
            {initials}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 user-menu-content !origin-top-right">
          {/* User Info */}
          <div className="px-3 py-2 border-b">
            <p className="font-medium text-sm">{cachedUserName || 'Utilisateur'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cachedRole || 'Utilisateur'}</p>
          </div>

          {/* Actions */}
          <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Mon Profil
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive user-menu-item-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Edit Modal */}
      {shouldShowProfileModal && (
        <EditProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      )}
    </>
  );
};
