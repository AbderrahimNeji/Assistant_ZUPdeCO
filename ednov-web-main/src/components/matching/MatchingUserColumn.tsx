import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GraduationCap, User, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { SearchInput } from '@/components/forms/SearchInput';
import { Spinner } from '@/components/ui/spinner';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { FilterConfigurePanel } from '@/components/common/DataTable/FilterConfigurePanel';
import { TutorFiltersContent } from '@/components/tutors/TutorFilters';
import { StudentFiltersContent } from '@/components/students/StudentFilters';
import { useFilterVisibility } from '@/hooks/useFilterVisibility';
import { useUsersSearch } from '@/hooks/useUsersSearch';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user.types';
import { getUserRoleGroup } from '@/types/user.types';
import {
  ALL_FILTER_GROUP_IDS as TUTOR_ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS as TUTOR_FILTER_GROUP_LABELS,
  type TutorFilters,
  type FilterGroupId as TutorFilterGroupId,
} from '@/components/tutors/tutor-configs';
import {
  ALL_FILTER_GROUP_IDS as STUDENT_ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS as STUDENT_FILTER_GROUP_LABELS,
  type StudentFilters,
  type FilterGroupId as StudentFilterGroupId,
} from '@/components/students/student-configs';

interface MatchingUserColumnProps {
  role: 'tutor' | 'student';
  emptyMessage?: string;
  excludedIds?: string[];
  pageSize?: number;
  getMatchCount?: (userId: string) => number;
  onDoubleClick?: (user: UserWithProfile) => void;
  onCreateClick?: () => void;
  className?: string;
  initialEstablishmentId?: string;
  initialEstablishmentName?: string;
}

/**
 * MatchingUserColumn - Colonne complète avec header, pagination et liste
 *
 * Gère TOUT en interne : fetch API, filtres, pagination, search
 * Le parent passe uniquement excludedIds
 */
