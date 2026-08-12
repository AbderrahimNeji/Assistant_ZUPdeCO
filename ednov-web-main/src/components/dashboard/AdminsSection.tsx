import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { AdminsDataTable } from '@/components/admins/AdminsDataTable';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { usePageActions } from '@/hooks/usePageActions';
import { useRoles } from '@/hooks/useRoles';
import { getChildren } from '@/utils/interface-hierarchy';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { resolveBrandingColor } from '@/utils/branding';
import { cn } from '@/lib/utils';
import type { AdminRole } from '@/types/admin.types';
import type { ElementWidth } from '@/types/interface-elements.types';

interface AdminsSectionProps {
  onSuccess?: () => void;
  layoutWidth?: ElementWidth;
}

interface RoleToggleProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  colorClass: string;
}

const RoleToggle: React.FC<RoleToggleProps> = ({ label, icon, isActive, onClick, colorClass }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="custom"
          size="sm"
          onClick={onClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
            colorClass,
            isActive && `${colorClass}--active`,
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

export const AdminsSection: React.FC<AdminsSectionProps> = ({
  onSuccess,
  layoutWidth = 'full',
}) => {
  const navigate = useNavigate();
  const [enabledRoles, setEnabledRoles] = React.useState<AdminRole[]>([]);

  const { allElements: adminElements = [] } = useInterfaceElements('admins');
  const { canCreate, canEditRow, canDeleteRow, canExportCsv } = usePageActions('admins');
  const { data: allRoles = [] } = useRoles();

  const visibleTabs = React.useMemo(() => {
    const tabs = adminElements.filter((el) => el.elementType === 'tab');
    return [...tabs]
      .sort((a, b) => (a.userOrder ?? a.order ?? Infinity) - (b.userOrder ?? b.order ?? Infinity))
      .map((el) => {
        const roleCode = el.config.tabValue as string;
        const matchingRole = allRoles.find((r) => r.code === roleCode);
        return {
          id: roleCode as AdminRole,
          label: el.elementLabel,
          icon: matchingRole?.icon ?? (el.config.icon as string | undefined),
          color: resolveBrandingColor(matchingRole?.color),
        };
      });
  }, [adminElements, allRoles]);

  const showRoleToggles = visibleTabs.length > 1;

  React.useEffect(() => {
    if (visibleTabs.length === 1) {
      setEnabledRoles([visibleTabs[0].id]);
    }
  }, [visibleTabs]);

  const toggleRole = (role: AdminRole) => {
    setEnabledRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleToggleAll = () => {
    if (enabledRoles.length === 0) {
      return;
    }
    setEnabledRoles([]);
  };

  const isAllActive = enabledRoles.length === 0;

  const handleCreateAdmin = () => {
    navigate('/dashboard/admins?create=true');
  };

  const handleEditAdmin = (id: string) => {
    navigate(`/dashboard/admins?edit=${id}`);
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
            colorClass="admin-role-all"
          />
          {visibleTabs.map((tab) => (
            <RoleToggle
              key={tab.id}
              label={tab.label}
              icon={<DynamicIcon name={tab.icon} className="h-4 w-4" />}
              isActive={enabledRoles.includes(tab.id)}
              onClick={() => toggleRole(tab.id)}
              colorClass={`admin-role-${tab.id}`}
            />
          ))}
        </div>
      )}

      <AdminsDataTable
        enabledRoles={enabledRoles}
        layoutWidth={layoutWidth}
        isSection={true}
        onEditAdmin={handleEditAdmin}
        showCreateButton={canCreate}
        onCreateAdmin={handleCreateAdmin}
        pageActions={{ canEditRow, canDeleteRow, canExportCsv }}
      />
    </div>
  );
};
