import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { DatePicker } from '@/components/forms/DatePicker';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import { createSchoolYear } from '@/services/academic.service';
import type { CreateSchoolYearDto } from '@/types/school-year.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { schoolYearValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface CreateSchoolYearViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateSchoolYearView: React.FC<CreateSchoolYearViewProps> = ({
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<CreateSchoolYearDto>({
    label: '',
    code: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    status: 'active',
  });

  const validation = useFormValidation(schoolYearValidationSchema);

  const createMutation = useMutation({
    mutationFn: (dto: CreateSchoolYearDto) => createSchoolYear(dto),
    onSuccess: () => {
      toast.success('Année scolaire créée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Erreur lors de la création de l'année scolaire");
    },
  });

  const isSubmitting = createMutation.isPending;

  const handleFieldChange = (field: keyof CreateSchoolYearDto, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    const updatedData = { ...formData, [field]: value };
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

    createMutation.mutate(formData);
  };

  return (
    <SlidePanelForm
      formType="create"
      title="Créer une année scolaire"
      subtitle="Renseignez les informations de l'année scolaire"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={validation.isFormValid()}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <Input
          label="Code"
          value={formData.code}
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
            value={formData.startDate}
            onChange={(value) => handleFieldChange('startDate', value)}
            onBlur={() => handleBlur('startDate')}
            required
            state={validation.getFieldState('startDate')}
            error={validation.getFieldError('startDate')}
          />

          <DatePicker
            label="Date de fin"
            value={formData.endDate}
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
