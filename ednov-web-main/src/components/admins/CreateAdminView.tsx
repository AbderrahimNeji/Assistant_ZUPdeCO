import * as React from 'react';
import { NotepadText, User, Building2, UserCog, Mail } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { Select } from '@/components/forms/Select';
import { useFormValidation } from '@/hooks/useFormValidation';
import { adminCreateValidationSchema } from '@/utils/validation-schemas';
import { createAdmin } from '@/services/admins.service';
import { getRoles, getManagers, getAdmin } from '@/services/users.service';
import { useEstablishmentsMultiselect } from '@/hooks/useEstablishmentsMultiselect';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { useAuthStore } from '@/stores/authStore';
import { getCreatableRoles } from '@/utils/interface-hierarchy';
import { buildCreatableRoleOptions } from '@/utils/creatable-role-options';
import { findRoleByCode } from '@/utils/find-role-by-code';
import type { CreateAdminDto } from '@/types/admin.types';
import { toast } from '@/lib/toast';
import { phoneToE164 } from '@/utils/phone-contact-utils';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface CreateAdminViewProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialRole?: string;
}

export const CreateAdminView: React.FC<CreateAdminViewProps> = ({
  onClose,
  onSuccess,
  initialRole,
}) => {
  const validation = useFormValidation(adminCreateValidationSchema);

  const { elements: adminElements = [] } = useInterfaceElements('admins');
  const defaultCountry = useDefaultPhoneCountry();

  const availableRoles = React.useMemo(() => {
    return getCreatableRoles(adminElements);
  }, [adminElements]);

  const isSingleRoleMode = availableRoles.length <= 1;

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const [adminData, setAdminData] = React.useState({
    contact: '',
    contactType: 'unknown' as 'email' | 'phone' | 'unknown',
    contactCountryCode: defaultCountry,
    secondaryContact: '',
    secondaryContactCountryCode: defaultCountry,
    firstName: '',
    lastName: '',
    displayName: '',
    roleIds: [] as string[],
    establishmentIds: [] as string[],
    managedById: undefined as string | undefined,
    status: 'active',
  });

  React.useEffect(() => {
    if (initialRole && roles.length > 0) {
      const matchingRole = findRoleByCode(roles, initialRole);
      if (matchingRole) {
        const newRoleIds = [matchingRole.id];
        setAdminData((prev) => ({ ...prev, roleIds: newRoleIds }));
        validation.validateField('roleIds', newRoleIds, { ...adminData, roleIds: newRoleIds });
      }
    }

    // Si mode 1 seul rôle et aucun rôle sélectionné, pré-remplir
    if (isSingleRoleMode && availableRoles.length === 1 && adminData.roleIds.length === 0) {
      const roleCode = availableRoles[0].value;
      const matchingRole = findRoleByCode(roles, roleCode);
      if (matchingRole) {
        const newRoleIds = [matchingRole.id];
        setAdminData((prev) => ({ ...prev, roleIds: newRoleIds }));
        validation.validateField('roleIds', newRoleIds, { ...adminData, roleIds: newRoleIds });
      }
    }
  }, [initialRole, roles, isSingleRoleMode, availableRoles, adminData.roleIds.length]);

  const selectedRoleCodes = React.useMemo(() => {
    if (adminData.roleIds.length === 0) return [];
    return roles.filter((r) => adminData.roleIds.includes(r.id)).map((r) => r.code);
  }, [adminData.roleIds, roles]);

  const isManagerRole = selectedRoleCodes.includes('manager');
  const isCoordinatorRole = selectedRoleCodes.includes('coordinator');

  const { user: currentUser, roles: currentUserRoles } = useAuthStore();
  const currentUserRoleCode = currentUserRoles?.[0]?.code;
  const currentUserId = currentUser?.id;

  // Query managers si Coordinator sélectionné
  const { data: managersResponse } = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () => getManagers({ pageSize: 100 }),
    enabled: isCoordinatorRole,
  });
  const managers = managersResponse?.data || [];

  // Logique pour déterminer quel ID utiliser pour récupérer les établissements
  const establishmentSourceUserId = React.useMemo(() => {
    // Manager connecté → utilise ses propres établissements
    if (currentUserRoleCode === 'manager') {
      return currentUserId;
    }
    // Admin connecté + Coordinator sélectionné + managedBy choisi → établissements du manager choisi
    if (currentUserRoleCode === 'admin' && isCoordinatorRole && adminData.managedById) {
      return adminData.managedById;
    }
    return undefined;
  }, [currentUserRoleCode, currentUserId, isCoordinatorRole, adminData.managedById]);

  // Charge les établissements scopés
  const { data: scopedEstablishmentsResponse } = useQuery({
    queryKey: ['users', establishmentSourceUserId, 'establishments'],
    queryFn: async () => {
      if (!establishmentSourceUserId) {
        return { data: [] };
      }
      const user = await getAdmin(establishmentSourceUserId);
      return {
        data: user.userEstablishments?.map((ue) => ue.establishment) || [],
      };
    },
    enabled: !!establishmentSourceUserId,
  });
  const scopedEstablishments = scopedEstablishmentsResponse?.data || [];

  const {
    isLoading: estabSearchLoading,
    onSearch: onEstabSearch,
    getOptionsForValues: getEstabOptions,
  } = useEstablishmentsMultiselect();

  const createMutation = useMutation({
    mutationFn: (dto: CreateAdminDto) => createAdmin(dto),
    onSuccess: () => {
      const roleLabel = roles.find((r) => r.id === adminData.roleIds[0])?.label || 'Administrateur';
      toast.success(`${roleLabel} créé avec succès !`);
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const handleFieldChange = (field: keyof typeof adminData, value: any) => {
    setAdminData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...adminData, [field]: value };

    if (field === 'contact') {
      validation.validateField(field, value, {
        ...updatedData,
        _contactType: adminData.contactType,
        _phoneCountryCode: adminData.contactCountryCode,
      });
    } else {
      validation.validateField(field, value, updatedData);
    }

    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleContactChange = (
    value: string,
    type: 'email' | 'phone' | 'unknown',
    countryCode?: string,
  ) => {
    // Détecter si le type change pour reset le contact secondaire
    const typeChanged =
      type !== 'unknown' && adminData.contactType !== 'unknown' && type !== adminData.contactType;

    setAdminData((prev) => ({
      ...prev,
      contact: value,
      contactType: type,
      contactCountryCode: countryCode || prev.contactCountryCode,
      // Reset secondaire si type change
      secondaryContact: typeChanged ? '' : prev.secondaryContact,
      secondaryContactCountryCode: typeChanged ? defaultCountry : prev.secondaryContactCountryCode,
    }));

    validation.validateField('contact', value, {
      ...adminData,
      contact: value,
      _contactType: type,
      _phoneCountryCode: countryCode || adminData.contactCountryCode,
    });

    validation.markAsTouched('contact');
    validation.markAsDirty('contact');
  };

  const handleSecondaryContactChange = (value: string) => {
    setAdminData((prev) => ({ ...prev, secondaryContact: value }));

    validation.validateField('secondaryContact', value, {
      ...adminData,
      secondaryContact: value,
      _contactType: adminData.contactType,
    });

    validation.markAsTouched('secondaryContact');
    validation.markAsDirty('secondaryContact');
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm({
      ...adminData,
      _contactType: adminData.contactType,
      _phoneCountryCode: adminData.contactCountryCode,
    });

    if (!isValid) {
      return;
    }

    // Dériver inviteBy du type de contact
    const inviteBy = adminData.contactType === 'email' ? 'email' : 'phone';

    const dto: CreateAdminDto = {
      inviteBy,
      email:
        adminData.contactType === 'email'
          ? adminData.contact
          : adminData.secondaryContact?.trim() || undefined,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      phone:
        adminData.contactType === 'phone'
          ? phoneToE164(adminData.contact, adminData.contactCountryCode)
          : adminData.secondaryContact?.trim()
            ? phoneToE164(adminData.secondaryContact, adminData.secondaryContactCountryCode)
            : undefined,
      roleIds: adminData.roleIds,
      establishmentIds:
        adminData.establishmentIds.length > 0 ? adminData.establishmentIds : undefined,
      managedById: adminData.managedById,
    };
    createMutation.mutate(dto);
  };

  const adminRoleOptions = React.useMemo(
    () => buildCreatableRoleOptions(availableRoles, roles),
    [availableRoles, roles],
  );

  // Si Coordinator + Manager connecté, auto-assigner managedById
  React.useEffect(() => {
    if (isCoordinatorRole && currentUserRoleCode === 'manager' && currentUserId) {
      setAdminData((prev) => ({ ...prev, managedById: currentUserId }));
      validation.validateField('managedById', currentUserId, {
        ...adminData,
        managedById: currentUserId,
      });
    }
  }, [isCoordinatorRole, currentUserRoleCode, currentUserId]);

  const isSubmitting = createMutation.isPending;

  return (
    <SlidePanelForm
      formType="create"
      title="Créer un collaborateur"
      subtitle="Renseignez les informations du collaborateur"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={validation.isFormValid()}
    >
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
            value={adminData.roleIds}
            onChange={(values) => handleFieldChange('roleIds', values)}
            onBlur={() => handleBlur('roleIds')}
            helperText={
              initialRole
                ? 'Le rôle est pré-sélectionné'
                : 'Sélectionnez les rôles administratifs (Admin, Coordinateur, Manager)'
            }
            required
            state={validation.getFieldState('roleIds')}
            error={validation.getFieldError('roleIds')}
          />
        </div>
      )}

      <div className="form-section">
        <h4 className="form-section-title">
          <User className="w-4 h-4" />
          Informations personnelles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={adminData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            placeholder="Ex: Marie"
            maxLength={100}
            state={validation.getFieldState('firstName')}
            error={validation.getFieldError('firstName')}
          />
          <Input
            label="Nom"
            value={adminData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Ex: Martin"
            maxLength={100}
            state={validation.getFieldState('lastName')}
            error={validation.getFieldError('lastName')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <SmartContactInput
            label="Contact"
            value={adminData.contact}
            onContactChange={handleContactChange}
            onBlur={() => handleBlur('contact')}
            required
            state={validation.getFieldState('contact')}
            error={validation.getFieldError('contact')}
            helperText="Saisissez l'email ou le numéro de téléphone"
          />
          {adminData.contactType !== 'unknown' && (
            <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              {adminData.contactType === 'email' ? (
                <PhoneInput
                  label="Téléphone (contact secondaire, optionnel)"
                  value={adminData.secondaryContact}
                  onChange={(e) => handleSecondaryContactChange(e.target.value)}
                  onBlur={() => handleBlur('secondaryContact')}
                  countryCode={adminData.secondaryContactCountryCode}
                  onCountryChange={(c) =>
                    setAdminData((p) => ({ ...p, secondaryContactCountryCode: c.code }))
                  }
                  state={validation.getFieldState('secondaryContact')}
                  error={validation.getFieldError('secondaryContact')}
                  helperText="Numéro secondaire pour joindre cet administrateur"
                />
              ) : (
                <Input
                  type="text"
                  label="Email (contact secondaire, optionnel)"
                  value={adminData.secondaryContact}
                  onChange={(e) => handleSecondaryContactChange(e.target.value)}
                  onBlur={() => handleBlur('secondaryContact')}
                  icon={Mail}
                  placeholder="Ex: contact@example.com"
                  state={validation.getFieldState('secondaryContact')}
                  error={validation.getFieldError('secondaryContact')}
                  helperText="Email secondaire pour joindre cet administrateur"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {isCoordinatorRole && (
        <div className="form-section">
          <h4 className="form-section-title">
            <UserCog className="w-4 h-4" />
            Manager superviseur
          </h4>
          <Select
            label="Manager"
            placeholder="Sélectionner un manager (optionnel)"
            options={managers.map((m) => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName}`,
            }))}
            value={adminData.managedById}
            onChange={(value) => handleFieldChange('managedById', value)}
            disabled={currentUserRoleCode === 'manager'}
            helperText={
              currentUserRoleCode === 'manager'
                ? 'Vous serez automatiquement le manager de ce coordinateur'
                : 'Le manager qui supervisera ce coordinateur'
            }
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
                  const uaiCodeSuffix = e.uaiCode ? ` (${e.uaiCode})` : '';
                  return {
                    value: e.id,
                    label: `${e.name}${uaiCodeSuffix}`,
                  };
                })}
              value={adminData.establishmentIds}
              onChange={(values) => handleFieldChange('establishmentIds', values)}
              onBlur={() => handleBlur('establishmentIds')}
              maxVisibleTags={2}
              helperText="Établissements dont le manager aura la gestion (optionnel)"
              state={validation.getFieldState('establishmentIds')}
              error={validation.getFieldError('establishmentIds')}
              placement="top"
            />
          ) : (
            <MultiSelect
              label="Établissements"
              placeholder="Rechercher un établissement..."
              options={getEstabOptions(adminData.establishmentIds)}
              value={adminData.establishmentIds}
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
