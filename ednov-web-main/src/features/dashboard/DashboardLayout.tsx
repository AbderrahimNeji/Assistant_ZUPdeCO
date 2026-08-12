import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDroppable,
  CollisionDetection,
  pointerWithin,
} from '@dnd-kit/core';
import { useCustomDragOverlay } from '@/hooks/useCustomDragOverlay';
import { SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { StatsSection } from '@/components/dashboard/StatsSection';
import { PostItsSection } from '@/components/dashboard/PostItsSection';
import { SessionsSection } from '@/components/dashboard/SessionsSection';
import { EstablishmentsSection } from '@/components/dashboard/EstablishmentsSection';
import { TutorsSection } from '@/components/dashboard/TutorsSection';
import { StudentsSection } from '@/components/dashboard/StudentsSection';
import { VolunteersSection } from '@/components/dashboard/VolunteersSection';
import { AdminsSection } from '@/components/dashboard/AdminsSection';
import { CalendarSection } from '@/components/dashboard/CalendarSection';
import { SessionsChartSection } from '@/components/dashboard/SessionsChartSection';
import { ResourcesChartSection } from '@/components/dashboard/ResourcesChartSection';
import { ReportsSection } from '@/components/dashboard/ReportsSection';
import { VscReportsSection } from '@/components/dashboard/VscReportsSection';
import { SubjectsSection } from '@/components/dashboard/SubjectsSection';
import { LevelsSection } from '@/components/dashboard/LevelsSection';
import { ProgramsSection } from '@/components/dashboard/ProgramsSection';
import { SchoolYearsSection } from '@/components/dashboard/SchoolYearsSection';
import { ActivityTypesSection } from '@/components/dashboard/ActivityTypesSection';
import { ActivitiesSection } from '@/components/dashboard/ActivitiesSection';
import { HolidaysSection } from '@/components/dashboard/HolidaysSection';
import { PairsSection } from '@/components/dashboard/PairsSection';
import {
  DropZoneBetweenRows,
  SourceRowPlaceholder,
  InlineDropPlaceholder,
} from '@/components/dashboard/DashboardDropZone';
import { Section } from '@/components/common/Section';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementWidth } from '@/types/interface-elements.types';
import { getSectionIcon } from '@/utils/section-icons';
import { getSectionIEResource } from '@/utils/dashboard-ie-utils';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import { getInterfaceElements } from '@/services/interface-elements.service';

export interface DashboardSection {
  id: string;
  title: string;
  type:
    | 'stats'
    | 'postits'
    | 'sessions'
    | 'pairs'
    | 'calendar'
    | 'sessions-chart'
    | 'resources-chart'
    | 'establishments'
    | 'tutors'
    | 'students'
    | 'volunteers'
    | 'admins'
    | 'reports'
    | 'vsc-reports'
    | 'subjects'
    | 'levels'
    | 'programs'
    | 'school-years'
    | 'activity-types'
    | 'activities'
    | 'holidays';
  order: number;
  width: ElementWidth;
  visible?: boolean;
}

interface VisualRow {
  sections: DashboardSection[];
  totalCols: number;
}

export interface DashboardLayoutProps {
  sections: DashboardSection[];
  onSectionsChange: (sections: DashboardSection[]) => void;
  editMode: boolean;
  previewMode?: boolean;
  scale?: number;
  onUnsavedChanges?: (hasChanges: boolean) => void;
  onToggleVisibility?: (sectionId: string) => void;
}

const getColSpan = (width: ElementWidth): number => {
  switch (width) {
    case 'full':
      return 12;
    case '2/3':
      return 8;
    case '1/2':
      return 6;
    case '1/3':
      return 4;
    default:
      return 12;
  }
};

const calculateRows = (sectionList: DashboardSection[]): VisualRow[] => {
  const rows: VisualRow[] = [];
  let currentRow: VisualRow = { sections: [], totalCols: 0 };

  for (const section of sectionList) {
    const cols = getColSpan(section.width);
    if (currentRow.totalCols + cols > 12 && currentRow.sections.length > 0) {
      rows.push(currentRow);
      currentRow = { sections: [section], totalCols: cols };
    } else {
      currentRow.sections.push(section);
      currentRow.totalCols += cols;
    }
  }

  if (currentRow.sections.length > 0) rows.push(currentRow);
  return rows;
};