export const MatchingUserColumn: React.FC<MatchingUserColumnProps> = ({
  role,
  emptyMessage,
  excludedIds = [],
  pageSize = 10,
  getMatchCount,
  onDoubleClick,
  onCreateClick,
  className,
  initialEstablishmentId,
  initialEstablishmentName,
}) => {
  const [showFiltersModal, setShowFiltersModal] = React.useState(false);
  const [showConfigure, setShowConfigure] = React.useState(false);

  // États de filtres locaux
  const [tutorFilters, setTutorFilters] = React.useState<TutorFilters>({
    statuses: [],
    subjects: [],
    establishmentId: initialEstablishmentId || undefined,
    disponibilite: [],
    experienceRange: undefined,
  });

  const [studentFilters, setStudentFilters] = React.useState<StudentFilters>({
    statuses: [],
    levelIds: [],
    subjects: [],
    establishmentId: initialEstablishmentId || undefined,
    classIds: [],
    specialtyIds: [],
    createdFrom: undefined,
    createdTo: undefined,
  });

  // Synchroniser l'établissement quand il change depuis le formulaire parent
  React.useEffect(() => {
    if (role === 'student') {
      setStudentFilters((prev) => ({
        ...prev,
        establishmentId: initialEstablishmentId || undefined,
        classIds: [],
        specialtyIds: [],
      }));
    } else {
      setTutorFilters((prev) => ({
        ...prev,
        establishmentId: initialEstablishmentId || undefined,
      }));
    }
  }, [initialEstablishmentId, role]);

  const filters = role === 'tutor' ? tutorFilters : studentFilters;

  // useUsersSearch fait l'appel API avec filtres + search
  const { users, isLoading, page, total, hasMore, onNextPage, onPrevPage, onSearch, searchQuery } =
    useUsersSearch({
      role,
      excludedIds,
      pageSize,
      filters,
    });

  // ── RBAC + Préférences (filtre visibilité) ────────────────────────────────
  // Les deux hooks sont appelés inconditionnellement (règles des hooks React).
  // On sélectionne le résultat correspondant au rôle courant.
  const tutorFilterVisibility = useFilterVisibility<TutorFilterGroupId>({
    preferencesName: 'tutors-matching',
    elementsName: 'tutors',
    allFilterGroupIds: TUTOR_ALL_FILTER_GROUP_IDS,
  });

  const studentFilterVisibility = useFilterVisibility<StudentFilterGroupId>({
    preferencesName: 'students-matching',
    elementsName: 'students',
    allFilterGroupIds: STUDENT_ALL_FILTER_GROUP_IDS,
  });

  const {
    visibleFilterIds,
    allowedFilterIds,
    filterVisibility,
    handleToggleFilterVisibility,
    isSavingFilterVisibility,
  } = role === 'tutor' ? tutorFilterVisibility : studentFilterVisibility;

  const filterGroupLabels =
    role === 'tutor' ? TUTOR_FILTER_GROUP_LABELS : STUDENT_FILTER_GROUP_LABELS;

  const configureContent = (
    <FilterConfigurePanel
      allowedFilterIds={allowedFilterIds}
      filterVisibility={filterVisibility}
      filterGroupLabels={filterGroupLabels}
      onToggle={handleToggleFilterVisibility}
      isSaving={isSavingFilterVisibility}
    />
  );

  // Handlers pour filtres tuteurs
  const toggleTutorStatus = React.useCallback((status: string) => {
    setTutorFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const toggleTutorSubject = React.useCallback((subjectId: string) => {
    setTutorFilters((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId],
    }));
  }, []);

  const setTutorEstablishment = React.useCallback((id: string | undefined) => {
    setTutorFilters((prev) => ({ ...prev, establishmentId: id }));
  }, []);

  const toggleTutorDisponibilite = React.useCallback((day: string) => {
    setTutorFilters((prev) => ({
      ...prev,
      disponibilite: prev.disponibilite.includes(day)
        ? prev.disponibilite.filter((d) => d !== day)
        : [...prev.disponibilite, day],
    }));
  }, []);

  // Handlers pour filtres étudiants
  const toggleStudentStatus = React.useCallback((status: string) => {
    setStudentFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const toggleStudentGradeLevel = React.useCallback((levelId: string) => {
    setStudentFilters((prev) => ({
      ...prev,
      levelIds: prev.levelIds.includes(levelId)
        ? prev.levelIds.filter((l) => l !== levelId)
        : [...prev.levelIds, levelId],
    }));
  }, []);

  const toggleStudentSubject = React.useCallback((subjectId: string) => {
    setStudentFilters((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId],
    }));
  }, []);

  const setStudentEstablishment = React.useCallback((id: string | undefined) => {
    setStudentFilters((prev) => ({ ...prev, establishmentId: id }));
  }, []);

  const setStudentClass = React.useCallback((classId: string | undefined) => {
    setStudentFilters((prev) => ({
      ...prev,
      classIds: classId ? [classId] : [],
    }));
  }, []);

  const setStudentSpecialties = React.useCallback((ids: string[]) => {
    setStudentFilters((prev) => ({ ...prev, specialtyIds: ids }));
  }, []);

  const setStudentDateRange = React.useCallback((from: Date | undefined, to: Date | undefined) => {
    setStudentFilters((prev) => ({ ...prev, createdFrom: from, createdTo: to }));
  }, []);

  const toggleStudentIsMinor = React.useCallback((value: boolean | undefined) => {
    setStudentFilters((prev) => ({ ...prev, isMinor: value }));
  }, []);

  const toggleStudentHasSpecialNeeds = React.useCallback((value: boolean | undefined) => {
    setStudentFilters((prev) => ({ ...prev, hasSpecialNeeds: value }));
  }, []);

  const clearFilters = React.useCallback(() => {
    if (role === 'tutor') {
      setTutorFilters({
        statuses: [],
        subjects: [],
        establishmentId: initialEstablishmentId || undefined,
        disponibilite: [],
        experienceRange: undefined,
      });
    } else {
      setStudentFilters({
        statuses: [],
        levelIds: [],
        subjects: [],
        establishmentId: initialEstablishmentId || undefined,
        classIds: [],
        specialtyIds: [],
        createdFrom: undefined,
        createdTo: undefined,
      });
    }
  }, [role, initialEstablishmentId]);

  const hasActiveFilters = React.useMemo(() => {
    if (role === 'tutor') {
      return (
        tutorFilters.statuses.length > 0 ||
        tutorFilters.subjects.length > 0 ||
        (tutorFilters.establishmentId !== undefined &&
          tutorFilters.establishmentId !== initialEstablishmentId) ||
        tutorFilters.disponibilite.length > 0
      );
    } else {
      return (
        studentFilters.statuses.length > 0 ||
        studentFilters.levelIds.length > 0 ||
        studentFilters.subjects.length > 0 ||
        (studentFilters.establishmentId !== undefined &&
          studentFilters.establishmentId !== initialEstablishmentId) ||
        (studentFilters.classIds && studentFilters.classIds.length > 0) ||
        (studentFilters.specialtyIds && studentFilters.specialtyIds.length > 0) ||
        studentFilters.createdFrom !== undefined ||
        studentFilters.createdTo !== undefined
      );
    }
  }, [role, tutorFilters, studentFilters, initialEstablishmentId]);

  // Filter groups
  const filterGroups = React.useMemo(() => {
    if (role === 'tutor') {
      return [
        {
          id: 'filters' as const,
          label: 'Filtres',
          type: 'custom' as const,
          customRender: () => (
            <TutorFiltersContent
              filters={tutorFilters}
              allowedFilterIds={allowedFilterIds}
              visibleFilterIds={visibleFilterIds}
              onToggleStatus={toggleTutorStatus}
              onToggleSubject={toggleTutorSubject}
              onSetEstablishment={setTutorEstablishment}
              onToggleDisponibilite={toggleTutorDisponibilite}
              onSetExperienceRange={() => {}}
            />
          ),
        },
      ];
    } else {
      return [
        {
          id: 'filters' as const,
          label: 'Filtres',
          type: 'custom' as const,
          customRender: () => (
            <StudentFiltersContent
              filters={studentFilters}
              allowedFilterIds={allowedFilterIds}
              visibleFilterIds={visibleFilterIds}
              onToggleStatus={toggleStudentStatus}
              onToggleGradeLevel={toggleStudentGradeLevel}
              onToggleSubject={toggleStudentSubject}
              onSetEstablishment={setStudentEstablishment}
              onSetClass={setStudentClass}
              onSetSpecialties={setStudentSpecialties}
              onSetCustomDateRange={setStudentDateRange}
              onToggleIsMinor={toggleStudentIsMinor}
              onToggleHasSpecialNeeds={toggleStudentHasSpecialNeeds}
              initialEstablishmentOption={
                initialEstablishmentId && initialEstablishmentName
                  ? { value: initialEstablishmentId, label: initialEstablishmentName }
                  : undefined
              }
            />
          ),
        },
      ];
    }
  }, [
    role,
    tutorFilters,
    studentFilters,
    allowedFilterIds,
    visibleFilterIds,
    toggleTutorStatus,
    toggleTutorSubject,
    setTutorEstablishment,
    toggleTutorDisponibilite,
    toggleStudentStatus,
    toggleStudentGradeLevel,
    toggleStudentSubject,
    setStudentEstablishment,
    setStudentClass,
    setStudentSpecialties,
    setStudentDateRange,
    toggleStudentIsMinor,
    toggleStudentHasSpecialNeeds,
    initialEstablishmentId,
    initialEstablishmentName,
  ]);

  const Icon = role === 'tutor' ? GraduationCap : User;
  const colorVar = role === 'tutor' ? '--color-2-nuance-1' : '--color-3-nuance-1';
  const title = role === 'tutor' ? 'Tuteurs' : 'Élèves';
  const singularLabel = role === 'tutor' ? 'tuteur' : 'élève';
  const pluralLabel = role === 'tutor' ? 'tuteurs' : 'élèves';
  const placeholder = role === 'tutor' ? 'Rechercher un tuteur...' : 'Rechercher un élève...';

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={`matching-column ${className || ''}`}>
      {/* Header avec pagination */}
      <div className="matching-column-header">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{
                background: `color-mix(in srgb, var(${colorVar}) 10%, transparent)`,
                borderColor: `var(${colorVar})`,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: `var(${colorVar})` }} />
            </div>
            <div className="leading-tight">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-1-nuance-1)' }}>
                {title}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">
                {total} {total > 1 ? pluralLabel : singularLabel}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                Page {page}/{totalPages}
              </p>
            </div>
          </div>
          {/* Boutons: pagination + actions */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevPage}
              disabled={page === 1}
              icon={ChevronLeft}
              tooltipText="Page précédente"
              tooltipSide="bottom"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextPage}
              disabled={!hasMore}
              icon={ChevronRight}
              tooltipText="Page suivante"
              tooltipSide="bottom"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFiltersModal(true)}
              icon={Filter}
              tooltipText="Filtres"
              tooltipSide="bottom"
              showBadge={hasActiveFilters}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateClick}
              icon={Plus}
              tooltipText={`Créer un ${singularLabel}`}
              tooltipSide="bottom"
              className="matching-action-button"
            />
          </div>
        </div>
      </div>

      {/* Contenu avec search et liste */}
      <div className="matching-column-content">
        <div className="flex flex-col h-full">
          {/* Search */}
          <div className="flex-shrink-0 mb-3">
            <SearchInput
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onClear={() => onSearch('')}
              size="sm"
              variant="outlined"
              showShortcutHint={false}
            />
          </div>

          {/* User List */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--color-1-nuance-3)] scrollbar-track-transparent">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" label="Chargement..." />
              </div>
            )}

            {!isLoading && users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center border"
                  style={{
                    background: `color-mix(in srgb, var(${colorVar}) 10%, transparent)`,
                    borderColor: `var(${colorVar})`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: `var(${colorVar})` }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {emptyMessage || `Aucun ${role === 'tutor' ? 'tuteur' : 'élève'} disponible`}
                </p>
              </div>
            )}

            {!isLoading && users.length > 0 && (
              <div className="space-y-2 pt-1">
                {users.map((user) => (
                  <DraggableUserCard
                    key={user.id}
                    user={user}
                    role={role}
                    Icon={Icon}
                    colorVar={colorVar}
                    matchCount={getMatchCount?.(user.id)}
                    onDoubleClick={onDoubleClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de filtres */}
      <DataTableFilters
        show={showFiltersModal}
        mode="modal"
        onClose={() => setShowFiltersModal(false)}
        hasActiveFilters={hasActiveFilters}
        filterGroups={filterGroups}
        onClearFilters={clearFilters}
        resultCount={total}
        resultLabel={pluralLabel}
        onToggleConfigure={
          allowedFilterIds.length > 0 ? () => setShowConfigure((v) => !v) : undefined
        }
        showConfigure={showConfigure}
        configureContent={configureContent}
      />
    </div>
  );
};

// Composant DraggableUserCard
interface DraggableUserCardProps {
  user: UserWithProfile;
  role: 'tutor' | 'student';
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  colorVar: string;
  matchCount?: number;
  onDoubleClick?: (user: UserWithProfile) => void;
}

const DraggableUserCard: React.FC<DraggableUserCardProps> = ({
  user,
  role,
  Icon,
  colorVar,
  matchCount,
  onDoubleClick,
}) => {
  // Get role label directly from database - NO HARDCODE
  const roleLabel = user.userRoles?.[0]?.role.label || null;

  // Use roleGroup dynamically instead of hardcoded types
  const roleGroup = getUserRoleGroup(user) || (role === 'tutor' ? 'tutors' : 'students');

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: user.id,
    data: { roleGroup, user },
  });

  const handleDoubleClick = React.useCallback(() => {
    if (onDoubleClick) {
      onDoubleClick(user);
    }
  }, [onDoubleClick, user]);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={handleDoubleClick}
      className={cn('matching-user-card', isDragging && 'matching-user-card-dragging')}
    >
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
            {role === 'student'
              ? user.displayName || user.email || 'Utilisateur'
              : `${user.firstName} ${user.lastName}`.trim() ||
                user.displayName ||
                user.email ||
                'Utilisateur'}
          </p>
          {roleLabel && (
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none mt-0.5"
              style={{
                background: `color-mix(in srgb, var(${colorVar}) 15%, transparent)`,
                color: `var(${colorVar})`,
                border: `1px solid color-mix(in srgb, var(${colorVar}) 35%, transparent)`,
              }}
            >
              {roleLabel}
            </span>
          )}
        </div>
        {role === 'tutor' && matchCount !== undefined && matchCount > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
              color: 'var(--color-3-nuance-1)',
              borderColor: 'var(--color-3-nuance-1)',
            }}
          >
            {matchCount}
          </span>
        )}
      </div>
    </div>
  );
};
