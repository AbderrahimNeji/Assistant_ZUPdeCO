import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { toast } from '@/lib/toast';
import { getActivityType, updateActivityType } from '@/services/academic.service';
import type { UpdateActivityTypeDto } from '@/types/activity.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { activityTypeValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface EditActivityTypeViewProps {
  activityTypeId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditActivityTypeView: React.FC<EditActivityTypeViewProps> = ({
  activityTypeId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<UpdateActivityTypeDto>({});

  const validation = useFormValidation(activityTypeValidationSchema);

  const { data: activityType, isLoading } = useQuery({
    queryKey: ['activityType', activityTypeId],
    queryFn: () => getActivityType(activityTypeId),
  });

  React.useEffect(() => {
    if (activityType) {
      const initialData = {
        code: activityType.code,
        label: activityType.label,
        description: activityType.description || '',
        status: activityType.status,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [activityType]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateActivityTypeDto) => updateActivityType(activityTypeId, dto),
    onSuccess: () => {
      toast.success("Type d'activité modifié avec succès !");
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || "Erreur lors de la modification du type d'activité",
      );
    },
  });

  const handleFieldChange = (
    field: keyof UpdateActivityTypeDto,
    value: string | number | undefined,
  ) => {
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

    updateMutation.mutate(formData);
  };

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier le type d'activité"
      subtitle="Modifiez les informations du type d'activité"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code"
            value={formData.code || ''}
            onChange={(e) => handleFieldChange('code', e.target.value)}
            onBlur={() => handleBlur('code')}
            placeholder="Ex: AIDE_DEVOIRS"
            maxLength={50}
            required
            helperText="Code unique identifiant le type"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.label || ''}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            onBlur={() => handleBlur('label')}
            placeholder="Ex: Aide aux devoirs"
            maxLength={255}
            required
            helperText="Nom complet du type d'activité"
            state={validation.getFieldState('label')}
            error={validation.getFieldError('label')}
          />
        </div>

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Ex: Accompagnement aux devoirs"
          maxLength={500}
          state={validation.getFieldState('description')}
          error={validation.getFieldError('description')}
        />
      </div>
    </SlidePanelForm>
  );
};
