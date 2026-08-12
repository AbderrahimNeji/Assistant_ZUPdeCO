import * as React from 'react';
import { Shield, Palette, Lock } from 'lucide-react';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { IconPicker } from '@/components/forms/IconPicker';
import { ColorPicker } from '@/components/forms/ColorPicker';
import { RolePermissionsBuilder } from './permissions/RolePermissionsBuilder';
import { convertLegacyBindingsToRules, convertRulesToLegacyBindings } from './bindings-adapter';
import type { RoleBinding } from './RoleAccessMatrix';
import {
  useRole,
  useUpdateRole,
  useRoleGroups,
  useRoleInterfaceBindings,
  useReplaceRoleBindings,
} from '@/hooks/useRoles';
import type { UpdateRolePayload, RoleMode, RoleStatus, RoleBindingRules } from '@/types/role.types';
import { getAllInterfaceElementsForBuilder } from '@/services/interface-elements.service';
import { useInterfaceElementsStore } from '@/stores/interfaceElementsStore';
import { toast } from '@/lib/toast';

interface EditRoleViewProps {
  roleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditRoleView: React.FC<EditRoleViewProps> = ({ roleId, onClose, onSuccess }) => {
  const { data: role, isLoading } = useRole(roleId);
  const { data: existingBindings, isLoading: loadingBindings } = useRoleInterfaceBindings(roleId);
  const { mutateAsync, isPending } = useUpdateRole();
  const { mutateAsync: replaceBindings, isPending: replacingBindings } = useReplaceRoleBindings();
  const { data: roleGroups = [] } = useRoleGroups();

  const [form, setForm] = React.useState({
    label: '',
    description: '',
    roleGroup: '',
    hierarchyLevel: '',
    icon: '',
    color: '',
    mode: '' as '' | RoleMode,
    status: 'active' as RoleStatus,
    bindings: {} as Record<string, RoleBindingRules>,
  });

  const [interfaceElements, setInterfaceElements] = React.useState<Record<string, any[]>>({});

  React.useEffect(() => {
    const loadElements = async () => {
      const elements = await getAllInterfaceElementsForBuilder();
      setInterfaceElements(elements);
    };
    loadElements();
  }, []);

  React.useEffect(() => {
    if (role && existingBindings !== undefined && Object.keys(interfaceElements).length > 0) {
      // Convert legacy bindings to new rules format
      const legacyBindings: RoleBinding[] = existingBindings.map((b) => ({
        elementId: b.elementId,
        enabled: true,
        visibilityScope: b.visibilityScope || null,
      }));

      const rulesBindings = convertLegacyBindingsToRules(legacyBindings, interfaceElements);

      setForm({
        label: role.label ?? '',
        description: role.description ?? '',
        roleGroup: role.roleGroup ?? '',
        hierarchyLevel: role.hierarchyLevel == null ? '' : String(role.hierarchyLevel),
        icon: role.icon ?? '',
        color: role.color ?? '',
        mode: role.mode ?? '',
        status: role.status ?? 'active',
        bindings: rulesBindings,
      });
    }
  }, [role, existingBindings, interfaceElements]);

  const handleFieldChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = form.label.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      // 1. Mettre à jour les champs métier du rôle
      const payload: UpdateRolePayload = {
        label: form.label,
        status: form.status || 'active',
      };
      if (form.description !== undefined) payload.description = form.description;
      if (form.roleGroup) payload.roleGroup = form.roleGroup;
      if (form.hierarchyLevel !== '') payload.hierarchyLevel = Number(form.hierarchyLevel);
      if (form.icon) payload.icon = form.icon;
      if (form.color) payload.color = form.color;
      if (form.mode) payload.mode = form.mode as RoleMode;

      await mutateAsync({ id: roleId, payload });

      // 2. Mettre à jour les bindings (accès)
      // Convert rules back to legacy format for the API
      const legacyBindings = convertRulesToLegacyBindings(form.bindings, interfaceElements);
      await replaceBindings({ roleId, bindings: legacyBindings });

      toast.success('Rôle et accès mis à jour avec succès !');
      onSuccess?.();
      // Forcer le re-fetch de tous les IE (sidebar, tabs parent, etc.)
      useInterfaceElementsStore.getState().clearElements();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Une erreur est survenue');
    }
  };

  const groupOptions = React.useMemo(
    () => [
      { value: '', label: 'Aucun groupe' },
      ...roleGroups.map((g) => ({ value: g.code, label: g.label })),
    ],
    [roleGroups],
  );

  const statusOptions = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
  ];

  const modeOptions = [
    { value: '', label: 'Non défini' },
    { value: 'in_person', label: 'Présentiel' },
    { value: 'remote', label: 'Distanciel' },
    { value: 'hybrid', label: 'Hybride' },
  ];

  if (!isLoading && role?.isSystem) {
    return (
      <CollapseReplaceForm
        formType="edit"
        title={role.label}
        subtitle="Ce rôle système ne peut pas être modifié."
        onClose={onClose}
        onSubmit={onClose}
        submitLabel="Fermer"
        isSubmitting={false}
        isValid={true}
      >
        <p className="text-sm text-muted-foreground">
          Les rôles système sont gérés automatiquement et ne peuvent pas être modifiés manuellement.
        </p>
      </CollapseReplaceForm>
    );
  }

  return (
    <CollapseReplaceForm
      formType="edit"
      title="Modifier le rôle"
      subtitle={role?.label}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={isPending}
      isValid={isValid}
      isLoading={isLoading || !role}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <Shield className="w-4 h-4" />
          Informations générales
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Libellé"
            required
            value={form.label}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            placeholder="Ex: Professeur"
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Description du rôle (optionnel)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Groupe de rôles"
            value={form.roleGroup}
            onChange={(value) => handleFieldChange('roleGroup', value)}
            options={groupOptions}
            placeholder="Sélectionner un groupe"
          />
          <Input
            label="Niveau hiérarchique"
            type="number"
            value={form.hierarchyLevel}
            onChange={(e) => handleFieldChange('hierarchyLevel', e.target.value)}
            placeholder="Ex: 10"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Statut"
            value={form.status}
            onChange={(value) => handleFieldChange('status', value as RoleStatus)}
            options={statusOptions}
          />
          <Select
            label="Mode opérationnel"
            value={form.mode}
            onChange={(value) => handleFieldChange('mode', value as '' | RoleMode)}
            options={modeOptions}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Palette className="w-4 h-4" />
          Apparence
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <p className="form-label">Icône</p>
            <IconPicker
              value={form.icon || null}
              onChange={(icon) => handleFieldChange('icon', icon)}
            />
          </div>
          <div className="form-field">
            <p className="form-label">Couleur</p>
            <ColorPicker
              value={form.color || null}
              onChange={(color) => handleFieldChange('color', color)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Lock className="w-4 h-4" />
          Accès et permissions
        </h4>
        <RolePermissionsBuilder
          value={form.bindings}
          onChange={(bindings) => handleFieldChange('bindings', bindings)}
          mode={form.mode || undefined}
          hierarchyLevel={form.hierarchyLevel !== '' ? Number(form.hierarchyLevel) : undefined}
          roleGroup={form.roleGroup || undefined}
          disabled={isPending || replacingBindings}
        />
      </div>
    </CollapseReplaceForm>
  );
};
