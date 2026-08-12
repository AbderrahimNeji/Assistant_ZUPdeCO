import * as React from 'react';
import { Calendar, FileText } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DatePicker } from '@/components/forms/DatePicker';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import {
  getHoliday,
  updateHoliday,
  getEstablishments,
  getVacationZones,
} from '@/services/academic.service';
import type { EstablishmentsResponse } from '@/services/establishments.service';
import { formatEstablishmentSelectLabel } from '@/utils/formatEstablishmentSelectLabel';
import type { UpdateHolidayDto } from '@/types/holiday.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { holidayValidationSchema } from '@/utils/validation-schemas';

interface EditHolidayViewProps {
  holidayId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const HOLIDAY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'national', label: 'National' },
  { value: 'regional', label: 'Régional' },
  { value: 'establishment_specific', label: 'Spécifique établissement' },
];

export const EditHolidayView: React.FC<EditHolidayViewProps> = ({
  holidayId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<UpdateHolidayDto>({});

  const validation = useFormValidation(holidayValidationSchema);

  const { data: holiday, isLoading } = useQuery({
    queryKey: ['holiday', holidayId],
    queryFn: () => getHoliday(holidayId),
  });

  const { data: establishmentsResponse } = useQuery<EstablishmentsResponse>({
    queryKey: ['establishments'],
    queryFn: () => getEstablishments(),
  });

  const { data: vacationZones = [] } = useQuery({
    queryKey: ['vacation-zones'],
    queryFn: () => getVacationZones(),
  });

  const vacationZoneOptions: SelectOption[] = React.useMemo(
    () => [
      { value: '', label: 'Toutes zones (commun)' },
      ...vacationZones.map((z) => ({
        value: z.id,
        label: `${z.name} (${z.code})`,
      })),
    ],
    [vacationZones],
  );

  const establishmentOptions: SelectOption[] = React.useMemo(
    () =>
      establishmentsResponse?.data?.map((est) => ({
        value: est.id,
        label: formatEstablishmentSelectLabel(est),
      })) || [],
    [establishmentsResponse],
  );

  React.useEffect(() => {
    if (holiday) {
      const initialData = {
        name: holiday.name,
        type: holiday.type,
        startDate: new Date(holiday.startDate).toISOString().split('T')[0],
        endDate: new Date(holiday.endDate).toISOString().split('T')[0],
        description: holiday.description || '',
        establishmentId: holiday.establishmentId || undefined,
        vacationZoneId: holiday.vacationZoneId || undefined,
        isRecurringYearly: holiday.isRecurringYearly,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [holiday]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateHolidayDto) => updateHoliday(holidayId, dto),
    onSuccess: () => {
      toast.success('Vacance/Férié modifié avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || 'Erreur lors de la modification de la vacance/férié',
      );
    },
  });

  const handleFieldChange = (field: keyof UpdateHolidayDto, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    const updatedData = { ...formData, [field]: value };
    validation.validateField(field, value, updatedData);
    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleTypeChange = (value: string) => {
    const newType = value as 'national' | 'regional' | 'establishment_specific';
    setFormData((prev) => ({
      ...prev,
      type: newType,
      establishmentId: newType === 'establishment_specific' ? prev.establishmentId : undefined,
      vacationZoneId: newType === 'regional' ? prev.vacationZoneId : undefined,
    }));
    const updatedData = {
      ...formData,
      type: newType,
      establishmentId: newType === 'establishment_specific' ? formData.establishmentId : undefined,
      vacationZoneId: newType === 'regional' ? formData.vacationZoneId : undefined,
    };
    validation.validateField('type', value, updatedData);
    validation.markAsTouched('type');
    validation.markAsDirty('type');
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm(formData);

    if (!isValid) {
      return;
    }

    // Get selected establishment for denormalized name (if establishment_specific)
    const selectedEstablishment =
      formData.type === 'establishment_specific' && formData.establishmentId
        ? establishmentsResponse?.data?.find((e) => e.id === formData.establishmentId)
        : null;

    const dto: UpdateHolidayDto = {
      ...formData,
      establishmentName: selectedEstablishment?.name || undefined,
      vacationZoneId: formData.type === 'regional' ? formData.vacationZoneId || null : null,
    };

    updateMutation.mutate(dto);
  };

  const isAnyMutationPending = updateMutation.isPending;

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier la vacance/férié"
      subtitle="Modifiez les informations de la vacance/férié"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={isAnyMutationPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom"
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="Ex: Vacances de Noël"
            maxLength={255}
            required
            helperText="Nom de la période de vacances ou férié"
            state={validation.getFieldState('name')}
            error={validation.getFieldError('name')}
          />

          <Select
            label="Type"
            value={formData.type || 'national'}
            onChange={(value) => handleTypeChange(value)}
            onBlur={() => handleBlur('type')}
            options={HOLIDAY_TYPE_OPTIONS}
            required
            state={validation.getFieldState('type')}
            error={validation.getFieldError('type')}
          />
        </div>

        {formData.type === 'establishment_specific' && (
          <div className="animate-slide-down">
            <Autocomplete
              label="Établissement"
              value={formData.establishmentId || ''}
              onChange={(value) => handleFieldChange('establishmentId', value)}
              onBlur={() => handleBlur('establishmentId')}
              options={establishmentOptions}
              placeholder="Rechercher un établissement..."
              required
              state={validation.getFieldState('establishmentId')}
              error={validation.getFieldError('establishmentId')}
              minSearchLength={3}
            />
          </div>
        )}

        {formData.type === 'regional' && (
          <div className="animate-slide-down mt-4">
            <Select
              label="Zone vacances scolaires"
              value={formData.vacationZoneId || ''}
              onChange={(value) => handleFieldChange('vacationZoneId', value)}
              onBlur={() => handleBlur('vacationZoneId')}
              options={vacationZoneOptions}
              helperText="Optionnel : restreindre à une zone A, B ou C"
              state={validation.getFieldState('vacationZoneId')}
              error={validation.getFieldError('vacationZoneId')}
            />
          </div>
        )}

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Ex: Vacances scolaires d'hiver"
          maxLength={500}
          state={validation.getFieldState('description')}
          error={validation.getFieldError('description')}
        />
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Calendar className="w-4 h-4" />
          Dates
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Date de début"
            value={formData.startDate || ''}
            onChange={(value) => handleFieldChange('startDate', value)}
            onBlur={() => handleBlur('startDate')}
            required
            state={validation.getFieldState('startDate')}
            error={validation.getFieldError('startDate')}
          />

          <DatePicker
            label="Date de fin"
            value={formData.endDate || ''}
            onChange={(value) => handleFieldChange('endDate', value)}
            onBlur={() => handleBlur('endDate')}
            minDate={formData.startDate}
            required
            state={validation.getFieldState('endDate')}
            error={validation.getFieldError('endDate')}
          />
        </div>

        <Checkbox
          label="Récurrent chaque année"
          checked={formData.isRecurringYearly || false}
          onCheckedChange={(checked) => handleFieldChange('isRecurringYearly', checked)}
        />
      </div>
    </SlidePanelForm>
  );
};
