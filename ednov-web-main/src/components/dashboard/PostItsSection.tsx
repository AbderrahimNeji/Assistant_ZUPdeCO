import * as React from 'react';
import { PostItGrid } from '@/components/post-its/PostItGrid';
import { PostItModal } from '@/components/post-its/PostItModal';
import { ShareModal } from '@/components/post-its/ShareModal';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { PostItBoardToggle, type PostItBoardView } from '@/components/post-its/PostItBoardToggle';
import type {
  CreateAssignedPostItDto,
  AssignedPostIt,
  PostIt,
  CreatePostItDto,
  UpdatePostItDto,
  PostItStatus,
} from '@/types/post-it.types';
import {
  AssignedPostItsBoard,
  type AssignedFilter,
} from '@/components/post-its/AssignedPostItsBoard';
import { AssignedPostItsFilters } from '@/components/post-its/AssignedPostItsFilters';
import { PersonalPostItsFilters } from '@/components/post-its/PersonalPostItsFilters';
import {
  AssignedSelectionBar,
  type SelectionActionConfig,
} from '@/components/post-its/AssignedSelectionBar';
import { Plus, Filter, BadgePlus } from 'lucide-react';
import { usePostItFilters } from '@/hooks/usePostItFilters';
import { Button } from '@/components/forms/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPostIts,
  createPostIt,
  updatePostIt,
  deletePostIt,
  togglePriority,
  updateStatus,
  sharePostIt,
  sharePostItByRole,
  removeShare,
  hardDeletePostIt,
  emptyTrash,
  toggleArchive,
  createAssignedPostIt,
  updateAssignedPostIt,
  deleteAssignedPostIt,
  bulkUpdateAssignedPostIts,
  bulkDeleteAssignedTemplates,
  bulkUpdateAssignedTemplates,
} from '@/services/post-its.service';
import type { ElementWidth } from '@/types/interface-elements.types';
import { toast } from '@/lib/toast';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';

interface PostItsSectionProps {
  sectionWidth?: ElementWidth;
  onSuccess?: (action: 'create' | 'update' | 'delete') => void;
  onError?: (error: Error) => void;
}

