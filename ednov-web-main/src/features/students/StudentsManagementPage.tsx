import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/forms/Button';
import { SlidePanel } from '@/components/common/SlidePanel';
import { StudentsDataTable } from '@/components/students/StudentsDataTable';
import { CreateStudentView } from '@/components/students/CreateStudentView';
import { EditStudentView } from '@/components/students/EditStudentView';
import { ImportStudentsModal } from '@/components/students/ImportStudentsModal';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useViewMode } from '@/hooks/useViewMode';
import { ManagementPage } from '@/components/common/ManagementPage';
import { usePageActions } from '@/hooks/usePageActions';
import { useAssistantLauncher, AskCopilotButton } from '@/features/copilot';

// ══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════

/**
 * Page complète de gestion des élèves
 *
 * Utilise SlidePanel pour les formulaires Create/Edit (contrairement à sessions
 * qui utilise CollapseReplaceWrapper). Le reste est harmonisé à 100% avec sessions.
 *
 * Structure:
 * - Header avec titre + bouton "Créer un élève"
 * - StudentsDataTable (liste/cards + filtres + pagination + détails)
 * - SlidePanel pour CreateStudentView (s'ouvre latéralement)
 * - SlidePanel pour EditStudentView (s'ouvre latéralement)
 */
export const StudentsManagementPage: React.FC = () => {
  const { canCreate, canImportCsv, canEditRow, canDeleteRow, canExportCsv } =
    usePageActions('students');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const { viewMode, setViewMode } = useViewMode('students-management');
  const { openRowId, openRow, closeRow } = useDetailsView();
  const [editStudentId, setEditStudentId] = React.useState<string | null>(null);
  const { setSelection, setEntity, clearSelection } = useAssistantLauncher();

  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('view');
    const shouldCreate = searchParams.get('create') === 'true';

    if (editId) {
      setEditStudentId(editId);
      setCreateFormOpen(false);
      closeRow();
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (viewId) {
      openRow(viewId);
      setCreateFormOpen(false);
      setEditStudentId(null);
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }

    if (shouldCreate) {
      setCreateFormOpen(true);
      setEditStudentId(null);
      closeRow();
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, closeRow, openRow]);

  React.useEffect(() => {
    const focusedId = editStudentId || openRowId;
    if (!focusedId) {
      clearSelection();
      setEntity('student', undefined);
      return;
    }

    let cancelled = false;

    const resolveLabel = (): string => {
      const cachedQueries = queryClient.getQueriesData<{
        data?: Array<{
          id: string;
          displayName?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        }>;
      }>({ queryKey: ['users', 'student'] });

      for (const [, payload] of cachedQueries) {
        const hit = payload?.data?.find((s) => s.id === focusedId);
        if (hit) {
          const full = `${hit.firstName ?? ''} ${hit.lastName ?? ''}`.trim();
          if (full) return full;
          if (hit.displayName?.trim()) return hit.displayName.trim();
        }
      }

      const detail = queryClient.getQueryData<{
        displayName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }>(['users', 'student', focusedId]);
      if (detail) {
        const full = `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim();
        if (full) return full;
        if (detail.displayName?.trim()) return detail.displayName.trim();
      }
      return 'Élève sélectionné';
    };

    const apply = (label: string) => {
      if (cancelled) return;
      const ref = { type: 'student' as const, id: focusedId, label };
      setSelection(ref);
      setEntity('student', ref);
    };

    apply(resolveLabel());

    void (async () => {
      try {
        const { getStudent } = await import('@/services/users.service');
        const student = await getStudent(focusedId);
        const full =
          `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() ||
          student.displayName?.trim() ||
          'Élève sélectionné';
        apply(full);
      } catch {
        // Keep cache/fallback label — never invent.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editStudentId, openRowId, setSelection, setEntity, clearSelection, queryClient]);

  /**
   * Ouvre le formulaire d'édition et ferme le formulaire de création
   */
  const handleEditStudent = (id: string) => {
    setEditStudentId(id);
    setCreateFormOpen(false);
    closeRow();
  };

  /**
   * Ferme tous les formulaires (création et édition)
   */
  const handleCloseForm = () => {
    setCreateFormOpen(false);
    setEditStudentId(null);
  };

  /**
   * Callback succès: ferme les formulaires et invalide les queries
   */
  const handleSuccess = () => {
    setCreateFormOpen(false);
    setEditStudentId(null);
    queryClient.invalidateQueries({ queryKey: ['users', 'student'] });
  };

  return (
    <ManagementPage
      title="Gestion des Élèves"
      subtitle="Créez, modifiez et gérez tous vos élèves"
      actions={
        <div className="flex items-center gap-3">
          {(editStudentId || openRowId) && (
            <AskCopilotButton prompt="Explain this student’s status, matching, and next session." />
          )}
          {canImportCsv && (
            <Button
              preset="import-csv"
              onClick={() => setImportModalOpen(true)}
              disabled={isImporting}
            >
              Importer par CSV
            </Button>
          )}
          {canCreate && (
            <Button
              preset="create-entity"
              onClick={() => {
                setCreateFormOpen(true);
                setEditStudentId(null);
                closeRow();
              }}
              disabled={isImporting}
            >
              Créer un élève
            </Button>
          )}
        </div>
      }
    >
      <StudentsDataTable
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditStudent={handleEditStudent}
        enableFilters={true}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />

      <SlidePanel isOpen={createFormOpen} onClose={handleCloseForm}>
        <CreateStudentView onClose={handleCloseForm} onSuccess={handleSuccess} />
      </SlidePanel>

      <SlidePanel isOpen={!!editStudentId} onClose={handleCloseForm}>
        {editStudentId && (
          <EditStudentView
            studentId={editStudentId}
            onClose={handleCloseForm}
            onSuccess={handleSuccess}
          />
        )}
      </SlidePanel>

      <ImportStudentsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportStart={() => setIsImporting(true)}
        onImportEnd={() => setIsImporting(false)}
      />
    </ManagementPage>
  );
};
