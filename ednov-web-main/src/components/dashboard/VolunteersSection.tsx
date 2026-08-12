import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { VolunteersDataTable } from '@/components/volunteers/VolunteersDataTable';
import { useDetailsView } from '@/components/common/details/useDetailsView';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { usePageActions } from '@/hooks/usePageActions';
import { useRoles } from '@/hooks/useRoles';
import { getChildren } from '@/utils/interface-hierarchy';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { resolveBrandingColor } from '@/utils/branding';
import { cn } from '@/lib/utils';
import type { ElementWidth } from '@/types/interface-elements.types';

interface VolunteersSectionProps {
  layoutWidth?: ElementWidth;
  onSuccess?: () => void;
}

interface RoleToggleProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  color: string | null;
}

const RoleToggle: React.FC<RoleToggleProps> = ({ label, icon, isActive, onClick, color }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="custom"
          size="sm"
          onClick={onClick}
          style={
            color
              ? ({
                  '--role-color': color,
                } as React.CSSProperties)
              : undefined
          }
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
            'border-[var(--role-color,var(--border))] text-[var(--role-color,var(--foreground))]',
            isActive
              ? 'bg-[color-mix(in_srgb,var(--role-color,var(--primary))_15%,transparent)]'
              : 'bg-transparent hover:bg-[color-mix(in_srgb,var(--role-color,var(--primary))_8%,transparent)]',
          )}
        >
          {icon}
          <span>{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isActive ? `Masquer ${label}` : `Afficher ${label}`}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const VolunteersSection: React.FC<VolunteersSectionProps> = ({
  layoutWidth = 'full',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [enabledRoles, setEnabledRoles] = React.useState<string[]>([]);

  const { allElements: volunteerElements = [] } = useInterfaceElements('volunteers');
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('volunteers');
  const { data: allRoles = [] } = useRoles();
  const { openRowId, openRow, closeRow } = useDetailsView();

  const visibleTabs = React.useMemo(() => {
    const tabs = volunteerElements.filter((el) => el.elementType === 'tab');
    return [...tabs]
      .sort((a, b) => (a.userOrder ?? a.order ?? Infinity) - (b.userOrder ?? b.order ?? Infinity))
      .map((el) => {
        const roleCode = el.elementId.replace('tab-', '');
        const matchingRole = allRoles.find((r) => r.code === roleCode);
        return {
          roleCode,
          label: el.elementLabel,
          icon: matchingRole?.icon ?? (el.config?.icon as string | undefined),
          color: resolveBrandingColor(matchingRole?.color) ?? null,
        };
      });
  }, [volunteerElements, allRoles]);

  const showRoleToggles = visibleTabs.length > 1;

  React.useEffect(() => {
    if (visibleTabs.length === 1) {
      setEnabledRoles([visibleTabs[0].roleCode]);
    }
  }, [visibleTabs]);

  const toggleRole = (role: string) => {
    setEnabledRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleToggleAll = () => {
    if (enabledRoles.length === 0) return;
    setEnabledRoles([]);
  };

  const isAllActive = enabledRoles.length === 0;

  const handleCreateVolunteer = () => {
    navigate('/dashboard/volunteers?create=true');
  };

  const handleEditVolunteer = (id: string) => {
    navigate(`/dashboard/volunteers?edit=${id}`);
  };

  return (
    <div className="space-y-4">
      {showRoleToggles && (
        <div className="flex gap-2">
          <RoleToggle
            label="Tous"
            icon={<UserCog className="h-4 w-4" />}
            isActive={isAllActive}
            onClick={handleToggleAll}
            color={null}
          />
          {visibleTabs.map((tab) => (
            <RoleToggle
              key={tab.roleCode}
              label={tab.label}
              icon={<DynamicIcon name={tab.icon} className="h-4 w-4" />}
              isActive={enabledRoles.includes(tab.roleCode)}
              onClick={() => toggleRole(tab.roleCode)}
              color={tab.color}
            />
          ))}
        </div>
      )}

      <VolunteersDataTable
        enabledRoles={enabledRoles}
        showCreateButton={canCreate}
        isSection={true}
        layoutWidth={layoutWidth}
        expandedRowId={openRowId}
        onToggleRow={openRow}
        onCloseDetails={closeRow}
        onEditVolunteer={handleEditVolunteer}
        onCreateVolunteer={handleCreateVolunteer}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />
    </div>
  );
};
