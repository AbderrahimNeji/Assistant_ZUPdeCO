import * as React from 'react';
import { PostIt } from '@/types/post-it.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox';
import { Button } from '@/components/forms/Button';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/forms/SegmentedControl';
import { X, Check, Share2, ChevronLeft, ChevronRight, Loader2, BookOpen, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUsersForSharing } from '@/services/users.service';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useRoleLabel } from '@/hooks/useRoleConfig';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postIt: PostIt;
  onShareUsers: (userIds: string[], permission: 'read' | 'write') => Promise<void>;
  onShareRole: (roleCode: string, permission: 'read' | 'write') => Promise<void>;
  onRemoveShare: (userId: string) => Promise<void>;
}

type RoleFilter = 'all' | 'VOLUNTEER' | 'COORDINATOR' | 'MANAGER';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  postIt,
  onShareUsers,
  onShareRole: _onShareRole,
  onRemoveShare,
}) => {
  const [userSearch, setUserSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const [permission, setPermission] = React.useState<'read' | 'write'>('read');
  const [isSharing, setIsSharing] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('all');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const getRoleLabelHook = useRoleLabel;

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(userSearch);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch]);

  // Build role codes for API
  const roleCodes = React.useMemo(() => {
    if (roleFilter === 'all') return ['VOLUNTEER', 'COORDINATOR', 'MANAGER'];
    return [roleFilter];
  }, [roleFilter]);

  // Fetch users with pagination
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users-for-sharing', debouncedSearch, page, pageSize, roleCodes],
    queryFn: () =>
      getUsersForSharing({
        search: debouncedSearch || undefined,
        page,
        pageSize,
        roleCodes,
        excludeIds: [], // Could exclude already shared users if needed
      }),
    enabled: isOpen,
    staleTime: 30000, // Cache for 30 seconds
  });

  const users = usersResponse?.data || [];
  const total = usersResponse?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const selectedUserObjects = React.useMemo(() => {
    return users.filter((user) => selectedUsers.includes(user.id));
  }, [users, selectedUsers]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUsers([]);
      setUserSearch('');
      setDebouncedSearch('');
      setPage(1);
      setRoleFilter('all');
      setPermission('read');
    }
  }, [isOpen]);

  const handleShareUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }

    setIsSharing(true);
    try {
      await onShareUsers(selectedUsers, permission);
      toast.success(`Post-it partagé avec ${selectedUsers.length} utilisateur(s)`);
      setSelectedUsers([]);
      setUserSearch('');
      setDebouncedSearch('');
      setPermission('read');
      onClose();
    } catch (error) {
      toast.error('Erreur lors du partage du post-it');
      if (import.meta.env.DEV) {
        console.error('Error sharing post-it:', error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      await onRemoveShare(userId);
      toast.success('Accès retiré avec succès');
    } catch (error) {
      toast.error("Erreur lors du retrait de l'accès");
      if (import.meta.env.DEV) {
        console.error('Error removing share:', error);
      }
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((id) => id !== userId));
  };

  const handleSelectAll = () => {
    const currentPageUserIds = users.map((u) => u.id);
    const allSelected = currentPageUserIds.every((id) => selectedUsers.includes(id));

    if (allSelected) {
      // Deselect all from current page
      setSelectedUsers((prev) => prev.filter((id) => !currentPageUserIds.includes(id)));
    } else {
      // Select all from current page
      setSelectedUsers((prev) => [...new Set([...prev, ...currentPageUserIds])]);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?';
  };

  const getRoleLabel = (role: RoleFilter) => {
    if (role === 'all') return 'Tous';
    return getRoleLabelHook(role, true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--color-1-nuance-1)]">
            <Share2 className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
            Partager "{postIt.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Role Filters */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'VOLUNTEER', 'COORDINATOR', 'MANAGER'] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200',
                  roleFilter === role
                    ? 'bg-[var(--color-2-nuance-1)] text-white'
                    : 'bg-[color-mix(in_srgb,var(--color-1-nuance-3)_10%,transparent)] text-[var(--color-1-nuance-1)] hover:bg-[color-mix(in_srgb,var(--color-1-nuance-3)_20%,transparent)]',
                )}
              >
                {getRoleLabel(role)}
              </button>
            ))}
          </div>

          {/* Selected Users Chips */}
          {selectedUserObjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUserObjects.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                    'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]',
                    'text-[var(--color-2-nuance-1)]',
                    'border border-[var(--color-2-nuance-1)]/30',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                      'bg-[var(--color-2-nuance-1)] text-white',
                    )}
                  >
                    {getInitials(user.firstName, user.lastName)}
                  </span>
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                  <button
                    onClick={() => removeSelectedUser(user.id)}
                    className="p-0.5 hover:bg-[var(--color-2-nuance-1)]/20 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Input */}
          <SearchInput
            placeholder="Rechercher par nom ou email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            variant="filled"
            size="md"
          />

          {/* Users List with Loading State */}
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)] p-3">
            <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1">
              {(() => {
                if (isLoading) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-2-nuance-1)]" />
                      <span className="ml-2 text-sm text-[var(--color-1-nuance-2)]">
                        Chargement...
                      </span>
                    </div>
                  );
                }

                if (users.length === 0) {
                  return (
                    <p className="text-center py-4 text-sm text-[var(--color-1-nuance-2)]/60">
                      Aucun utilisateur trouvé
                    </p>
                  );
                }

                return users.map((user) => {
                  const isSelected = selectedUsers.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer',
                        isSelected
                          ? 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_8%,transparent)] border border-[var(--color-2-nuance-1)]/30'
                          : 'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-3)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-1-nuance-3)_20%,transparent)]',
                      )}
                    >
                      {/* Checkbox */}
                      <ShadcnCheckbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        className="pointer-events-none"
                      />

                      {/* Avatar */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                          isSelected
                            ? 'bg-[var(--color-2-nuance-1)] text-white'
                            : 'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)] text-[var(--color-3-nuance-1)]',
                        )}
                      >
                        {getInitials(user.firstName, user.lastName)}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            isSelected
                              ? 'text-[var(--color-2-nuance-1)]'
                              : 'text-[var(--color-1-nuance-1)]',
                          )}
                        >
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-[var(--color-1-nuance-2)]/70 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]">
              <div className="text-sm text-[var(--color-1-nuance-2)]">
                Page {page} sur {totalPages} ({total} utilisateur{total > 1 ? 's' : ''})
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  icon={ChevronLeft}
                  title="Page précédente"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  icon={ChevronRight}
                  title="Page suivante"
                />
              </div>
            </div>
          )}

          {/* Select All Button */}
          {!isLoading && users.length > 0 && (
            <Button
              variant="custom"
              onClick={handleSelectAll}
              icon={users.every((u) => selectedUsers.includes(u.id)) ? X : Check}
              className={cn(
                'w-full py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-[color-mix(in_srgb,var(--color-1-nuance-3)_10%,transparent)]',
                'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-3)_20%,transparent)]',
                'text-[var(--color-1-nuance-1)]',
              )}
            >
              {users.every((u) => selectedUsers.includes(u.id))
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </Button>
          )}

          {/* Permission Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-1-nuance-1)]">Permission :</span>
            <SegmentedControl<'read' | 'write'>
              value={permission}
              onChange={setPermission}
              options={[
                { value: 'read', label: 'Lecture', icon: BookOpen },
                { value: 'write', label: 'Écriture', icon: Edit },
              ]}
              size="md"
            />
          </div>

          {/* Current Shares */}
          {postIt.shares && postIt.shares.length > 0 && (
            <div className="pt-3 border-t border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]">
              <h4 className="text-xs font-semibold text-[var(--color-1-nuance-2)] uppercase tracking-wider mb-2">
                Déjà partagé avec
              </h4>
              <div className="space-y-1.5">
                {postIt.shares.map((share) => (
                  <div
                    key={share.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg',
                      'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_8%,transparent)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--color-3-nuance-1)] text-white flex items-center justify-center text-[10px] font-bold">
                        {share.userName
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || '?'}
                      </div>
                      <span className="text-sm text-[var(--color-1-nuance-1)]">
                        {share.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)]',
                          'text-[var(--color-3-nuance-1)]',
                        )}
                      >
                        {share.permission === 'write' ? 'Écriture' : 'Lecture'}
                      </span>
                      <button
                        onClick={() => handleRemoveShare(share.userId)}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        title="Retirer l'accès"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              onClick={handleShareUsers}
              disabled={selectedUsers.length === 0 || isSharing}
              loading={isSharing}
              className="flex-1"
              icon={Share2}
            >
              {isSharing ? 'Partage en cours...' : `Partager (${selectedUsers.length})`}
            </Button>
            <Button variant="cancel" onClick={onClose} disabled={isSharing}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
