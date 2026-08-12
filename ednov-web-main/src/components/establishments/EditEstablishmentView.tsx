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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { Input } from '@/components/forms/Input';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { Select } from '@/components/forms/Select';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { DatePicker } from '@/components/forms/DatePicker';
import { RoomsGrid } from '@/components/forms/RoomsGrid';
import { ClassesGrid, type ClassDraft, classFromSchoolClass } from '@/components/forms/ClassesGrid';
import {
  ESTABLISHMENT_TYPES_WITH_CLASSES,
  PARTNER_RELATIONSHIP_QUALITY_OPTIONS,
  INVOLVEMENT_LEVEL_OPTIONS,
} from '@/components/establishments/establishment-configs';
import { ContactsGrid } from '@/components/forms/ContactsGrid';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import { getEstablishment, updateEstablishment } from '@/services/establishments.service';
import { getRooms } from '@/services/rooms.service';
import { getSchoolClasses } from '@/services/academic.service';
import { getSpecialties } from '@/services/specialties.service';
import { getCoordinators, getManagers } from '@/services/users.service';
import type {
  UpdateEstablishmentDto,
  EstablishmentCategory,
  EstablishmentContact,
  EstablishmentPriorityNetwork,
  EstablishmentType,
  PartnerRelationshipQuality,
} from '@/types/establishment.types';
import type { Room } from '@/types/room.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { establishmentValidationSchema } from '@/utils/validation-schemas';
import { addDaysToDateString } from '@/lib/date-utils';

