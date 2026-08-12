import * as React from 'react';
import { useMemo } from 'react';
import {
  MapPin,
  Phone,
  Users,
  Building2,
  DoorOpen,
  UserCog,
  GraduationCap,
  BookOpen,
  Handshake,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { Input } from '@/components/forms/Input';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { DatePicker } from '@/components/forms/DatePicker';
import { RoomsGrid } from '@/components/forms/RoomsGrid';
import { ClassesGrid, type ClassDraft } from '@/components/forms/ClassesGrid';
import {
  ESTABLISHMENT_TYPES_WITH_CLASSES,
  PARTNER_RELATIONSHIP_QUALITY_OPTIONS,
  INVOLVEMENT_LEVEL_OPTIONS,
} from '@/components/establishments/establishment-configs';
import { ContactsGrid } from '@/components/forms/ContactsGrid';
import { Checkbox } from '@/components/forms/Checkbox';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { establishmentValidationSchema } from '@/utils/validation-schemas';
import { createEstablishment } from '@/services/establishments.service';
import { getSpecialties } from '@/services/specialties.service';
import { getCoordinators, getManagers } from '@/services/users.service';
import type {
  CreateEstablishmentDto,
  EstablishmentCategory,
  EstablishmentContact,
  EstablishmentPriorityNetwork,
  EstablishmentType,
  PartnerRelationshipQuality,
} from '@/types/establishment.types';
import type { Room } from '@/types/room.types';
import { toast } from '@/lib/toast';
import { addDaysToDateString } from '@/lib/date-utils';

interface CreateEstablishmentViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateEstablishmentView: React.FC<CreateEstablishmentViewProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user, isManager } = useConnectedUser();

  const validation = useFormValidation(establishmentValidationSchema);

  const [establishmentData, setEstablishmentData] = React.useState({
    uaiCode: '',
    name: '',
    officialName: '',
    type: '' as '' | EstablishmentType,
    establiCategory: '' as '' | EstablishmentCategory,
    priorityNetwork: '' as '' | EstablishmentPriorityNetwork,
    status: 'active' as 'active' | 'suspended' | 'closed',
    addressLine1: '',
    department: '',
    postalCode: '',
    city: '',
    country: 'FR',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contacts: [
      {
        contactName: '',
        contactEmail: '',
        contactPhone: '',
      },
    ] as EstablishmentContact[],
    volunteerQuota: '' as string | number,
    ipsValue: '' as string | number,
    isQpv: '' as '' | 'true' | 'false',
    renewalNextYear: '' as '' | 'true' | 'false',
    hasDevoirsFaits: '' as '' | 'true' | 'false',
    hasInternat: '' as '' | 'true' | 'false',
    involvementLevel: '',
    partnerRelationshipQuality: '',
    conventionSigned: '' as '' | 'true' | 'false',
    engagementStartDate: '',
    engagementEndDate: '',
    managedById: isManager && user ? user.id : '',
    coordinatorIds: [] as string[],
    rooms: [] as Room[],
    classes: [] as ClassDraft[],
    offeredSpecialtyIds: [] as string[],
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties', true],
    queryFn: () => getSpecialties(true),
    enabled: establishmentData.type === 'lycee',
  });

  const { data: coordinatorsResponse } = useQuery({
    queryKey: ['coordinators', establishmentData.managedById],
    queryFn: () =>
      getCoordinators({ pageSize: 100, managedById: establishmentData.managedById || undefined }),
    enabled: !!establishmentData.managedById,
  });
  const coordinators = coordinatorsResponse?.data || [];

  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => getManagers({ pageSize: 100 }),
  });
  const managers = managersResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: async (dto: CreateEstablishmentDto) => {
      return createEstablishment(dto);
    },
    onSuccess: () => {
      toast.success('Établissement créé avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      console.error('[CreateEstablishment] Erreur API:', error);
      const err = error as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw)
        ? raw.join(', ')
        : raw || err?.message || "Erreur lors de la création de l'établissement";
      toast.error(msg);
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    const updates: any = { [field]: value };

    if (field === 'managedById' && value !== establishmentData.managedById) {
      updates.coordinatorIds = [];
    }

    if (field === 'type' && !ESTABLISHMENT_TYPES_WITH_CLASSES.has(value)) {
      updates.classes = [];
    }

    if (field === 'type' && value !== 'lycee') {
      updates.offeredSpecialtyIds = [];
    }

    setEstablishmentData((prev) => ({ ...prev, ...updates }));
    const updatedData = { ...establishmentData, ...updates };
    validation.validateField(field, value, updatedData);
    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm(establishmentData);

    if (!isValid) {
      return;
    }

    const validContacts = establishmentData.contacts
      .filter((c) => c.contactName?.trim() || c.contactEmail?.trim() || c.contactPhone?.trim())
      .map((c) => ({
        contactName: c.contactName || undefined,
        contactEmail: c.contactEmail || undefined,
        contactPhone: c.contactPhone || undefined,
        fonction: c.fonction || undefined,
      }));

    const dto: CreateEstablishmentDto = {
      uaiCode: establishmentData.uaiCode,
      name: establishmentData.name,
      officialName: establishmentData.officialName || undefined,
      type: establishmentData.type || undefined,
      establiCategory: (establishmentData.establiCategory as EstablishmentCategory) || undefined,
      priorityNetwork:
        (establishmentData.priorityNetwork as EstablishmentPriorityNetwork) || undefined,
      ipsValue:
        establishmentData.ipsValue !== '' && establishmentData.ipsValue !== undefined
          ? Number(establishmentData.ipsValue)
          : undefined,
      isQpv:
        establishmentData.isQpv === 'true'
          ? true
          : establishmentData.isQpv === 'false'
            ? false
            : undefined,
      renewalNextYear:
        establishmentData.renewalNextYear === 'true'
          ? true
          : establishmentData.renewalNextYear === 'false'
            ? false
            : undefined,
      hasDevoirsFaits:
        establishmentData.hasDevoirsFaits === 'true'
          ? true
          : establishmentData.hasDevoirsFaits === 'false'
            ? false
            : undefined,
      hasInternat:
        establishmentData.hasInternat === 'true'
          ? true
          : establishmentData.hasInternat === 'false'
            ? false
            : undefined,
      involvementLevel: establishmentData.involvementLevel
        ? Number(establishmentData.involvementLevel)
        : undefined,
      partnerRelationshipQuality:
        (establishmentData.partnerRelationshipQuality as PartnerRelationshipQuality) || undefined,
      conventionSigned:
        establishmentData.conventionSigned === 'true'
          ? true
          : establishmentData.conventionSigned === 'false'
            ? false
            : undefined,
      status: establishmentData.status,
      addressLine1: establishmentData.addressLine1 || undefined,
      department: establishmentData.department || undefined,
      postalCode: establishmentData.postalCode || undefined,
      city: establishmentData.city || undefined,
      country: establishmentData.country || undefined,
      contactName: establishmentData.contactName || undefined,
      contactEmail: establishmentData.contactEmail || undefined,
      contactPhone: establishmentData.contactPhone || undefined,
      contacts: validContacts.length > 0 ? validContacts : undefined,
      volunteerQuota: establishmentData.volunteerQuota
        ? Number(establishmentData.volunteerQuota)
        : undefined,
      engagementStartDate: establishmentData.engagementStartDate || undefined,
      engagementEndDate: establishmentData.engagementEndDate || undefined,
      managedById: isManager ? user?.id : establishmentData.managedById || undefined,
      coordinatorIds:
        establishmentData.coordinatorIds.length > 0 ? establishmentData.coordinatorIds : undefined,
      rooms: establishmentData.rooms,
      classes: establishmentData.classes
        .filter((c) => c.name.trim() && c.levelId && c.schoolYearId)
        .map((c) => ({
          name: c.name.trim(),
          levelId: c.levelId,
          schoolYearId: c.schoolYearId,
          studentCount: c.studentCount,
        })),
      offeredSpecialtyIds:
        establishmentData.type === 'lycee' ? establishmentData.offeredSpecialtyIds : undefined,
    };
    createMutation.mutate(dto);
  };

  const typeOptions = [
    { value: 'primaire', label: 'École' },
    { value: 'college', label: 'Collège' },
    { value: 'lycee', label: 'Lycée général' },
    { value: 'professionnel', label: 'Lycée professionnel' },
    { value: 'other', label: 'Autre' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Actif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'closed', label: 'Fermé' },
  ];

  const categoryOptions = [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Privé' },
  ];

  const priorityNetworkOptions = [
    { value: 'none', label: 'Aucun réseau prioritaire' },
    { value: 'rep', label: 'REP' },
    { value: 'rep_plus', label: 'REP+' },
  ];

  const yesNoOptions = [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' },
  ];

  const isSubmitting = createMutation.isPending;

  const classesError = useMemo(() => {
    if (!ESTABLISHMENT_TYPES_WITH_CLASSES.has(establishmentData.type ?? '')) return null;
    const classes = establishmentData.classes ?? [];

    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      if (!cls.name?.trim()) return `Classe #${i + 1} : le nom est obligatoire.`;
      if (!cls.levelId) return `Classe #${i + 1} ("${cls.name}") : le niveau est obligatoire.`;
      if (!cls.schoolYearId)
        return `Classe #${i + 1} ("${cls.name}") : l'année scolaire est obligatoire.`;
    }

    const seen = new Map<string, number>();
    for (let i = 0; i < classes.length; i++) {
      const key = `${classes[i].name.trim().toLowerCase()}::${classes[i].schoolYearId}`;
      if (seen.has(key)) {
        return `Doublon : la classe "${classes[i].name.trim()}" existe déjà pour cette année scolaire (lignes ${seen.get(key)! + 1} et ${i + 1}).`;
      }
      seen.set(key, i);
    }
    return null;
  }, [establishmentData.classes, establishmentData.type]);

  return (
    <CollapseReplaceForm
      formType="create"
      title="Créer un établissement"
      subtitle="Renseignez les informations de l'établissement"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={validation.isFormValid() && !classesError}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <Building2 className="w-4 h-4" />
          Informations générales
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code UAI"
            value={establishmentData.uaiCode}
            onChange={(e) => handleFieldChange('uaiCode', e.target.value.toUpperCase())}
            onBlur={() => handleBlur('uaiCode')}
            placeholder="Ex: 0010001A"
            maxLength={8}
            helperText="Code officiel de l'établissement (7 chiffres + 1 lettre, optionnel)"
            state={validation.getFieldState('uaiCode')}
            error={validation.getFieldError('uaiCode')}
          />
          <Input
            label="Nom"
            value={establishmentData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            required
            placeholder="Ex: Collège Jean Moulin"
            maxLength={255}
            state={validation.getFieldState('name')}
            error={validation.getFieldError('name')}
          />
          <Select
            label="Type"
            value={establishmentData.type}
            onChange={(value) => handleFieldChange('type', value)}
            onBlur={() => handleBlur('type')}
            options={typeOptions}
            placeholder="Sélectionner un type"
            required
            state={validation.getFieldState('type')}
            error={validation.getFieldError('type')}
          />
          <Select
            label="Statut"
            value={establishmentData.status}
            onChange={(value) => handleFieldChange('status', value)}
            onBlur={() => handleBlur('status')}
            options={statusOptions}
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
          />
          <Select
            label="Catégorie établissement"
            value={establishmentData.establiCategory}
            onChange={(value) => handleFieldChange('establiCategory', value)}
            options={categoryOptions}
            placeholder="Sélectionner une catégorie"
          />
          <Select
            label="Réseau d'éducation prioritaire"
            value={establishmentData.priorityNetwork}
            onChange={(value) => handleFieldChange('priorityNetwork', value)}
            options={priorityNetworkOptions}
            placeholder="Sélectionner un réseau"
          />
          <Input
            label="IPS (Indice de Position Sociale)"
            type="number"
            value={establishmentData.ipsValue}
            onChange={(e) => handleFieldChange('ipsValue', e.target.value)}
            placeholder="Ex: 95.30"
            min={0}
            max={200}
            step={0.01}
            helperText="Indice de position sociale de l'établissement (API Éducation Nationale)"
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <MapPin className="w-4 h-4" />
          Adresse
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AddressAutocompleteInput
            value={establishmentData.addressLine1}
            onChange={(value) => handleFieldChange('addressLine1', value)}
            onBlur={() => handleBlur('addressLine1')}
            onSelection={(result) => {
              handleFieldChange('addressLine1', result.addressLine1);
              handleFieldChange('department', result.department);
              handleFieldChange('postalCode', result.postalCode);
              handleFieldChange('city', result.city);
            }}
            placeholder="Ex: 12 rue de la République, Paris"
            state={validation.getFieldState('addressLine1')}
            error={validation.getFieldError('addressLine1')}
            helperText="Commencez à saisir l'adresse pour voir les suggestions"
            maxLength={255}
          />
          <Input
            label="Département"
            value={establishmentData.department}
            onChange={(e) => handleFieldChange('department', e.target.value)}
            onBlur={() => handleBlur('department')}
            placeholder="Ex: Paris"
            maxLength={100}
            state={validation.getFieldState('department')}
            error={validation.getFieldError('department')}
          />
          <Input
            label="Code postal"
            value={establishmentData.postalCode}
            onChange={(e) => handleFieldChange('postalCode', e.target.value)}
            onBlur={() => handleBlur('postalCode')}
            placeholder="Ex: 75001"
            maxLength={20}
            state={validation.getFieldState('postalCode')}
            error={validation.getFieldError('postalCode')}
          />
          <Input
            label="Ville"
            value={establishmentData.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            onBlur={() => handleBlur('city')}
            placeholder="Ex: Paris"
            maxLength={100}
            state={validation.getFieldState('city')}
            error={validation.getFieldError('city')}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Phone className="w-4 h-4" />
          Fonctions
        </h4>
        <ContactsGrid
          value={establishmentData.contacts}
          onChange={(contacts) => handleFieldChange('contacts', contacts)}
          disabled={false}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Définissez les contacts disponibles dans cet établissement
        </p>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Users className="w-4 h-4" />
          Engagement & Contrat
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Quota VSCs"
            type="number"
            value={establishmentData.volunteerQuota}
            onChange={(e) => handleFieldChange('volunteerQuota', e.target.value)}
            onBlur={() => handleBlur('volunteerQuota')}
            placeholder="Ex: 50"
            min={0}
            state={validation.getFieldState('volunteerQuota')}
            error={validation.getFieldError('volunteerQuota')}
          />
          <DatePicker
            label="Date de début partenariat"
            value={establishmentData.engagementStartDate}
            onChange={(value) => handleFieldChange('engagementStartDate', value)}
            onBlur={() => handleBlur('engagementStartDate')}
            placeholder="Sélectionner la date de début"
            state={validation.getFieldState('engagementStartDate')}
            error={validation.getFieldError('engagementStartDate')}
          />
          <DatePicker
            label="Date fin partenariat"
            value={establishmentData.engagementEndDate}
            onChange={(value) => handleFieldChange('engagementEndDate', value)}
            onBlur={() => handleBlur('engagementEndDate')}
            placeholder="Sélectionner la date de fin"
            minDate={addDaysToDateString(establishmentData.engagementStartDate, 1)}
            state={validation.getFieldState('engagementEndDate')}
            error={validation.getFieldError('engagementEndDate')}
          />
          <Select
            label="Quartier prioritaire de la ville (QPV)"
            value={establishmentData.isQpv}
            onChange={(value) => handleFieldChange('isQpv', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Reconduction prévue N+1"
            value={establishmentData.renewalNextYear}
            onChange={(value) => handleFieldChange('renewalNextYear', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Définissez le nombre maximum d'élèves et de VSCs pour cet établissement
        </p>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Handshake className="w-4 h-4" />
          Dispositifs & Partenariat
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Convention signée"
            value={establishmentData.conventionSigned}
            onChange={(value) => handleFieldChange('conventionSigned', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Présence dispositif Devoirs Faits"
            value={establishmentData.hasDevoirsFaits}
            onChange={(value) => handleFieldChange('hasDevoirsFaits', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Présence internat"
            value={establishmentData.hasInternat}
            onChange={(value) => handleFieldChange('hasInternat', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Niveau d'implication établissement"
            value={establishmentData.involvementLevel}
            onChange={(value) => handleFieldChange('involvementLevel', value)}
            options={INVOLVEMENT_LEVEL_OPTIONS}
            placeholder="Non renseigné"
          />
          <Select
            label="Qualité relation partenaire"
            value={establishmentData.partnerRelationshipQuality}
            onChange={(value) => handleFieldChange('partnerRelationshipQuality', value)}
            options={PARTNER_RELATIONSHIP_QUALITY_OPTIONS}
            placeholder="Non renseigné"
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <UserCog className="w-4 h-4" />
          Coordinateurs gestionnaires
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {!isManager && (
            <Select
              label="Géré par"
              value={establishmentData.managedById}
              onChange={(value) => handleFieldChange('managedById', value)}
              onBlur={() => handleBlur('managedById')}
              options={managers.map((m) => ({
                value: m.id,
                label: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || m.id,
              }))}
              placeholder="Sélectionner un manager (optionnel)"
              helperText="Manager responsable de cet établissement (optionnel)"
              state={validation.getFieldState('managedById')}
              error={validation.getFieldError('managedById')}
            />
          )}
          {isManager && (
            <Input
              label="Géré par"
              value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || ''}
              disabled={true}
              helperText="Vous êtes le manager responsable de cet établissement"
            />
          )}
          <MultiSelect
            label="Coordinateurs"
            placeholder="Sélectionner les coordinateurs"
            options={coordinators.map((c) => ({
              value: c.id,
              label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || c.id,
            }))}
            value={establishmentData.coordinatorIds}
            onChange={(values) => handleFieldChange('coordinatorIds', values)}
            onBlur={() => handleBlur('coordinatorIds')}
            maxVisibleTags={3}
            disabled={!establishmentData.managedById}
            helperText={
              establishmentData.managedById
                ? 'Optionnel - Coordinateurs qui gèrent cet établissement'
                : "Veuillez d'abord sélectionner un manager"
            }
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <DoorOpen className="w-4 h-4" />
          Salles
        </h4>
        <RoomsGrid
          value={establishmentData.rooms}
          onChange={(rooms) => handleFieldChange('rooms', rooms)}
          disabled={false}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Les salles peuvent être modifiées par les Superadmins, les Coordinateurs et les Managers.
        </p>
      </div>

      {establishmentData.type && ESTABLISHMENT_TYPES_WITH_CLASSES.has(establishmentData.type) && (
        <div className="form-section">
          <h4 className="form-section-title">
            <GraduationCap className="w-4 h-4" />
            Classes
          </h4>
          <ClassesGrid
            value={establishmentData.classes}
            onChange={(classes) => handleFieldChange('classes', classes)}
            disabled={false}
          />
          {classesError && <p className="text-xs text-red-500 mt-2 font-medium">{classesError}</p>}
          {!classesError && (
            <p className="text-xs text-muted-foreground mt-2">
              Définissez les classes de cet établissement (optionnel)
            </p>
          )}
        </div>
      )}

      {establishmentData.type === 'lycee' && (
        <div className="form-section">
          <h4 className="form-section-title">
            <BookOpen className="w-4 h-4" />
            Spécialités proposées
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {specialties.map((specialty) => (
              <Checkbox
                key={specialty.id}
                id={`specialty-${specialty.id}`}
                label={specialty.label}
                checked={establishmentData.offeredSpecialtyIds.includes(specialty.id)}
                onCheckedChange={(checked) => {
                  const current = establishmentData.offeredSpecialtyIds;
                  const updated = checked
                    ? [...current, specialty.id]
                    : current.filter((id) => id !== specialty.id);
                  handleFieldChange('offeredSpecialtyIds', updated);
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Sélectionnez les spécialités proposées par cet établissement (optionnel)
          </p>
        </div>
      )}
    </CollapseReplaceForm>
  );
};
