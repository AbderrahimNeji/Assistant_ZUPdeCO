import * as React from 'react';
import { FileText, Settings, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import { getActivity, updateActivity, getActivityTypes } from '@/services/academic.service';
import type { UpdateActivityDto } from '@/types/activity.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { activityConfigValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface EditActivityViewProps {
  activityId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditActivityView: React.FC<EditActivityViewProps> = ({
  activityId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState<UpdateActivityDto>({});

  const validation = useFormValidation(activityConfigValidationSchema);

  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => getActivity(activityId),
  });

  const { data: activityTypes = [] } = useQuery({
    queryKey: ['activityTypes'],
    queryFn: async () => {
      const response = await getActivityTypes();
      return response.data;
    },
  });

  const activityTypeOptions: SelectOption[] = React.useMemo(
    () =>
      activityTypes.map((type) => ({
        value: type.id,
        label: type.label,
      })),
    [activityTypes],
  );

  React.useEffect(() => {
    if (activity) {
      const initialData = {
        activityTypeId: activity.activityTypeId,
        code: activity.code,
        label: activity.label,
        description: activity.description || '',
        canHasCr: activity.canHasCr,
        bot: activity.bot,
        withLink: activity.withLink,
        chat: activity.chat,
        maxTutors: activity.maxTutors || undefined,
        maxStudents: activity.maxStudents || undefined,
        maxVolunteers: activity.maxVolunteers || undefined,
        maxStudentsPerTutor: activity.maxStudentsPerTutor || undefined,
        status: activity.status,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [activity]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateActivityDto) => updateActivity(activityId, dto),
    onSuccess: () => {
      toast.success('Activité modifiée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Erreur lors de la modification de l'activité");
    },
  });

  const handleFieldChange = (
    field: keyof UpdateActivityDto,
    value: string | number | boolean | undefined,
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

    // Get selected activity type for denormalized name
    const selectedActivityType = activityTypes.find((at) => at.id === formData.activityTypeId);

    const dto: UpdateActivityDto = {
      ...formData,
      activityTypeName: selectedActivityType?.label || undefined,
    };

    updateMutation.mutate(dto);
  };

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier l'activité"
      subtitle="Modifiez les informations de l'activité"
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
            placeholder="Ex: AIDE_DEVOIRS_6EME"
            maxLength={50}
            required
            helperText="Code unique identifiant l'activité"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.label || ''}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            onBlur={() => handleBlur('label')}
            placeholder="Ex: Aide aux devoirs niveau 6ème"
            maxLength={255}
            required
            helperText="Nom complet de l'activité"
            state={validation.getFieldState('label')}
            error={validation.getFieldError('label')}
          />
        </div>

        <Select
          label="Type d'activité"
          value={formData.activityTypeId || ''}
          onChange={(value) => handleFieldChange('activityTypeId', value)}
          onBlur={() => handleBlur('activityTypeId')}
          options={activityTypeOptions}
          placeholder="Sélectionner un type"
          required
          state={validation.getFieldState('activityTypeId')}
          error={validation.getFieldError('activityTypeId')}
        />

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Ex: Accompagnement scolaire"
          maxLength={500}
          state={validation.getFieldState('description')}
          error={validation.getFieldError('description')}
        />
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Settings className="w-4 h-4" />
          Configuration
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Max tuteurs"
            type="number"
            value={formData.maxTutors?.toString() || ''}
            onChange={(e) =>
              handleFieldChange(
                'maxTutors',
                e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              )
            }
            onBlur={() => handleBlur('maxTutors')}
            placeholder="Ex: 5"
            min={0}
            max={100}
            state={validation.getFieldState('maxTutors')}
            error={validation.getFieldError('maxTutors')}
          />

          <Input
            label="Max élèves"
            type="number"
            value={formData.maxStudents?.toString() || ''}
            onChange={(e) =>
              handleFieldChange(
                'maxStudents',
                e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              )
            }
            onBlur={() => handleBlur('maxStudents')}
            placeholder="Ex: 10"
            min={0}
            max={100}
            state={validation.getFieldState('maxStudents')}
            error={validation.getFieldError('maxStudents')}
          />

          <Input
            label="Max VSC"
            type="number"
            value={formData.maxVolunteers?.toString() || ''}
            onChange={(e) =>
              handleFieldChange(
                'maxVolunteers',
                e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              )
            }
            onBlur={() => handleBlur('maxVolunteers')}
            placeholder="Ex: 5"
            min={0}
            max={100}
            state={validation.getFieldState('maxVolunteers')}
            error={validation.getFieldError('maxVolunteers')}
          />

          <Input
            label="Max élèves par tuteur"
            type="number"
            value={formData.maxStudentsPerTutor?.toString() || ''}
            onChange={(e) =>
              handleFieldChange(
                'maxStudentsPerTutor',
                e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              )
            }
            onBlur={() => handleBlur('maxStudentsPerTutor')}
            placeholder="Ex: 5"
            min={0}
            max={100}
            state={validation.getFieldState('maxStudentsPerTutor')}
            error={validation.getFieldError('maxStudentsPerTutor')}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <CheckCircle2 className="w-4 h-4" />
          Options
        </h4>

        <div className="space-y-3">
          <Checkbox
            label="Peut avoir un compte-rendu"
            checked={formData.canHasCr || false}
            onCheckedChange={(checked) => handleFieldChange('canHasCr', checked)}
          />

          <Checkbox
            label="Bot activé"
            checked={formData.bot || false}
            onCheckedChange={(checked) => handleFieldChange('bot', checked)}
          />

          <Checkbox
            label="Avec lien"
            checked={formData.withLink || false}
            onCheckedChange={(checked) => handleFieldChange('withLink', checked)}
          />

          <Checkbox
            label="Chat activé"
            checked={formData.chat || false}
            onCheckedChange={(checked) => handleFieldChange('chat', checked)}
          />
        </div>
      </div>
    </SlidePanelForm>
  );
};