interface EditEstablishmentViewProps {
  establishmentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditEstablishmentView: React.FC<EditEstablishmentViewProps> = ({
  establishmentId,
  onClose,
  onSuccess,
}) => {
  const { user, isManager } = useConnectedUser();
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState<{
    uaiCode: string;
    name: string;
    officialName: string;
    type: '' | 'primaire' | 'college' | 'lycee' | 'professionnel' | 'other';
    establiCategory: '' | EstablishmentCategory;
    priorityNetwork: '' | EstablishmentPriorityNetwork;
    ipsValue: string | number;
    isQpv: '' | 'true' | 'false';
    renewalNextYear: '' | 'true' | 'false';
    hasDevoirsFaits: '' | 'true' | 'false';
    hasInternat: '' | 'true' | 'false';
    involvementLevel: string;
    partnerRelationshipQuality: string;
    conventionSigned: '' | 'true' | 'false';
    status: 'active' | 'suspended' | 'closed';
    addressLine1: string;
    department: string;
    postalCode: string;
    city: string;
    country: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contacts: EstablishmentContact[];
    volunteerQuota: string | number;
    engagementStartDate: string;
    engagementEndDate: string;
    managedById: string;
    coordinatorIds: string[];
    rooms: Room[];
    classes: ClassDraft[];
    offeredSpecialtyIds: string[];
  }>({
    uaiCode: '',
    name: '',
    officialName: '',
    type: '',
    establiCategory: '',
    priorityNetwork: '',
    ipsValue: '',
    isQpv: '',
    renewalNextYear: '',
    hasDevoirsFaits: '',
    hasInternat: '',
    involvementLevel: '',
    partnerRelationshipQuality: '',
    conventionSigned: '',
    status: 'active',
    addressLine1: '',
    department: '',
    postalCode: '',
    city: '',
    country: 'FR',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contacts: [],
    volunteerQuota: '',
    engagementStartDate: '',
    engagementEndDate: '',
    managedById: '',
    coordinatorIds: [],
    rooms: [],
    classes: [],
    offeredSpecialtyIds: [],
  });

  const validation = useFormValidation(establishmentValidationSchema);

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties', true],
    queryFn: () => getSpecialties(true),
    enabled: formData.type === 'lycee',
  });

  const { data: coordinatorsResponse } = useQuery({
    queryKey: ['coordinators', formData.managedById],
    queryFn: () =>
      getCoordinators({ pageSize: 100, managedById: formData.managedById || undefined }),
    enabled: !!formData.managedById,
  });
  const coordinators = coordinatorsResponse?.data || [];

  const { data: managersResponse } = useQuery({
    queryKey: ['managers'],
    queryFn: () => getManagers({ pageSize: 100 }),
  });
  const managers = managersResponse?.data || [];

  const { data: establishment, isLoading } = useQuery({
    queryKey: ['establishments', establishmentId],
    queryFn: () => getEstablishment(establishmentId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: existingRoomsRaw } = useQuery({
    queryKey: ['rooms', establishmentId],
    queryFn: () => getRooms(establishmentId),
    enabled: !!establishmentId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const existingRooms = React.useMemo(() => existingRoomsRaw ?? [], [existingRoomsRaw]);

  const { data: existingClassesRes } = useQuery({
    queryKey: ['school-classes', establishmentId],
    queryFn: () => getSchoolClasses({ establishmentId, pageSize: 200 }),
    enabled: !!establishmentId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const existingClasses = React.useMemo(() => existingClassesRes?.data ?? [], [existingClassesRes]);

  React.useEffect(() => {
    if (establishment) {
      const initialData: typeof formData = {
        uaiCode: establishment.uaiCode || '',
        name: establishment.name || '',
        officialName: establishment.officialName || '',
        type: (establishment.type || '') as '' | EstablishmentType,
        establiCategory: (establishment.establiCategory || '') as '' | EstablishmentCategory,
        priorityNetwork: (establishment.priorityNetwork || '') as '' | EstablishmentPriorityNetwork,
        ipsValue: establishment.ipsValue ?? '',
        isQpv: establishment.isQpv === true ? 'true' : establishment.isQpv === false ? 'false' : '',
        renewalNextYear:
          establishment.renewalNextYear === true
            ? 'true'
            : establishment.renewalNextYear === false
              ? 'false'
              : '',
        hasDevoirsFaits:
          establishment.hasDevoirsFaits === true
            ? 'true'
            : establishment.hasDevoirsFaits === false
              ? 'false'
              : '',
        hasInternat:
          establishment.hasInternat === true
            ? 'true'
            : establishment.hasInternat === false
              ? 'false'
              : '',
        involvementLevel:
          establishment.involvementLevel != null ? String(establishment.involvementLevel) : '',
        partnerRelationshipQuality: establishment.partnerRelationshipQuality || '',
        conventionSigned:
          establishment.conventionSigned === true
            ? 'true'
            : establishment.conventionSigned === false
              ? 'false'
              : '',
        status: establishment.status as 'active' | 'suspended' | 'closed',
        addressLine1: establishment.addressLine1 || '',
        department: establishment.department || '',
        postalCode: establishment.postalCode || '',
        city: establishment.city || '',
        country: establishment.country || 'FR',
        contactName: establishment.contactName || '',
        contactEmail: establishment.contactEmail || '',
        contactPhone: establishment.contactPhone || '',
        contacts:
          establishment.contacts && establishment.contacts.length > 0 ? establishment.contacts : [],
        volunteerQuota: establishment.volunteerQuota ?? '',
        engagementStartDate: establishment.engagementStartDate
          ? new Date(establishment.engagementStartDate).toISOString().split('T')[0]
          : '',
        engagementEndDate: establishment.engagementEndDate
          ? new Date(establishment.engagementEndDate).toISOString().split('T')[0]
          : '',
        managedById: establishment.managedById || establishment.managedBy?.id || '',
        coordinatorIds:
          establishment.coordinators?.map((c) => c.id) || establishment.coordinatorIds || [],
        rooms: existingRooms,
        classes: existingClasses.map(classFromSchoolClass),
        offeredSpecialtyIds: establishment.offeredSpecialties?.map((s) => s.id) ?? [],
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [establishment, existingRooms, existingClasses]);

  const updateMutation = useMutation({
    mutationFn: async (dto: UpdateEstablishmentDto) => {
      await updateEstablishment(establishmentId, dto);
      queryClient.invalidateQueries({ queryKey: ['school-classes', establishmentId] });
    },
    onSuccess: () => {
      toast.success('Établissement modifié avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || "Erreur lors de la modification de l'établissement",
      );
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    const updates: any = { [field]: value };

    if (field === 'managedById' && value !== formData.managedById) {
      updates.coordinatorIds = [];
    }

    if (field === 'type' && !ESTABLISHMENT_TYPES_WITH_CLASSES.has(value)) {
      updates.classes = [];
    }

    if (field === 'type' && value !== 'lycee') {
      updates.offeredSpecialtyIds = [];
    }

    setFormData((prev) => ({ ...prev, ...updates }));
    const updatedData = { ...formData, ...updates };
    validation.validateField(field, value, updatedData);
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

    const validContacts = formData.contacts
      .filter((c) => c.contactName?.trim() || c.contactEmail?.trim() || c.contactPhone?.trim())
      .map((c) => ({
        contactName: c.contactName || undefined,
        contactEmail: c.contactEmail || undefined,
        contactPhone: c.contactPhone || undefined,
        fonction: c.fonction || undefined,
      }));

    const dto: UpdateEstablishmentDto = {
      name: formData.name,
      officialName: formData.officialName || undefined,
      type: formData.type || undefined,
      establiCategory: (formData.establiCategory as EstablishmentCategory) || undefined,
      priorityNetwork: (formData.priorityNetwork as EstablishmentPriorityNetwork) || undefined,
      ipsValue:
        formData.ipsValue !== '' && formData.ipsValue !== undefined
          ? Number(formData.ipsValue)
          : undefined,
      isQpv: formData.isQpv === 'true' ? true : formData.isQpv === 'false' ? false : undefined,
      renewalNextYear:
        formData.renewalNextYear === 'true'
          ? true
          : formData.renewalNextYear === 'false'
            ? false
            : undefined,
      hasDevoirsFaits:
        formData.hasDevoirsFaits === 'true'
          ? true
          : formData.hasDevoirsFaits === 'false'
            ? false
            : undefined,
      hasInternat:
        formData.hasInternat === 'true'
          ? true
          : formData.hasInternat === 'false'
            ? false
            : undefined,
      involvementLevel: formData.involvementLevel ? Number(formData.involvementLevel) : undefined,
      partnerRelationshipQuality:
        (formData.partnerRelationshipQuality as PartnerRelationshipQuality) || undefined,
      conventionSigned:
        formData.conventionSigned === 'true'
          ? true
          : formData.conventionSigned === 'false'
            ? false
            : undefined,
      status: formData.status,
      addressLine1: formData.addressLine1 || undefined,
      department: formData.department || undefined,
      postalCode: formData.postalCode || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      contactName: formData.contactName || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      contacts: validContacts.length > 0 ? validContacts : undefined,
      volunteerQuota: formData.volunteerQuota ? Number(formData.volunteerQuota) : undefined,
      engagementStartDate: formData.engagementStartDate || undefined,
      engagementEndDate: formData.engagementEndDate || undefined,
      managedById: isManager ? user?.id : formData.managedById || undefined,
      coordinatorIds: formData.coordinatorIds,
      rooms: formData.rooms,
      classes: formData.classes
        .filter((c) => c.name.trim() && c.levelId && c.schoolYearId)
        .map((c) => ({
          ...(c.id ? { id: c.id } : {}),
          name: c.name.trim(),
          levelId: c.levelId,
          schoolYearId: c.schoolYearId,
          studentCount: c.studentCount,
        })),
      offeredSpecialtyIds: formData.type === 'lycee' ? formData.offeredSpecialtyIds : undefined,
    };
    updateMutation.mutate(dto);
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

  const isAnyMutationPending = updateMutation.isPending;

  const classesError = useMemo(() => {
    if (!ESTABLISHMENT_TYPES_WITH_CLASSES.has(formData.type ?? '')) return null;
    const classes = formData.classes;

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
  }, [formData.classes, formData.type]);

  return (
    <CollapseReplaceForm
      formType="edit"
      title="Modifier un établissement"
      subtitle="Modifiez les informations de l'établissement"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={isAnyMutationPending}
      isValid={validation.isFormValid() && !classesError}
      isLoading={isLoading}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <Building2 className="w-4 h-4" />
          Informations générales
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code UAI"
            value={formData.uaiCode}
            disabled={true}
            placeholder="Ex: 0010001A"
            maxLength={8}
            helperText="Le code UAI ne peut pas être modifié car il sert d'identifiant unique"
          />
          <Input
            label="Nom"
            value={formData.name}
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
            value={formData.type}
            onChange={(value) => handleFieldChange('type', value)}
            onBlur={() => handleBlur('type')}
            options={typeOptions}
            placeholder="Sélectionner un type"
            state={validation.getFieldState('type')}
            error={validation.getFieldError('type')}
          />
          <Select
            label="Statut"
            value={formData.status}
            onChange={(value) => handleFieldChange('status', value)}
            onBlur={() => handleBlur('status')}
            options={statusOptions}
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
          />
          <Select
            label="Catégorie établissement"
            value={formData.establiCategory}
            onChange={(value) => handleFieldChange('establiCategory', value)}
            options={categoryOptions}
            placeholder="Sélectionner une catégorie"
          />
          <Select
            label="Réseau d'éducation prioritaire"
            value={formData.priorityNetwork}
            onChange={(value) => handleFieldChange('priorityNetwork', value)}
            options={priorityNetworkOptions}
            placeholder="Sélectionner un réseau"
          />
          <Input
            label="IPS (Indice de Position Sociale)"
            type="number"
            value={formData.ipsValue}
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
            value={formData.addressLine1}
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
            value={formData.department}
            onChange={(e) => handleFieldChange('department', e.target.value)}
            onBlur={() => handleBlur('department')}
            placeholder="Ex: Paris"
            maxLength={100}
            state={validation.getFieldState('department')}
            error={validation.getFieldError('department')}
          />
          <Input
            label="Code postal"
            value={formData.postalCode}
            onChange={(e) => handleFieldChange('postalCode', e.target.value)}
            onBlur={() => handleBlur('postalCode')}
            placeholder="Ex: 75001"
            maxLength={20}
            state={validation.getFieldState('postalCode')}
            error={validation.getFieldError('postalCode')}
          />
          <Input
            label="Ville"
            value={formData.city}
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
          value={formData.contacts}
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
            value={formData.volunteerQuota}
            onChange={(e) => handleFieldChange('volunteerQuota', e.target.value)}
            onBlur={() => handleBlur('volunteerQuota')}
            placeholder="Ex: 50"
            min={0}
            state={validation.getFieldState('volunteerQuota')}
            error={validation.getFieldError('volunteerQuota')}
          />
          <DatePicker
            label="Date de début partenariat"
            value={formData.engagementStartDate}
            onChange={(value) => handleFieldChange('engagementStartDate', value)}
            onBlur={() => handleBlur('engagementStartDate')}
            placeholder="Sélectionner la date de début"
            state={validation.getFieldState('engagementStartDate')}
            error={validation.getFieldError('engagementStartDate')}
          />
          <DatePicker
            label="Date fin partenariat"
            value={formData.engagementEndDate}
            onChange={(value) => handleFieldChange('engagementEndDate', value)}
            onBlur={() => handleBlur('engagementEndDate')}
            placeholder="Sélectionner la date de fin"
            minDate={addDaysToDateString(formData.engagementStartDate, 1)}
            state={validation.getFieldState('engagementEndDate')}
            error={validation.getFieldError('engagementEndDate')}
          />
          <Select
            label="Quartier prioritaire de la ville (QPV)"
            value={formData.isQpv}
            onChange={(value) => handleFieldChange('isQpv', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Reconduction prévue N+1"
            value={formData.renewalNextYear}
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
            value={formData.conventionSigned}
            onChange={(value) => handleFieldChange('conventionSigned', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Présence dispositif Devoirs Faits"
            value={formData.hasDevoirsFaits}
            onChange={(value) => handleFieldChange('hasDevoirsFaits', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Présence internat"
            value={formData.hasInternat}
            onChange={(value) => handleFieldChange('hasInternat', value)}
            options={yesNoOptions}
            placeholder="Non renseigné"
          />
          <Select
            label="Niveau d'implication établissement"
            value={formData.involvementLevel}
            onChange={(value) => handleFieldChange('involvementLevel', value)}
            options={INVOLVEMENT_LEVEL_OPTIONS}
            placeholder="Non renseigné"
          />
          <Select
            label="Qualité relation partenaire"
            value={formData.partnerRelationshipQuality}
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
              value={formData.managedById}
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
            value={formData.coordinatorIds}
            onChange={(values) => handleFieldChange('coordinatorIds', values)}
            onBlur={() => handleBlur('coordinatorIds')}
            maxVisibleTags={3}
            disabled={!formData.managedById}
            helperText={
              formData.managedById
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
          value={formData.rooms}
          onChange={(rooms) => handleFieldChange('rooms', rooms)}
          disabled={false}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Les salles peuvent être modifiées par les Superadmins, les Coordinateurs et les Managers.
        </p>
      </div>

      {formData.type && ESTABLISHMENT_TYPES_WITH_CLASSES.has(formData.type) && (
        <div className="form-section">
          <h4 className="form-section-title">
            <GraduationCap className="w-4 h-4" />
            Classes
          </h4>
          <ClassesGrid
            value={formData.classes}
            onChange={(classes) => handleFieldChange('classes', classes)}
            disabled={false}
          />
          {classesError && <p className="text-xs text-red-500 mt-2 font-medium">{classesError}</p>}
          {!classesError && (
            <p className="text-xs text-muted-foreground mt-2">
              Gérez les classes de cet établissement (optionnel)
            </p>
          )}
        </div>
      )}

      {formData.type === 'lycee' && (
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
                checked={formData.offeredSpecialtyIds.includes(specialty.id)}
                onCheckedChange={(checked) => {
                  const current = formData.offeredSpecialtyIds;
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
