import * as React from 'react';
import { NotepadText, Building2, UserCog, User, Mail } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { toast } from '@/lib/toast';
import { getAdmin, getManagers } from '@/services/users.service';
import { updateAdmin } from '@/services/admins.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useEnrichEstablishmentLabels } from '@/hooks/useEnrichEstablishmentLabels';
import { useAuthStore } from '@/stores/authStore';
import type { UpdateAdminDto } from '@/types/admin.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { adminEditValidationSchema } from '@/utils/validation-schemas';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { resolveStoredContact, phoneToE164 } from '@/utils/phone-contact-utils';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { RegenerateInvitationButton } from '@/components/common/RegenerateInvitationButton';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { getEditableRoles } from '@/utils/interface-hierarchy';
import { buildCreatableRoleOptions } from '@/utils/creatable-role-options';

interface EditAdminViewProps {
  adminId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditAdminView: React.FC<EditAdminViewProps> = ({ adminId, onClose, onSuccess }) => {
  const [formData, setFormData] = React.useState<UpdateAdminDto>({});
  const defaultCountry = useDefaultPhoneCountry();
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<string>(defaultCountry);

  const validation = useFormValidation(adminEditValidationSchema);
  const { elements: adminElements = [] } = useInterfaceElements('admins');

  const { data: admin, isLoading } = useQuery({
    queryKey: ['admins', adminId],
    queryFn: () => getAdmin(adminId),
    refetchOnMount: 'always',
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => import('@/services/users.service').then((m) => m.getRoles()),
  });

  const isManagerRole = React.useMemo(() => {
    if (formData.roleIds && formData.roleIds.length > 0) {
      const selectedRoles = roles.filter((r) => formData.roleIds.includes(r.id));
      return selectedRoles.some((r) => r.code === 'manager');
    }
    if (!admin?.userRoles?.length) return false;
    return admin.userRoles.some((ur) => ur.role.code === 'manager');
  }, [admin, formData.roleIds, roles]);

  const isCoordinatorRole = React.useMemo(() => {
    if (formData.roleIds && formData.roleIds.length > 0) {
      const selectedRoles = roles.filter((r) => formData.roleIds.includes(r.id));
      return selectedRoles.some((r) => r.code === 'coordinator');
    }
    if (!admin?.userRoles?.length) return false;
    return admin.userRoles.some((ur) => ur.role.code === 'coordinator');
  }, [admin, formData.roleIds, roles]);

  const { user: currentUser, roles: currentUserRoles } = useAuthStore();
  const currentUserRoleCode = currentUserRoles?.[0]?.code;
  const currentUserId = currentUser?.id;

  const { data: managersResponse } = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () => getManagers({ pageSize: 100 }),
    enabled: isCoordinatorRole,
  });
  const managers = managersResponse?.data || [];

  // Logique pour récupérer les établissements
  const establishmentSourceUserId = React.useMemo(() => {
    if (currentUserRoleCode === 'manager' && isCoordinatorRole) {
      return currentUserId;
    }
    return undefined;
  }, [currentUserRoleCode, currentUserId, isCoordinatorRole]);

  const { data: scopedEstablishmentsResponse } = useQuery({
    queryKey: ['users', 'establishments', establishmentSourceUserId],
    queryFn: async () => {
      const id = establishmentSourceUserId;
      if (!id) {
        return { data: [] };
      }
      const user = await getAdmin(id);
      return {
        data: user.userEstablishments?.map((ue) => ue.establishment) || [],
      };
    },
    enabled: !!(isManagerRole || isCoordinatorRole) && !!establishmentSourceUserId,
  });
  const scopedEstablishments = scopedEstablishmentsResponse?.data || [];

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
    primeLabelCache: primeEstabLabelCache,
  } = useEstablishmentsMultiselect();

  useEnrichEstablishmentLabels(formData.establishmentIds || [], primeEstabLabelCache);

  React.useEffect(() => {
    if (admin) {
      // Pré-remplir les établissements dans le cache
      if (admin.userEstablishments) {
        const labelEntries = admin.userEstablishments
          .filter((ue) => ue.establishment?.id && ue.establishment?.name)
          .map((ue) => ({
            id: ue.establishment.id,
            name: ue.establishment.name,
          }));
        primeEstabLabelCache(labelEntries);
      }

      // Résoudre le contact
      const stored = resolveStoredContact(admin.email ?? null, admin.phone ?? null);

      const initialData = {
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        displayName: admin.displayName || '',
        // Pour le phone éditable séparé, utiliser la valeur localisée si identifiant principal est phone
        phone: stored.mode === 'phone' ? stored.displayValue : admin.phone || '',
        status: normalizeStaffAccountStatus(String(admin.status)),
        roleIds: admin.userRoles?.map((ur) => ur.roleId) || [],
        managedById: (admin as any).managedById || '',
        establishmentIds: admin.userEstablishments?.map((ue) => ue.establishmentId) || [],
      };

      setFormData(initialData);
      setPhoneCountryCode(stored.isoCode);
      validation.validateInitialFormData(initialData);
    }
  }, [admin, primeEstabLabelCache]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateAdminDto) => updateAdmin(adminId, dto),
    onSuccess: () => {
      const roleLabel = admin?.userRoles?.[0]?.role?.label || 'Administrateur';
      toast.success(`${roleLabel} modifié avec succès !`);
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification');
    },
  });

  const handleFieldChange = (field: keyof UpdateAdminDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...formData, [field]: value };

    if (field === 'phone') {
      validation.validateField(field, value, {
        ...updatedData,
        _phoneCountryCode: phoneCountryCode,
      });
    } else {
      validation.validateField(field, value, updatedData);
    }

    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm(formData);

    if (!isValid) {
      return;
    }

    const roleIdsToSend =
      formData.roleIds && formData.roleIds.length > 0 ? formData.roleIds : undefined;

    const dto: UpdateAdminDto = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      displayName: formData.displayName || undefined,
      phone: formData.phone ? phoneToE164(formData.phone, phoneCountryCode) : undefined,
      status: formData.status,
      roleIds: roleIdsToSend,
      managedById: formData.managedById || undefined,
      establishmentIds:
        formData.establishmentIds && formData.establishmentIds.length > 0
          ? formData.establishmentIds
          : undefined,
    };
    updateMutation.mutate(dto);
  };

  const isEmailUID = !!admin?.email;

  const adminRoleOptions = React.useMemo(
    () => buildCreatableRoleOptions(getEditableRoles(adminElements), roles),
    [adminElements, roles],
  );
  const isSingleRoleMode = adminRoleOptions.length <= 1;

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier un administrateur"
      subtitle="Modifiez les informations du collaborateur"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      <RegenerateInvitationButton
        userId={adminId}
        email={admin?.email}
        pendingActivation={admin?.pendingActivation}
      />

      <div className="form-section">
        <h4 className="form-section-title">
          <User className="w-4 h-4" />
          Informations personnelles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={formData.firstName || ''}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            placeholder="Ex: Marie"
            maxLength={100}
            state={validation.getFieldState('firstName')}
            error={validation.getFieldError('firstName')}
          />
          <Input
            label="Nom"
            value={formData.lastName || ''}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Ex: Martin"
            maxLength={100}
            state={validation.getFieldState('lastName')}
            error={validation.getFieldError('lastName')}
          />
          <Select
            label="Statut"
            value={formData.status || 'active'}
            onChange={(value) => handleFieldChange('status', value)}
            onBlur={() => handleBlur('status')}
            options={[
              { value: 'active', label: 'Actif' },
              { value: 'deactivated', label: 'Désactivé' },
            ]}
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <SmartContactInput
            label="Contact principal (identifiant)"
            value=""
            onContactChange={() => {}}
            disabled
            initialStoredEmail={admin?.email ?? null}
            initialStoredPhone={admin?.phone ?? null}
            labelTooltip="Si vous souhaitez modifier le contact principal, supprimez l'utilisateur puis recréez-le."
          />
          {isEmailUID ? (
            <PhoneInput
              label="Numéro de téléphone (contact secondaire, optionnel)"
              value={formData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              onCountryChange={(country) => setPhoneCountryCode(country.code)}
              countryCode={phoneCountryCode}
              state={validation.getFieldState('phone')}
              error={validation.getFieldError('phone')}
              helperText="Numéro de contact secondaire"
            />
          ) : (
            <Input
              type="text"
              label="Email (contact secondaire, optionnel)"
              value={formData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              icon={Mail}
              placeholder="Ex: contact@example.com"
              state={validation.getFieldState('email')}
              error={validation.getFieldError('email')}
              helperText="Email secondaire (le téléphone reste l'identifiant de connexion)"
            />
          )}
        </div>
      </div>

      {!isSingleRoleMode && (
        <div className="form-section">
          <h4 className="form-section-title">
            <NotepadText className="w-4 h-4" />
            Rôle(s)
          </h4>
          <MultiSelect
            label="Rôles"
            placeholder="Sélectionner les rôles"
            options={adminRoleOptions}
            value={formData.roleIds || []}
            onChange={(values) => handleFieldChange('roleIds', values)}
            onBlur={() => handleBlur('roleIds')}
            maxVisibleTags={3}
            required
            helperText="Sélectionnez les rôles administratifs (Admin, Coordinateur, Manager)"
            state={validation.getFieldState('roleIds')}
            error={validation.getFieldError('roleIds')}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Les rôles et profils associés seront automatiquement mis à jour
          </p>
        </div>
      )}

      {isCoordinatorRole && (
        <div className="form-section">
          <h4 className="form-section-title">
            <UserCog className="w-4 h-4" />
            Manager superviseur
          </h4>
          <Select
            label="Manager"
            placeholder="Sélectionner un manager"
            options={managers.map((m) => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName}`,
            }))}
            value={formData.managedById || ''}
            onChange={(value) => handleFieldChange('managedById', value)}
            onBlur={() => handleBlur('managedById')}
          />
        </div>
      )}

      {(isManagerRole || isCoordinatorRole) && (
        <div className="form-section">
          <h4 className="form-section-title">
            <Building2 className="w-4 h-4" />
            Établissements gérés
          </h4>
          {establishmentSourceUserId ? (
            <MultiSelect
              label="Établissements"
              placeholder="Sélectionner les établissements"
              options={scopedEstablishments
                .filter((e) => e != null)
                .map((e) => {
                  const uaiSuffix = e.uaiCode ? ` (${e.uaiCode})` : '';
                  return {
                    value: e.id,
                    label: `${e.name}${uaiSuffix}`,
                  };
                })}
              value={formData.establishmentIds || []}
              onChange={(values) => handleFieldChange('establishmentIds', values)}
              onBlur={() => handleBlur('establishmentIds')}
              maxVisibleTags={2}
              helperText="Établissements dont le manager a la gestion (optionnel)"
              state={validation.getFieldState('establishmentIds')}
              error={validation.getFieldError('establishmentIds')}
              placement="top"
            />
          ) : (
            <MultiSelect
              label="Établissements"
              placeholder="Rechercher un établissement..."
              options={getEstabOptions(formData.establishmentIds || [])}
              value={formData.establishmentIds || []}
              onChange={(values) => handleFieldChange('establishmentIds', values)}
              onBlur={() => handleBlur('establishmentIds')}
              onSearch={onEstabSearch}
              isSearchLoading={estabSearchLoading}
              searchPlaceholder="Rechercher un établissement..."
              minSearchLength={2}
              maxVisibleTags={2}
              showSelectAll={false}
              helperText={ESTABLISHMENT_SEARCH_HINT}
              state={validation.getFieldState('establishmentIds')}
              error={validation.getFieldError('establishmentIds')}
              placement="top"
            />
          )}
        </div>
      )}
    </SlidePanelForm>
  );
};