export const PostItsSection: React.FC<PostItsSectionProps> = ({
  sectionWidth = 'full',
  onSuccess,
  onError,
}) => {
  const queryClient = useQueryClient();

  // Board toggle — piloté par role_interface_elements (plus de check hardcodé)
  const { elements: dashboardElements } = useInterfaceElements('dashboard');
  const canToggleBoard = dashboardElements.some((el) => el.elementId === 'postits-board-toggle');
  const canFilterAssigned = dashboardElements.some(
    (el) => el.elementId === 'postits-assigned-filter',
  );
  const canSelectAssigned = dashboardElements.some(
    (el) => el.elementId === 'postits-assigned-selection-bar',
  );
  const canCreateAssigned = dashboardElements.some(
    (el) => el.elementId === 'postits-assigned-create',
  );

  const [boardView, setBoardView] = React.useState<PostItBoardView>('personal');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [assignedFilter, setAssignedFilter] = React.useState<AssignedFilter>('all');
  const [assignedSpecificDateFrom, setAssignedSpecificDateFrom] = React.useState('');
  const [assignedSpecificDateTo, setAssignedSpecificDateTo] = React.useState('');
  const [assignedQuarterlyPeriods, setAssignedQuarterlyPeriods] = React.useState<number[]>([]);
  const [showAssignedFilters, setShowAssignedFilters] = React.useState(false);
  const [showPersonalFilters, setShowPersonalFilters] = React.useState(false);
  const [showQuickBar, setShowQuickBar] = React.useState(false);
  const [assignedModalOpen, setAssignedModalOpen] = React.useState(false);
  const [editingAssignedPostIt, setEditingAssignedPostIt] = React.useState<AssignedPostIt | null>(
    null,
  );
  const [assignedViewModalOpen, setAssignedViewModalOpen] = React.useState(false);

  const [postItModalOpen, setPostItModalOpen] = React.useState(false);
  const [editingPostIt, setEditingPostIt] = React.useState<PostIt | null>(null);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [postItToShare, setPostItToShare] = React.useState<PostIt | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [postItToDelete, setPostItToDelete] = React.useState<string | null>(null);
  const [isHardDelete, setIsHardDelete] = React.useState(false);
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = React.useState(false);
  const [deadlineFrom, setDeadlineFrom] = React.useState('');
  const [deadlineTo, setDeadlineTo] = React.useState('');
  const [loadingStates, setLoadingStates] = React.useState<
    Record<
      string,
      {
        deleting?: boolean;
        togglingPriority?: boolean;
        togglingStatus?: boolean;
        sharing?: boolean;
      }
    >
  >({});

  const { data: postItsResponse, isLoading } = useQuery({
    queryKey: ['postits', deadlineFrom, deadlineTo],
    queryFn: () =>
      getPostIts({
        dateFrom: deadlineFrom || undefined,
        dateTo: deadlineTo || undefined,
      }),
  });

  const postIts = postItsResponse?.postIts || [];

  const personalFilters = usePostItFilters(
    postIts,
    deadlineFrom,
    setDeadlineFrom,
    deadlineTo,
    setDeadlineTo,
  );

  // Mutations
  const createPostItMutation = useMutation({
    mutationFn: createPostIt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      setPostItModalOpen(false);
      setEditingPostIt(null);
      toast.success('Post-it créé avec succès !');
      onSuccess?.('create');
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la création du post-it');
      onError?.(error);
    },
  });

  const updatePostItMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostItDto }) => updatePostIt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      setPostItModalOpen(false);
      setEditingPostIt(null);
      toast.success('Post-it modifié avec succès !');
      onSuccess?.('update');
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la modification du post-it');
      onError?.(error);
    },
  });

  // POC-317: Renommé en archivePostItMutation (deletePostIt archive maintenant)
  const archivePostItMutation = useMutation({
    mutationFn: deletePostIt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      setDeleteModalOpen(false);
      setPostItToDelete(null);
      toast.success('Post-it archivé avec succès !');
      onSuccess?.('delete');
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'archivage du post-it");
      onError?.(error);
    },
  });

  // POC-317: Hard delete pour corbeille
  const hardDeletePostItMutation = useMutation({
    mutationFn: hardDeletePostIt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      setDeleteModalOpen(false);
      setPostItToDelete(null);
      toast.success('Post-it supprimé définitivement !');
      onSuccess?.('delete');
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la suppression définitive');
      onError?.(error);
    },
  });

  // POC-317: Vider la corbeille
  const emptyTrashMutation = useMutation({
    mutationFn: emptyTrash,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      toast.success(`${data.count} post-it(s) supprimé(s) de la corbeille`);
      onSuccess?.('delete');
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du vidage de la corbeille');
      onError?.(error);
    },
  });

  const togglePriorityMutation = useMutation({
    mutationFn: (id: string) => {
      setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingPriority: true } }));
      return togglePriority(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['postits'] });
      const previousData = queryClient.getQueryData(['postits']);

      queryClient.setQueryData(['postits'], (old: any) => {
        if (!old?.postIts) return old;
        return {
          ...old,
          postIts: old.postIts.map((p: PostIt) =>
            p.id === id ? { ...p, isPriority: !p.isPriority } : p,
          ),
        };
      });

      return { previousData };
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      toast.success('Priorité modifiée !');
      setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingPriority: false } }));
    },
    onError: (error: Error, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['postits'], context.previousData);
      }
      toast.error('Erreur lors de la modification de la priorité');
      onError?.(error);
      setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingPriority: false } }));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PostItStatus }) => {
      setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingStatus: true } }));
      return updateStatus(id, status);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['postits'] });
      const previousData = queryClient.getQueryData(['postits']);

      queryClient.setQueryData(['postits'], (old: any) => {
        if (!old?.postIts) return old;
        return {
          ...old,
          postIts: old.postIts.map((p: PostIt) => (p.id === id ? { ...p, status } : p)),
        };
      });

      return { previousData };
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['postits'] });
      toast.success('Statut modifié !');
      setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingStatus: false } }));
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['postits'], context.previousData);
      }
      toast.error('Erreur lors de la modification du statut');
      onError?.(error);
      setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingStatus: false } }));
    },
  });

  // Handlers
  const handleCreatePostIt = () => {
    if (boardView === 'assigned') {
      setAssignedModalOpen(true);
    } else {
      setEditingPostIt(null);
      setPostItModalOpen(true);
    }
  };

  // ── Sélection groupée (vue assignée) ──────────────────
  // IDs alimentés par onDataReady du board
  const [assignedBoardIds, setAssignedBoardIds] = React.useState<string[]>([]);

  const handleToggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSelectAll = () => setSelectedIds(assignedBoardIds);

  const handleClearSelection = () => setSelectedIds([]);

  // ── Mutations assigned ─────────────────────────────────
  const createAssignedMutation = useMutation({
    mutationFn: createAssignedPostIt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-its', 'assigned'] });
      toast.success('Post-it assigné créé avec succès !');
      setAssignedModalOpen(false);
      onSuccess?.('create');
    },
    onError: () => {
      toast.error('Erreur lors de la création du post-it assigné');
    },
  });

  const bulkAssignedMutation = useMutation({
    mutationFn: bulkUpdateAssignedPostIts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['post-its', 'assigned'] });
      toast.success(
        `${result.updated} post-it${result.updated === 1 ? '' : 's'} mis à jour avec succès`,
      );
      setSelectedIds([]);
    },
    onError: () => {
      toast.error("Erreur lors de l'action groupée");
    },
  });

  const updateAssignedMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssignedPostItDto> }) =>
      updateAssignedPostIt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-its', 'assigned'] });
      toast.success('Post-it assigné mis à jour avec succès !');
      setAssignedViewModalOpen(false);
      setEditingAssignedPostIt(null);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du post-it assigné');
    },
  });

  const deleteAssignedTemplateMutation = useMutation({
    mutationFn: deleteAssignedPostIt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-its', 'assigned'] });
      toast.success('Template supprimé avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du template');
    },
  });

  const bulkDeleteAssignedTemplatesMutation = useMutation({
    mutationFn: bulkDeleteAssignedTemplates,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['post-its', 'assigned'] });
      toast.success(
        `${result.deleted} template${result.deleted === 1 ? '' : 's'} supprimé${result.deleted === 1 ? '' : 's'}`,
      );
      setSelectedIds([]);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression groupée');
    },
  });

  const bulkPriorityAssignedTemplatesMutation = useMutation({
    mutationFn: bulkUpdateAssignedTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-its', 'assigned'] });
      toast.success('Templates marqués comme prioritaires');
      setSelectedIds([]);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour groupée');
    },
  });

  const handleSaveAssignedPostIt = async (data: CreateAssignedPostItDto) => {
    await createAssignedMutation.mutateAsync(data);
  };

  const handleUpdateAssignedPostIt = async (id: string, data: Partial<CreateAssignedPostItDto>) => {
    await updateAssignedMutation.mutateAsync({ id, data });
  };

  const handleEditAssigned = (t: AssignedPostIt) => {
    setEditingAssignedPostIt(t);
    setAssignedViewModalOpen(true);
  };

  const handleDeleteAssignedTemplate = (id: string) => {
    deleteAssignedTemplateMutation.mutate(id);
  };

  const handleBulkDeleteAssigned = () => {
    bulkDeleteAssignedTemplatesMutation.mutate(selectedIds);
  };

  const handleBulkPriorityAssigned = () => {
    bulkPriorityAssignedTemplatesMutation.mutate({
      ids: selectedIds,
      data: { isPriority: true },
    });
  };

  const handleApplySelection = (config: SelectionActionConfig) => {
    bulkAssignedMutation.mutate({
      ids: selectedIds,
      roleId: config.roleId,
      recurrence: config.recurrence,
      specificDateFrom: config.specificDateFrom,
      specificDateTo: config.specificDateTo,
      quarterlyPeriods: config.quarterlyPeriods,
      scheduleConfig: config.scheduleConfig,
    });
  };

  const handleSavePostIt = async (data: CreatePostItDto | UpdatePostItDto) => {
    if (editingPostIt) {
      await updatePostItMutation.mutateAsync({
        id: editingPostIt.id,
        data,
      });
    } else {
      await createPostItMutation.mutateAsync(data as CreatePostItDto);
    }
  };

  const handleEditPostIt = (postIt: PostIt) => {
    setEditingPostIt(postIt);
    setPostItModalOpen(true);
  };

  const handleDeletePostIt = (id: string, hardDelete = false) => {
    setPostItToDelete(id);
    setIsHardDelete(hardDelete);
    setDeleteModalOpen(true);
  };

  const confirmDeletePostIt = async () => {
    if (postItToDelete) {
      if (isHardDelete) {
        await hardDeletePostItMutation.mutateAsync(postItToDelete);
      } else {
        await archivePostItMutation.mutateAsync(postItToDelete);
      }
    }
  };

  const handleRestorePostIt = async (id: string) => {
    setLoadingStates((prev) => ({ ...prev, [id]: { ...prev[id], togglingStatus: true } }));
    try {
      await toggleArchive(id);
      await queryClient.invalidateQueries({ queryKey: ['postits'] });
      toast.success('Post-it restauré avec succès !');
      onSuccess?.('update');
    } catch (error) {
      toast.error('Erreur lors de la restauration');
      onError?.(error as Error);
    } finally {
      setLoadingStates((prev) => {
        const newState = { ...prev };
        delete newState[id]?.togglingStatus;
        return newState;
      });
    }
  };

  const handleEmptyTrash = () => {
    setEmptyTrashModalOpen(true);
  };

  const confirmEmptyTrash = async () => {
    await emptyTrashMutation.mutateAsync();
    setEmptyTrashModalOpen(false);
  };

  const handleTogglePostItPriority = async (id: string) => {
    await togglePriorityMutation.mutateAsync(id);
  };

  const handleTogglePostItStatus = async (id: string) => {
    const postIt = postIts.find((p) => p.id === id);
    if (!postIt) return;

    const newStatus = postIt.status === 'done' ? 'en_cours' : 'done';
    await toggleStatusMutation.mutateAsync({ id, status: newStatus });
  };

  const handleSharePostIt = (postIt: PostIt) => {
    setPostItToShare(postIt);
    setShareModalOpen(true);
  };

  const handleShareUsers = async (userIds: string[], permission: 'read' | 'write') => {
    if (!postItToShare) return;
    try {
      await sharePostIt(postItToShare.id, userIds, permission);
      queryClient.invalidateQueries({ queryKey: ['postits'] });
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const handleShareRole = async (roleCode: string, permission: 'read' | 'write') => {
    if (!postItToShare) return;
    try {
      await sharePostItByRole(postItToShare.id, roleCode, permission);
      queryClient.invalidateQueries({ queryKey: ['postits'] });
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!postItToShare) return;
    try {
      await removeShare(postItToShare.id, userId);
      queryClient.invalidateQueries({ queryKey: ['postits'] });
    } catch (error) {
      onError?.(error as Error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="section-header">
          <h2 className="section-title">Post-its</h2>
        </div>
        <div className="text-center py-8 text-muted-foreground animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col">
        {/* Header */}
        <div className="section-header flex-shrink-0 mb-5">
          <h2 className="section-title">
            {boardView === 'assigned' && canToggleBoard ? 'Planification post-its' : 'Mes post-its'}
          </h2>
          <div className="section-actions">
            {/* Bouton sélection groupée — uniquement vue assignée */}
            {canSelectAssigned && boardView === 'assigned' && (
              <Button
                preset="section-action"
                icon={BadgePlus}
                tooltipText="Sélection groupée"
                onClick={() => {
                  setShowQuickBar((prev) => {
                    if (prev) setSelectedIds([]);
                    return !prev;
                  });
                  setShowAssignedFilters(false);
                }}
                className={showQuickBar ? 'section-action-button-active' : undefined}
              />
            )}
            {/* Bouton filtre — vue assignée */}
            {canFilterAssigned && boardView === 'assigned' && (
              <Button
                preset="section-action"
                icon={Filter}
                tooltipText="Filtrer"
                onClick={() => {
                  setShowAssignedFilters((prev) => !prev);
                  setShowQuickBar(false);
                }}
                className={showAssignedFilters ? 'section-action-button-active' : undefined}
              />
            )}
            {/* Bouton filtre — vue personnelle */}
            {boardView === 'personal' && (
              <Button
                preset="section-action"
                icon={Filter}
                tooltipText="Filtrer par deadline"
                onClick={() => setShowPersonalFilters((prev) => !prev)}
                className={showPersonalFilters ? 'section-action-button-active' : undefined}
              />
            )}
            <Button
              preset="section-action"
              icon={Plus}
              tooltipText={boardView === 'assigned' ? 'Nouveau post-it assigné' : 'Nouveau post-it'}
              onClick={handleCreatePostIt}
            />

            {/* Toggle board — piloté par role_interface_elements */}
            {canToggleBoard && (
              <PostItBoardToggle
                view={boardView}
                onChange={(v) => {
                  setBoardView(v);
                  setSelectedIds([]);
                  if (v === 'personal') {
                    setShowAssignedFilters(false);
                    setShowQuickBar(false);
                    setAssignedFilter('all');
                    setAssignedSpecificDateFrom('');
                    setAssignedSpecificDateTo('');
                    setAssignedQuarterlyPeriods(undefined);
                  } else {
                    setShowPersonalFilters(false);
                    personalFilters.reset();
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Filtres deadline — vue personnelle */}
        {boardView === 'personal' && showPersonalFilters && (
          <PersonalPostItsFilters
            deadlineFrom={personalFilters.deadlineFrom}
            deadlineTo={personalFilters.deadlineTo}
            onDeadlineFromChange={personalFilters.setDeadlineFrom}
            onDeadlineToChange={personalFilters.setDeadlineTo}
            onReset={personalFilters.reset}
            resultCount={personalFilters.filteredCount}
          />
        )}

        {/* Barre de filtres — s'affiche au clic sur le bouton filtre */}
        {canFilterAssigned && boardView === 'assigned' && showAssignedFilters && (
          <AssignedPostItsFilters
            filter={assignedFilter}
            onFilterChange={(f) => {
              setAssignedFilter(f);
              if (f !== 'specific_date') {
                setAssignedSpecificDateFrom('');
                setAssignedSpecificDateTo('');
              }
              if (f !== 'quarterly') {
                setAssignedQuarterlyPeriods([]);
              }
            }}
            specificDateFrom={assignedSpecificDateFrom}
            specificDateTo={assignedSpecificDateTo}
            onSpecificDateFromChange={setAssignedSpecificDateFrom}
            onSpecificDateToChange={setAssignedSpecificDateTo}
            quarterlyPeriods={assignedQuarterlyPeriods}
            onQuarterlyPeriodsChange={setAssignedQuarterlyPeriods}
          />
        )}

        {/* Bloc de sélection groupée — s'affiche au clic sur BadgePlus */}
        {canSelectAssigned && boardView === 'assigned' && showQuickBar && (
          <AssignedSelectionBar
            selectedIds={selectedIds}
            totalCount={assignedBoardIds.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onApply={handleApplySelection}
            onDelete={handleBulkDeleteAssigned}
            onSetPriority={handleBulkPriorityAssigned}
            isLoading={
              bulkAssignedMutation.isPending ||
              bulkDeleteAssignedTemplatesMutation.isPending ||
              bulkPriorityAssignedTemplatesMutation.isPending
            }
          />
        )}

        {/* Board conditionnel */}
        <div>
          {boardView === 'personal' || !canToggleBoard ? (
            <PostItGrid
              postIts={postIts}
              sectionWidth={sectionWidth}
              isLoading={isLoading}
              onReorder={() => {}}
              onEdit={handleEditPostIt}
              onDelete={handleDeletePostIt}
              onTogglePriority={handleTogglePostItPriority}
              onToggleStatus={handleTogglePostItStatus}
              onShare={handleSharePostIt}
              onRestore={handleRestorePostIt}
              onEmptyTrash={handleEmptyTrash}
              loadingStates={loadingStates}
            />
          ) : (
            <AssignedPostItsBoard
              filter={assignedFilter}
              dateFrom={assignedSpecificDateFrom || undefined}
              dateTo={assignedSpecificDateTo || undefined}
              quarterlyPeriods={assignedQuarterlyPeriods}
              selectedIds={showQuickBar ? selectedIds : []}
              onToggleSelect={showQuickBar ? handleToggleSelect : undefined}
              onDataReady={setAssignedBoardIds}
              onEditAssigned={handleEditAssigned}
              onDeleteTemplate={handleDeleteAssignedTemplate}
              sectionWidth={sectionWidth}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <PostItModal
        variant="personal"
        isOpen={postItModalOpen}
        onClose={() => {
          setPostItModalOpen(false);
          setEditingPostIt(null);
        }}
        onSave={handleSavePostIt}
        postIt={editingPostIt || undefined}
        mode={(() => {
          if (!editingPostIt) return 'create';
          if (editingPostIt.userPermission === 'read') return 'view';
          return 'edit';
        })()}
      />

      {postItToShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setPostItToShare(null);
          }}
          postIt={postItToShare}
          onShareUsers={handleShareUsers}
          onShareRole={handleShareRole}
          onRemoveShare={handleRemoveShare}
        />
      )}

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPostItToDelete(null);
          setIsHardDelete(false);
        }}
        onConfirm={confirmDeletePostIt}
        itemName={isHardDelete ? 'définitivement ce post-it' : 'ce post-it'}
        title={isHardDelete ? 'Supprimer définitivement' : 'Supprimer le post-it'}
        description={
          isHardDelete
            ? 'Cette action est irréversible. Le post-it sera supprimé définitivement.'
            : 'Le post-it sera déplacé dans la corbeille. Vous pourrez le restaurer ultérieurement.'
        }
        isLoading={
          isHardDelete ? hardDeletePostItMutation.isPending : archivePostItMutation.isPending
        }
      />
      <DeleteModal
        open={emptyTrashModalOpen}
        onClose={() => setEmptyTrashModalOpen(false)}
        onConfirm={confirmEmptyTrash}
        itemName="tous les post-its de la corbeille"
        title="Vider la corbeille"
        description="Cette action est irréversible. Tous vos post-its archivés seront supprimés définitivement."
        isLoading={emptyTrashMutation.isPending}
      />

      {canCreateAssigned && (
        <PostItModal
          variant="assigned"
          mode="create"
          isOpen={assignedModalOpen}
          onClose={() => setAssignedModalOpen(false)}
          onSave={handleSaveAssignedPostIt}
        />
      )}

      {editingAssignedPostIt && (
        <PostItModal
          variant="assigned"
          mode="edit"
          assignedPostIt={editingAssignedPostIt}
          isOpen={assignedViewModalOpen}
          onClose={() => {
            setAssignedViewModalOpen(false);
            setEditingAssignedPostIt(null);
          }}
          onSave={handleSaveAssignedPostIt}
          onUpdate={handleUpdateAssignedPostIt}
        />
      )}
    </>
  );
};