const findRowIndex = (sectionId: string, rows: VisualRow[]): number =>
  rows.findIndex((row) => row.sections.some((s) => s.id === sectionId));

const calculateAllRowsPreview = (
  rows: VisualRow[],
  targetRowIdx: number,
  activeId: string,
): Record<string, ElementWidth> => {
  const newWidths: Record<string, ElementWidth> = {};

  rows.forEach((row, idx) => {
    if (idx === targetRowIdx) {
      const total = row.sections.length + 1;
      const w: ElementWidth = total >= 3 ? '1/3' : total === 2 ? '1/2' : 'full';
      row.sections.forEach((s) => {
        newWidths[s.id] = w;
      });
      newWidths[activeId] = w;
    } else {
      const w: ElementWidth =
        row.sections.length >= 3 ? '1/3' : row.sections.length === 2 ? '1/2' : 'full';
      row.sections.forEach((s) => {
        newWidths[s.id] = w;
      });
    }
  });

  return newWidths;
};

const buildSectionsFromRows = (intendedRows: DashboardSection[][]): DashboardSection[] => {
  const result: DashboardSection[] = [];

  intendedRows.forEach((row) => {
    const w: ElementWidth = row.length >= 3 ? '1/3' : row.length === 2 ? '1/2' : 'full';
    row.forEach((s) => result.push({ ...s, width: w }));
  });

  result.forEach((s, idx) => {
    s.order = idx;
  });

  return result;
};

const getLucideIcon = (iconName: string): LucideIcons.LucideIcon => {
  const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;
  return icons[iconName] || LucideIcons.HelpCircle;
};

const DashboardDragOverlayPortal: React.FC<{
  activeId: string | null;
  sections: DashboardSection[];
  getLucideIcon: (iconName: string) => LucideIcons.LucideIcon;
}> = ({ activeId, sections, getLucideIcon: getIcon }) => {
  const overlayPosition = useCustomDragOverlay(activeId);

  if (!activeId || !overlayPosition) return null;

  const activeSection = sections.find((s) => s.id === activeId);
  if (!activeSection) return null;

  const SectionIcon = getIcon(getSectionIcon(activeSection.type));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: overlayPosition.x,
        top: overlayPosition.y,
        zIndex: 9999,
        opacity: 0.8,
        transform: 'rotate(-3deg)',
        pointerEvents: 'none',
      }}
      className="bg-background border-2 border-primary rounded-xl p-4 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <SectionIcon className="h-6 w-6 text-primary" />
        <span className="font-semibold">{activeSection.title}</span>
      </div>
    </div>,
    document.body,
  );
};

const LazyRender: React.FC<{ children: React.ReactNode; interfaceName?: string }> = ({
  children,
  interfaceName,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  const isInterfaceLoaded = useInterfaceElementsStore((state) => state.isInterfaceLoaded);
  const isInterfaceLoading = useInterfaceElementsStore((state) => state.isInterfaceLoading);
  const startLoading = useInterfaceElementsStore((state) => state.startLoading);
  const finishLoading = useInterfaceElementsStore((state) => state.finishLoading);
  const setInterfaceElements = useInterfaceElementsStore((state) => state.setInterfaceElements);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);

          // Déclencher le chargement des IE si cette interface n'est pas encore dans le store
          if (
            interfaceName &&
            !isInterfaceLoaded(interfaceName) &&
            !isInterfaceLoading(interfaceName)
          ) {
            startLoading(interfaceName);
            getInterfaceElements(interfaceName)
              .then((data) => setInterfaceElements(interfaceName, data))
              .catch(() => finishLoading(interfaceName));
          }

          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    interfaceName,
    isInterfaceLoaded,
    isInterfaceLoading,
    startLoading,
    finishLoading,
    setInterfaceElements,
  ]);

  return <div ref={ref}>{visible ? children : <div style={{ minHeight: '350px' }} />}</div>;
};

