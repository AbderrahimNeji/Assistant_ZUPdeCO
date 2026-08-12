import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle } from 'lucide-react';
import { SearchInput } from '@/components/forms/SearchInput';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { POST_IT_STATUS_CONFIG } from '@/components/post-its/post-it-configs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { TrackingUser, TrackingOccurrence, PostItStatus } from '@/types/post-it.types';
import { toast } from '@/lib/toast';

interface TrackingUserListProps {
  users: TrackingUser[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  statusFilter: PostItStatus | 'all';
  searchQuery: string;
  onSearch: (query: string) => void;
  onStatusFilter: (status: PostItStatus | 'all') => void;
  onPageChange: (page: number) => void;
  onForceComplete: (userId: string) => void;
  selectedOccurrence: TrackingOccurrence | null;
  loadingUserId?: string | null;
}

export function TrackingUserList({
  users,
  total,
  page,
  pageSize,
  isLoading,
  statusFilter,
  searchQuery,
  onSearch,
  onStatusFilter,
  onPageChange,
  onForceComplete,
  selectedOccurrence,
  loadingUserId,
}: TrackingUserListProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const stats = useMemo(() => {
    if (!selectedOccurrence) return { done: 0, overdue: 0, pending: 0 };
    return {
      done: selectedOccurrence.stats.done,
      overdue: selectedOccurrence.stats.overdue,
      pending: selectedOccurrence.stats.pending,
    };
  }, [selectedOccurrence]);

  const getStatusBadge = (status: PostItStatus) => {
    const cfg = POST_IT_STATUS_CONFIG[status];
    return (
      <LabelBadge
        label={cfg.label}
        icon={cfg.icon}
        variant={cfg.badgeVariant}
        color={cfg.badgeColor}
        size="sm"
      />
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '—';
    const d = new Date(date);
    if (d.getFullYear() < 2000) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleExportExcel = () => {
    try {
      const headers = ['Nom', 'Prénom', 'Statut', 'Échéance', 'Complété le'];
      const rows = users.map((user) => [
        user.lastName,
        user.firstName,
        POST_IT_STATUS_CONFIG[user.status]?.label ?? user.status,
        formatDate(user.deadline),
        user.status === 'done' ? formatDate(user.updatedAt) : '—',
      ]);
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Suivi');
      XLSX.writeFile(workbook, `suivi_assignations_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Export Excel réussi !');
    } catch {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Rechercher un utilisateur..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onSearch={(query) => setLocalSearch(query)}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => onStatusFilter(val as PostItStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="done">Terminé</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="depasse">En retard</SelectItem>
            </SelectContent>
          </Select>

          <Button
            preset="toolbar-export"
            tooltipText="Exporter en Excel"
            onClick={handleExportExcel}
          />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: POST_IT_STATUS_CONFIG.done.dotColor }}
            />
            <strong className="text-foreground">{stats.done}</strong>
            <span className="text-sm text-muted-foreground">
              {POST_IT_STATUS_CONFIG.done.label.toLowerCase()}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: POST_IT_STATUS_CONFIG.depasse.dotColor }}
            />
            <strong className="text-foreground">{stats.overdue}</strong>
            <span className="text-sm text-muted-foreground">
              {POST_IT_STATUS_CONFIG.depasse.label.toLowerCase()}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: POST_IT_STATUS_CONFIG.en_cours.dotColor }}
            />
            <strong className="text-foreground">{stats.pending}</strong>
            <span className="text-sm text-muted-foreground">
              {POST_IT_STATUS_CONFIG.en_cours.label.toLowerCase()}
            </span>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            {selectedOccurrence?.provisioned === false ? (
              <>
                <p className="text-lg font-medium">Période non provisionnée</p>
                <p className="text-sm mt-1">
                  Cette période n'a pas encore été provisionnée — aucun post-it n'a été distribué
                  pour cet intervalle.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
                <p className="text-sm mt-1">Essayez de modifier vos filtres de recherche</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {users.map((user) => (
              <div
                key={user.postItId}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
              >
                {user.photoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={user.photoUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                    bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)]
                    text-[var(--color-3-nuance-1)]"
                  >
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.status === 'done'
                      ? `Complété le ${formatDate(user.updatedAt)}`
                      : `Échéance : ${formatDate(user.deadline)}`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(user.status)}

                  {user.status !== 'done' && (
                    <Button
                      preset="row-validate"
                      tooltipText="Marquer comme terminé"
                      loading={loadingUserId === user.userId}
                      onClick={() => onForceComplete(user.userId)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoading && users.length > 0 && totalPages > 1 && (
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages} ({total} utilisateurs au total)
          </p>

          <div className="flex items-center gap-2">
            <Button
              preset="pagination-prev"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            />
            <Button
              preset="pagination-next"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            />
          </div>
        </div>
      )}
    </div>
  );
}
