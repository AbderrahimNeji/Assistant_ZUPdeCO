import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { DatePicker } from '@/components/forms/DatePicker';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import { getSchoolYear, updateSchoolYear } from '@/services/academic.service';
import type { UpdateSchoolYearDto } from '@/types/school-year.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { schoolYearValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface EditSchoolYearViewProps {
  schoolYearId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditSchoolYearView: React.FC<EditSchoolYearViewProps> = ({
  schoolYearId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<UpdateSchoolYearDto>({});

  const validation = useFormValidation(schoolYearValidationSchema);

  const { data: schoolYear, isLoading } = useQuery({
    queryKey: ['schoolYear', schoolYearId],
    queryFn: () => getSchoolYear(schoolYearId),
  });

  React.useEffect(() => {
    if (schoolYear) {
      const startDateStr = new Date(schoolYear.startDate).toISOString().split('T')[0];
      const endDateStr = new Date(schoolYear.endDate).toISOString().split('T')[0];
      const initialData = {
        code: schoolYear.code,
        startDate: startDateStr,
        endDate: endDateStr,
        isCurrent: schoolYear.isCurrent,
        status: schoolYear.status,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [schoolYear]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateSchoolYearDto) => updateSchoolYear(schoolYearId, dto),
    onSuccess: () => {
      toast.success('Année scolaire modifiée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || "Erreur lors de la modification de l'année scolaire",
      );
    },
  });

  const handleFieldChange = (field: keyof UpdateSchoolYearDto, value: string | boolean | Date) => {
    const finalValue = value instanceof Date ? value.toISOString().split('T')[0] : value;
    setFormData((prev) => ({ ...prev, [field]: finalValue }));

    const updatedData = { ...formData, [field]: finalValue };
    validation.validateField(field, finalValue, updatedData);
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

    updateMutation.mutate(formData);
  };

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier l'année scolaire"
      subtitle="Modifiez les informations de l'année scolaire"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <Input
          label="Code"
          value={formData.code || ''}
          onChange={(e) => handleFieldChange('code', e.target.value)}
          onBlur={() => handleBlur('code')}
          placeholder="Ex: 2025-2026"
          maxLength={20}
          required
          helperText="Code de l'année au format YYYY-YYYY"
          state={validation.getFieldState('code')}
          error={validation.getFieldError('code')}
        />

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
          label="Année en cours"
          checked={formData.isCurrent || false}
          onCheckedChange={(checked) => handleFieldChange('isCurrent', checked)}
        />
      </div>
    </SlidePanelForm>
  );
};