const RowDroppable: React.FC<{ rowIdx: number }> = ({ rowIdx }) => {
  const { setNodeRef } = useDroppable({
    id: `row-droppable-${rowIdx}`,
    data: { type: 'row', rowIdx },
  });

  return (
    <div
      ref={setNodeRef}
      className="absolute pointer-events-auto"
      style={{
        zIndex: 10,
        top: '-8px',
        left: 0,
        right: 0,
        bottom: '-8px',
      }}
    />
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sections,
  onSectionsChange,
  editMode,
  previewMode = false,
  scale = 1,
  onUnsavedChanges,
  onToggleVisibility,
}) => {
  // Collision detection custom : privilégier les row-droppable par rapport aux drop-zone-after-row
  const customCollisionDetection: CollisionDetection = (args) => {
    // D'abord essayer pointerWithin pour une détection précise
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
      // Prioriser source-row-placeholder quand on survole la ligne source vide
      const sourcePlaceholder = pointerCollisions.find(({ id }) => id === 'source-row-placeholder');
      if (sourcePlaceholder) return [sourcePlaceholder];

      // Prioriser les zones inter-lignes sur les row-droppable (séparation géométrique garantie)
      const dropZone = pointerCollisions.find(({ id }) =>
        String(id).startsWith('drop-zone-after-row-'),
      );
      if (dropZone) return [dropZone];

      const rowDroppable = pointerCollisions.find(({ id }) =>
        String(id).startsWith('row-droppable-'),
      );
      if (rowDroppable) return [rowDroppable];
      return pointerCollisions;
    }

    // Sinon utiliser closestCenter comme fallback
    const centerCollisions = closestCenter(args);

    const rowDroppable = centerCollisions.find(({ id }) => String(id).startsWith('row-droppable-'));
    if (rowDroppable) return [rowDroppable];

    return centerCollisions;
  };
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [previewWidths, setPreviewWidths] = React.useState<Record<string, ElementWidth>>({});
  const [dropIndicator, setDropIndicator] = React.useState<{
    sectionId: string;
    position: 'left' | 'right';
  } | null>(null);
  const [dropPosition, setDropPosition] = React.useState<{
    targetRowIdx: number;
    insertIdx: number;
  } | null>(null);

  const sectionRectsSnapshot = React.useRef<Record<string, DOMRect>>({});
  const previewWidthsRef = React.useRef<Record<string, ElementWidth>>({});
  const dropPositionRef = React.useRef<{ targetRowIdx: number; insertIdx: number } | null>(null);
  const dropIndicatorRef = React.useRef<{
    sectionId: string;
    position: 'left' | 'right';
  } | null>(null);
  const cursorXRef = React.useRef<number>(0);

  // Refs pour le calcul continu de position (via pointermove) quand on est sur une ligne
  const activeIdRef = React.useRef<string | null>(null);
  const currentHoverRowIdxRef = React.useRef<number | null>(null);
  const currentHoverRowSectionCountRef = React.useRef<number>(0);
  const currentHoverRowSectionsRef = React.useRef<DashboardSection[]>([]);
  const sourceSectionHeightRef = React.useRef<number>(300);

  const setStablePreviewWidths = React.useCallback((newWidths: Record<string, ElementWidth>) => {
    if (JSON.stringify(newWidths) !== JSON.stringify(previewWidthsRef.current)) {
      previewWidthsRef.current = newWidths;
      setPreviewWidths(newWidths);
    }
  }, []);

  const setStablePreviewWidthsEmpty = React.useCallback(() => {
    if (Object.keys(previewWidthsRef.current).length > 0) {
      previewWidthsRef.current = {};
      setPreviewWidths({});
    }
  }, []);

  const setStableDropPosition = React.useCallback(
    (val: { targetRowIdx: number; insertIdx: number } | null) => {
      if (JSON.stringify(val) !== JSON.stringify(dropPositionRef.current)) {
        dropPositionRef.current = val;
        setDropPosition(val);
      }
    },
    [],
  );

  const setStableDropIndicator = React.useCallback(
    (val: { sectionId: string; position: 'left' | 'right' } | null) => {
      if (JSON.stringify(val) !== JSON.stringify(dropIndicatorRef.current)) {
        dropIndicatorRef.current = val;
        setDropIndicator(val);
      }
    },
    [],
  );

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      cursorXRef.current = e.clientX;

      // Recalculer insertIdx en continu pendant le drag sur une ligne
      const hoverRowIdx = currentHoverRowIdxRef.current;
      if (hoverRowIdx === null || !activeIdRef.current) return;

      const rowContainer = document.getElementById(`row-container-${hoverRowIdx}`);
      if (!rowContainer) return;

      const rect = rowContainer.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const layoutWidth = rect.width;
      const sectionCount = currentHoverRowSectionCountRef.current;
      const rowSections = currentHoverRowSectionsRef.current;

      let insertIdx: number;
      let indicatorSectionId: string;
      let indicatorPosition: 'left' | 'right';

      if (sectionCount === 1) {
        // Row = [Section (w-1/2)] [Dropzone (w-1/2)] avec gap-4 (16px)
        // Bord droit réel de la section = (layoutWidth - 16) / 2
        // → cursor dans la section = avant, cursor dans gap/dropzone = après
        const sectionRightEdge = (layoutWidth - 16) / 2;
        const before = relX < sectionRightEdge;
        insertIdx = before ? 0 : 1;
        indicatorPosition = before ? 'left' : 'right';
        indicatorSectionId = rowSections[0]?.id ?? '';
      } else if (sectionCount === 2) {
        // Sections rendues en w-1/3 : centre de A ≈ W/6, centre de B ≈ W/2
        // leftThreshold = bord droit de A (W/3) → tout A = zone "avant A"
        // rightThreshold = centre de B (W/2) → moitié droite de B = zone "après B"
        const leftThreshold = layoutWidth / 3;
        const rightThreshold = layoutWidth / 2;
        if (relX < leftThreshold) {
          insertIdx = 0;
          indicatorSectionId = rowSections[0]?.id ?? '';
          indicatorPosition = 'left';
        } else if (relX < rightThreshold) {
          insertIdx = 1;
          indicatorSectionId = rowSections[0]?.id ?? '';
          indicatorPosition = 'right';
        } else {
          insertIdx = 2;
          indicatorSectionId = rowSections[1]?.id ?? '';
          indicatorPosition = 'right';
        }
      } else {
        return;
      }

      if (
        dropPositionRef.current?.targetRowIdx !== hoverRowIdx ||
        dropPositionRef.current?.insertIdx !== insertIdx
      ) {
        dropPositionRef.current = { targetRowIdx: hoverRowIdx, insertIdx };
        setDropPosition({ targetRowIdx: hoverRowIdx, insertIdx });

        if (indicatorSectionId) {
          dropIndicatorRef.current = { sectionId: indicatorSectionId, position: indicatorPosition };
          setDropIndicator({ sectionId: indicatorSectionId, position: indicatorPosition });
        }
      }
    };
    // capture:true garantit que cursorXRef est à jour AVANT que dnd-kit (bubble) appelle handleDragOver
    window.addEventListener('pointermove', onMove, { capture: true });
    return () => window.removeEventListener('pointermove', onMove, { capture: true });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const resetDragState = React.useCallback(() => {
    setActiveId(null);
    activeIdRef.current = null;
    currentHoverRowIdxRef.current = null;
    previewWidthsRef.current = {};
    setPreviewWidths({});
    dropPositionRef.current = null;
    setDropPosition(null);
    dropIndicatorRef.current = null;
    setDropIndicator(null);
    document.body.classList.remove('is-dragging');
  }, []);

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      resetDragState();
      return;
    }

    const overId = over.id as string;
    const activeIdStr = active.id as string;

    // Drop sur la source-placeholder = remettre à sa place d'origine sans changement
    if (overId === 'source-row-placeholder') {
      resetDragState();
      return;
    }

    const newSections = ((currentSections: DashboardSection[]) => {
      const activeSection = currentSections.find((s) => s.id === activeIdStr);
      if (!activeSection) return currentSections;

      const sectionsWithoutActive = currentSections.filter((s) => s.id !== activeIdStr);
      const rowsWithoutActive = calculateRows(sectionsWithoutActive);

      // Gestion du drop sur row-droppable (nouveau système)
      if (overId.startsWith('row-droppable-')) {
        const dp = dropPositionRef.current;
        if (!dp) return currentSections;

        const targetRow = rowsWithoutActive[dp.targetRowIdx];
        if (!targetRow) return currentSections;

        const newTargetRow = [...targetRow.sections];
        newTargetRow.splice(dp.insertIdx, 0, activeSection);

        const intendedRows: DashboardSection[][] = rowsWithoutActive.map((row, idx) =>
          idx === dp.targetRowIdx ? newTargetRow : row.sections,
        );

        return buildSectionsFromRows(intendedRows);
      }

      if (overId.startsWith('drop-zone-after-row-')) {
        const afterRowIdx = Number.parseInt(overId.replace('drop-zone-after-row-', ''), 10);
        const intendedRows: DashboardSection[][] = [];

        if (afterRowIdx === -1) {
          intendedRows.push([activeSection]);
        }

        rowsWithoutActive.forEach((row, idx) => {
          intendedRows.push(row.sections);
          if (idx === afterRowIdx) intendedRows.push([activeSection]);
        });

        return buildSectionsFromRows(intendedRows);
      }

      const dp = dropPositionRef.current;
      if (!dp) return currentSections;

      const targetRow = rowsWithoutActive[dp.targetRowIdx];
      if (!targetRow) return currentSections;

      const newTargetRow = [...targetRow.sections];
      newTargetRow.splice(dp.insertIdx, 0, activeSection);

      const intendedRows: DashboardSection[][] = rowsWithoutActive.map((row, idx) =>
        idx === dp.targetRowIdx ? newTargetRow : row.sections,
      );

      return buildSectionsFromRows(intendedRows);
    })(sections);

    onSectionsChange(newSections);

    if (onUnsavedChanges) {
      onUnsavedChanges(true);
    }

    resetDragState();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      currentHoverRowIdxRef.current = null;
      setStablePreviewWidthsEmpty();
      setStableDropPosition(null);
      setStableDropIndicator(null);
      return;
    }

    const overId = over.id as string;
    const activeIdStr = active.id as string;
    activeIdRef.current = activeIdStr;

    // Survol de la source-placeholder : reset le preview
    if (overId === 'source-row-placeholder') {
      currentHoverRowIdxRef.current = null;
      setStablePreviewWidthsEmpty();
      setStableDropPosition(null);
      setStableDropIndicator(null);
      return;
    }

    const sectionsWithoutActive = sections.filter((s) => s.id !== activeIdStr);
    const rowsWithoutActive = calculateRows(sectionsWithoutActive);

    // Entrée sur une ligne : stocker le contexte et déléguer le calcul de position au pointermove
    if (overId.startsWith('row-droppable-')) {
      const rowIdx = Number.parseInt(overId.replace('row-droppable-', ''), 10);
      const targetRow = rowsWithoutActive[rowIdx];

      if (!targetRow || targetRow.sections.length >= 3) {
        currentHoverRowIdxRef.current = null;
        setStablePreviewWidthsEmpty();
        setStableDropPosition(null);
        setStableDropIndicator(null);
        return;
      }

      // Stocker le contexte de la ligne pour que pointermove puisse recalculer en continu
      currentHoverRowIdxRef.current = rowIdx;
      currentHoverRowSectionCountRef.current = targetRow.sections.length;
      currentHoverRowSectionsRef.current = targetRow.sections;

      // Mettre à jour les largeurs preview (identiques quel que soit insertIdx)
      setStablePreviewWidths(calculateAllRowsPreview(rowsWithoutActive, rowIdx, activeIdStr));

      // Calculer insertIdx depuis la position courante du curseur
      // Obligatoire pour que handleSectionDragEnd ait toujours un dropPositionRef valide
      const rowContainer = document.getElementById(`row-container-${rowIdx}`);
      if (rowContainer) {
        const rect = rowContainer.getBoundingClientRect();
        const relX = cursorXRef.current - rect.left;
        const layoutWidth = rect.width;
        const sectionCount = targetRow.sections.length;
        let insertIdx: number;
        if (sectionCount === 2) {
          const leftThreshold = layoutWidth / 3; // bord droit de A
          const rightThreshold = layoutWidth / 2; // centre de B
          if (relX < leftThreshold) insertIdx = 0;
          else if (relX < rightThreshold) insertIdx = 1;
          else insertIdx = 2;
        } else {
          // Bord droit réel de la section unique = (layoutWidth - 16) / 2
          insertIdx = relX < (layoutWidth - 16) / 2 ? 0 : 1;
        }
        setStableDropPosition({ targetRowIdx: rowIdx, insertIdx });
      }

      return;
    }

    if (overId.startsWith('drop-zone-after-row-')) {
      currentHoverRowIdxRef.current = null;
      const newWidths: Record<string, ElementWidth> = { [activeIdStr]: 'full' };

      rowsWithoutActive.forEach((row) => {
        const w: ElementWidth =
          row.sections.length >= 3 ? '1/3' : row.sections.length === 2 ? '1/2' : 'full';
        row.sections.forEach((s) => {
          newWidths[s.id] = w;
        });
      });

      setStablePreviewWidths(newWidths);
      setStableDropPosition(null);
      setStableDropIndicator(null);
    }
  };

  const handleResize = (sectionId: string, width: ElementWidth) => {
    const newSections = ((current: DashboardSection[]) => {
      const rows = calculateRows(current);
      const targetRow = rows.find((row) => row.sections.some((s) => s.id === sectionId));

      if (!targetRow) return current;

      if (targetRow.sections.length === 1) {
        return current.map((s) =>
          s.id === sectionId ? { ...s, width: 'full' as ElementWidth } : s,
        );
      }

      if (targetRow.sections.length >= 3) {
        return current.map((s) =>
          targetRow.sections.some((rs) => rs.id === s.id)
            ? { ...s, width: '1/3' as ElementWidth }
            : s,
        );
      }

      const otherSection = targetRow.sections.find((s) => s.id !== sectionId);
      if (!otherSection) return current;

      const complementaryWidth: Record<ElementWidth, ElementWidth> = {
        full: '1/3',
        '2/3': '1/3',
        '1/2': '1/2',
        '1/3': '2/3',
        auto: 'auto',
      };

      return current.map((s) => {
        if (s.id === sectionId) return { ...s, width };
        if (s.id === otherSection.id) return { ...s, width: complementaryWidth[width] };
        return s;
      });
    })(sections);

    onSectionsChange(newSections);

    if (onUnsavedChanges) {
      onUnsavedChanges(true);
    }
  };

  const renderSectionContent = (section: DashboardSection) => {
    if (previewMode) {
      const Icon = getLucideIcon(getSectionIcon(section.type));
      return (
        <div className="section-placeholder">
          <Icon size={48} />
          <h3>{section.title}</h3>
          <p className="text-muted">{section.type}</p>
        </div>
      );
    }

    switch (section.type) {
      case 'stats':
        return <StatsSection />;
      case 'postits':
        return <PostItsSection sectionWidth={section.width} />;
      case 'sessions':
        return <SessionsSection layoutWidth={section.width} />;
      case 'pairs':
        return <PairsSection layoutWidth={section.width} />;
      case 'establishments':
        return <EstablishmentsSection layoutWidth={section.width} />;
      case 'tutors':
        return <TutorsSection layoutWidth={section.width} />;
      case 'students':
        return <StudentsSection layoutWidth={section.width} />;
      case 'volunteers':
        return <VolunteersSection layoutWidth={section.width} />;
      case 'admins':
        return <AdminsSection layoutWidth={section.width} />;
      case 'calendar':
        return <CalendarSection />;
      case 'sessions-chart':
        return <SessionsChartSection />;
      case 'resources-chart':
        return <ResourcesChartSection />;
      case 'reports':
        return <ReportsSection layoutWidth={section.width} />;
      case 'vsc-reports':
        return <VscReportsSection layoutWidth={section.width} />;
      case 'subjects':
        return <SubjectsSection layoutWidth={section.width} />;
      case 'levels':
        return <LevelsSection layoutWidth={section.width} />;
      case 'programs':
        return <ProgramsSection layoutWidth={section.width} />;
      case 'school-years':
        return <SchoolYearsSection layoutWidth={section.width} />;
      case 'activity-types':
        return <ActivityTypesSection layoutWidth={section.width} />;
      case 'activities':
        return <ActivitiesSection layoutWidth={section.width} />;
      case 'holidays':
        return <HolidaysSection layoutWidth={section.width} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        autoScroll={{
          enabled: true,
          threshold: { x: 0.1, y: 0.15 },
          acceleration: 10,
          interval: 10,
        }}
        onDragEnd={handleSectionDragEnd}
        onDragStart={(event: DragStartEvent) => {
          const id = event.active.id as string;
          setActiveId(id);
          activeIdRef.current = id;
          document.body.classList.add('is-dragging');

          // Capturer la hauteur intrinsèque de la section (pas du wrapper étiré par flex)
          const activeEl = document.getElementById(id);
          if (activeEl) {
            sourceSectionHeightRef.current = activeEl.getBoundingClientRect().height;
          }
          if (!sourceSectionHeightRef.current) {
            sourceSectionHeightRef.current = 300;
          }

          sectionRectsSnapshot.current = {};
          sections.forEach((s) => {
            if (s.id !== id) {
              const el = document.getElementById(s.id);
              if (el) sectionRectsSnapshot.current[s.id] = el.getBoundingClientRect();
            }
          });
        }}
        onDragOver={handleDragOver}
        onDragCancel={resetDragState}
      >
        <SortableContext items={sections.map((s) => s.id)}>
          <DashboardDragOverlayPortal
            activeId={activeId}
            sections={sections}
            getLucideIcon={getLucideIcon}
          />
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {(() => {
              // Sections sans l'élément actif
              const sectionsWithoutActive = activeId
                ? sections.filter((s) => s.id !== activeId)
                : sections;
              const rows = calculateRows(sectionsWithoutActive);

              // Détecter si l'élément actif était seul sur sa ligne d'origine
              const rowsWithActive = activeId ? calculateRows(sections) : null;
              const srcRowIdxInAll =
                activeId && rowsWithActive ? findRowIndex(activeId, rowsWithActive) : -1;
              const activeWasAlone =
                srcRowIdxInAll >= 0 &&
                (rowsWithActive?.[srcRowIdxInAll]?.sections.length ?? 0) === 1;

              // Construire la liste ordonnée des éléments visuels à rendre
              type VisualItem =
                | { kind: 'drop-zone'; afterRowIdx: number }
                | { kind: 'source-placeholder' }
                | { kind: 'row'; row: VisualRow; rowIdx: number };

              const visualItems: VisualItem[] = [];

              // dz-top : supprimer si la source était seule ET était la première ligne
              const suppressDzTop = activeWasAlone && srcRowIdxInAll === 0;
              if (!suppressDzTop) {
                visualItems.push({ kind: 'drop-zone', afterRowIdx: -1 });
              }

              if (activeWasAlone && rowsWithActive) {
                let withoutIdx = 0;
                for (let allIdx = 0; allIdx < rowsWithActive.length; allIdx++) {
                  if (allIdx === srcRowIdxInAll) {
                    visualItems.push({ kind: 'source-placeholder' });
                  } else {
                    const row = rows[withoutIdx];
                    if (row) {
                      visualItems.push({ kind: 'row', row, rowIdx: withoutIdx });
                      // Supprimer le dz si la prochaine ligne allIdx est la ligne source
                      // (la dz serait entre la dernière ligne réelle et le source-placeholder)
                      const nextIsSourceRow = allIdx + 1 === srcRowIdxInAll;
                      if (!nextIsSourceRow) {
                        visualItems.push({ kind: 'drop-zone', afterRowIdx: withoutIdx });
                      }
                      withoutIdx++;
                    }
                  }
                }
              } else {
                rows.forEach((row, idx) => {
                  visualItems.push({ kind: 'row', row, rowIdx: idx });
                  visualItems.push({ kind: 'drop-zone', afterRowIdx: idx });
                });
              }

              return visualItems.map((item) => {
                if (item.kind === 'drop-zone') {
                  return (
                    <DropZoneBetweenRows
                      key={`dz-${item.afterRowIdx}`}
                      afterRowIdx={item.afterRowIdx}
                      visible={editMode && !!activeId}
                    />
                  );
                }

                if (item.kind === 'source-placeholder') {
                  return (
                    <SourceRowPlaceholder
                      key="source-placeholder"
                      height={sourceSectionHeightRef.current}
                    />
                  );
                }

                const { row, rowIdx } = item;
                const canAcceptDrop = !!activeId && row.sections.length < 3;

                // Construire les items inline de la ligne (sections + éventuel drop-placeholder)
                type RowItem =
                  | { kind: 'section'; section: DashboardSection }
                  | { kind: 'drop-placeholder'; width: ElementWidth };

                const rowItems: RowItem[] = row.sections.map((s) => ({
                  kind: 'section' as const,
                  section: s,
                }));

                if (dropPosition?.targetRowIdx === rowIdx) {
                  const totalAfterInsert = row.sections.length + 1;
                  const w: ElementWidth = totalAfterInsert >= 3 ? '1/3' : '1/2';
                  rowItems.splice(dropPosition.insertIdx, 0, {
                    kind: 'drop-placeholder' as const,
                    width: w,
                  });
                }

                const widthClasses: Record<ElementWidth, string> = {
                  '1/3': 'w-1/3',
                  '1/2': 'w-1/2',
                  '2/3': 'w-2/3',
                  full: 'w-full',
                  auto: 'w-auto',
                };

                return (
                  <React.Fragment key={`row-${rowIdx}`}>
                    <div className="col-span-12 flex gap-4 relative" id={`row-container-${rowIdx}`}>
                      {canAcceptDrop && <RowDroppable rowIdx={rowIdx} />}
                      {rowItems.map((rItem) => {
                        if (rItem.kind === 'drop-placeholder') {
                          return (
                            <div
                              key="drop-placeholder"
                              className={cn('relative', widthClasses[rItem.width])}
                            >
                              <InlineDropPlaceholder height={sourceSectionHeightRef.current} />
                            </div>
                          );
                        }

                        const section = rItem.section;
                        const effectiveWidth = previewWidths[section.id] || section.width;
                        const isPreviewMode = !!previewWidths[section.id];
                        const rowSectionCount = row.sections.length;

                        return (
                          <div
                            key={section.id}
                            className={cn('relative', widthClasses[effectiveWidth])}
                          >
                            <Section
                              id={section.id}
                              globalEditMode={editMode}
                              isDraggingAny={!!activeId}
                              width={effectiveWidth}
                              previewMode={isPreviewMode}
                              dropIndicator={null}
                              rowSectionCount={rowSectionCount}
                              onResize={(width) => handleResize(section.id, width)}
                              isVisible={section.visible ?? true}
                              onToggleVisibility={
                                onToggleVisibility
                                  ? () => onToggleVisibility(section.id)
                                  : undefined
                              }
                              className={cn(
                                activeId ? '' : 'transition-all duration-300',
                                editMode && 'animate-pulse-slow',
                              )}
                            >
                              <ErrorBoundary
                                fallback={
                                  <div className="p-8 text-center text-muted-foreground">
                                    Erreur de chargement de cette section
                                  </div>
                                }
                              >
                                {previewMode ? (
                                  renderSectionContent(section)
                                ) : (
                                  <LazyRender
                                    interfaceName={getSectionIEResource(section.type) ?? undefined}
                                  >
                                    {renderSectionContent(section)}
                                  </LazyRender>
                                )}
                              </ErrorBoundary>
                            </Section>
                          </div>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
