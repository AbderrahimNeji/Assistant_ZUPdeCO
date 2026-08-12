import * as React from 'react';
import { DashboardLayout, type DashboardSection } from './DashboardLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import { Layout } from 'lucide-react';
import { usePreferencesConfig } from '@/hooks/usePreferencesConfig';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { useAuthStore } from '@/stores/authStore';
import type { ElementWidth } from '@/types/interface-elements.types';

export const DashboardPage: React.FC = () => {
  const { config: dashboardConfig, saveConfig } = usePreferencesConfig('dashboard');
  const { elements: sidebarMenus, isLoading: sidebarLoading } = useInterfaceElements('sidebar');
  const [sections, setSections] = React.useState<DashboardSection[]>([]);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const initialSectionsRef = React.useRef<DashboardSection[]>([]);

  // Reset initialization when user/roles change (forces re-filter on login/logout)
  const userRoles = useAuthStore((state) => state.roles);
  React.useEffect(() => {
    setIsInitialized(false);
  }, [userRoles]);

  React.useEffect(() => {
    // Attendre que sidebar soit chargé avant de filtrer les sections
    if (isInitialized || sidebarLoading) return;

    const allSections: DashboardSection[] = [
      {
        id: 'section-stats',
        title: 'Statistiques',
        type: 'stats',
        order: 0,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-postits',
        title: 'Post-its',
        type: 'postits',
        order: 1,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-sessions',
        title: 'Séances',
        type: 'sessions',
        order: 2,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-pairs',
        title: 'Binômes',
        type: 'pairs',
        order: 3,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-calendar',
        title: 'Calendrier',
        type: 'calendar',
        order: 4,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-sessions-chart',
        title: 'Graphique Séances',
        type: 'sessions-chart',
        order: 5,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-resources-chart',
        title: 'Graphique Ressources',
        type: 'resources-chart',
        order: 6,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-establishments',
        title: 'Établissements',
        type: 'establishments',
        order: 7,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-tutors',
        title: 'Tuteurs',
        type: 'tutors',
        order: 8,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-students',
        title: 'Élèves',
        type: 'students',
        order: 9,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-volunteers',
        title: 'Bénévoles',
        type: 'volunteers',
        order: 10,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-admins',
        title: 'Administrateurs',
        type: 'admins',
        order: 11,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-reports',
        title: 'Rapports',
        type: 'reports',
        order: 12,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-vsc-reports',
        title: 'Rapports VSC',
        type: 'vsc-reports',
        order: 13,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-subjects',
        title: 'Matières',
        type: 'subjects',
        order: 14,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-levels',
        title: 'Niveaux',
        type: 'levels',
        order: 15,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-programs',
        title: 'Programmes',
        type: 'programs',
        order: 16,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-school-years',
        title: 'Années scolaires',
        type: 'school-years',
        order: 17,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-activity-types',
        title: "Types d'activités",
        type: 'activity-types',
        order: 18,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-activities',
        title: 'Activités',
        type: 'activities',
        order: 19,
        width: 'full',
        visible: true,
      },
      {
        id: 'section-holidays',
        title: 'Vacances',
        type: 'holidays',
        order: 20,
        width: 'full',
        visible: true,
      },
    ];

    const dashboardCfg = dashboardConfig as
      | {
          sections?: Array<{ id: string; order: number; width: ElementWidth; visible?: boolean }>;
        }
      | undefined;

    // Filtrer les sections selon les menus accessibles dans la sidebar
    const accessibleMenus = new Set(
      sidebarMenus
        .filter((el) => el.elementType === 'menu' && el.elementId.startsWith('menu-'))
        .map((el) => el.elementId.replace('menu-', '')),
    );

    let filteredSections = allSections.filter((section) => {
      // Stats, postits et charts : toujours visibles (pas de menu sidebar correspondant,
      // leur visibilité est gérée via les interface_elements du dashboard)
      if (
        section.type === 'stats' ||
        section.type === 'postits' ||
        section.type === 'sessions-chart' ||
        section.type === 'resources-chart'
      )
        return true;

      // Pour les autres sections : vérifier si le menu correspondant est accessible
      return accessibleMenus.has(section.type);
    });

    if (dashboardCfg?.sections) {
      const savedSections = dashboardCfg.sections;
      filteredSections = filteredSections
        .map((section) => {
          const saved = savedSections.find((s) => s.id === section.id);
          return saved
            ? { ...section, order: saved.order, width: saved.width, visible: saved.visible ?? true }
            : section;
        })
        .sort((a, b) => a.order - b.order);
    }

    setSections(filteredSections);
    setIsInitialized(true);
  }, [isInitialized, sidebarLoading, dashboardConfig, sidebarMenus]);

  const handleOpenModal = () => {
    initialSectionsRef.current = [...sections];
    setShowLayoutModal(true);
    setHasUnsavedChanges(false);
  };

  const handleCancelModal = () => {
    if (initialSectionsRef.current.length > 0) {
      setSections(initialSectionsRef.current);
    }
    setShowLayoutModal(false);
    setHasUnsavedChanges(false);
  };

  const handleToggleVisibility = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, visible: !(s.visible ?? true) } : s)),
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveModal = () => {
    saveConfig({
      sections: sections.map((s) => ({
        id: s.id,
        order: s.order,
        width: s.width,
        visible: s.visible ?? true,
      })),
    });
    setShowLayoutModal(false);
    setHasUnsavedChanges(false);
  };

  // Trier les sections pour le modal : visibles d'abord, cachées en bas
  const sortedSectionsForModal = React.useMemo(() => {
    return [...sections].sort((a, b) => {
      const aVisible = a.visible ?? true;
      const bVisible = b.visible ?? true;
      if (aVisible === bVisible) return 0;
      return aVisible ? -1 : 1;
    });
  }, [sections]);

  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Erreur de chargement du dashboard</h2>
          <p className="text-muted-foreground">
            Une erreur est survenue lors du chargement du dashboard.
          </p>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        {/* Bouton pour ouvrir la modal */}
        <div className="flex justify-end">
          <Button icon={Layout} onClick={handleOpenModal} variant="outline" size="lg">
            Ajuster mes widgets
          </Button>
        </div>

        {/* Vue normale (page) */}
        <DashboardLayout
          sections={sections.filter((s) => s.visible !== false)}
          onSectionsChange={setSections}
          editMode={false}
          previewMode={false}
          scale={1}
        />

        {/* Modal d'édition */}
        <BaseModal
          open={showLayoutModal}
          onClose={handleCancelModal}
          size="xl"
          className="dashboard-editor-modal"
          hideContentWrapper={true}
          header={{
            title: 'Éditer la disposition du dashboard',
            titleSize: 'lg',
          }}
          footer={
            <div className="flex gap-2 justify-end w-full">
              <Button preset="modal-cancel" onClick={handleCancelModal}>
                Annuler
              </Button>
              <Button
                preset="modal-confirm"
                onClick={handleSaveModal}
                disabled={!hasUnsavedChanges}
              >
                Sauvegarder
              </Button>
            </div>
          }
        >
          <div className="dashboard-editor-container">
            <DashboardLayout
              sections={sortedSectionsForModal}
              onSectionsChange={setSections}
              editMode={true}
              previewMode={true}
              scale={1}
              onUnsavedChanges={setHasUnsavedChanges}
              onToggleVisibility={handleToggleVisibility}
            />
          </div>
        </BaseModal>
      </div>
    </ErrorBoundary>
  );
};
