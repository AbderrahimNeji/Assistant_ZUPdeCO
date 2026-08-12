import * as React from 'react';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { X, Check } from 'lucide-react';
import type { UseFormValidationReturn } from '@/hooks/useFormValidation';
import type { CreateActivityTypeDto } from '@/types/activity.types';

interface InlineActivityTypeFormProps {
  newActivityTypeData: Partial<CreateActivityTypeDto>;
  setNewActivityTypeData: React.Dispatch<React.SetStateAction<Partial<CreateActivityTypeDto>>>;
  activityTypeValidation: UseFormValidationReturn;
  onClose: () => void;
  onValidate: () => void;
}

export const InlineActivityTypeForm: React.FC<InlineActivityTypeFormProps> = ({
  newActivityTypeData,
  setNewActivityTypeData,
  activityTypeValidation,
  onClose,
  onValidate,
}) => {
  const formRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  return (
    <div ref={formRef} className="form-section bg-[var(--color-1-nuance-4)] p-4 rounded-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold">Nouveau type d'activité</h5>
        <Button preset="form-close" onClick={onClose} />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code"
            placeholder="Ex: AIDE_DEVOIRS"
            value={newActivityTypeData.code || ''}
            onChange={(e) => {
              setNewActivityTypeData((prev) => ({ ...prev, code: e.target.value }));
              activityTypeValidation.validateField('code', e.target.value, newActivityTypeData);
            }}
            onBlur={() => activityTypeValidation.markAsTouched('code')}
            required
            maxLength={50}
            helperText="Code unique identifiant le type"
            state={activityTypeValidation.getFieldState('code')}
            error={activityTypeValidation.getFieldError('code')}
            inputSize="sm"
          />
          <Input
            label="Libellé"
            placeholder="Ex: Aide aux devoirs"
            value={newActivityTypeData.label || ''}
            onChange={(e) => {
              setNewActivityTypeData((prev) => ({ ...prev, label: e.target.value }));
              activityTypeValidation.validateField('label', e.target.value, newActivityTypeData);
            }}
            onBlur={() => activityTypeValidation.markAsTouched('label')}
            required
            maxLength={255}
            helperText="Nom complet du type d'activité"
            state={activityTypeValidation.getFieldState('label')}
            error={activityTypeValidation.getFieldError('label')}
            inputSize="sm"
          />
        </div>
        <Input
          label="Description"
          placeholder="Ex: Accompagnement aux devoirs"
          value={newActivityTypeData.description || ''}
          onChange={(e) => {
            setNewActivityTypeData((prev) => ({ ...prev, description: e.target.value }));
            activityTypeValidation.validateField(
              'description',
              e.target.value,
              newActivityTypeData,
            );
          }}
          onBlur={() => activityTypeValidation.markAsTouched('description')}
          maxLength={500}
          state={activityTypeValidation.getFieldState('description')}
          error={activityTypeValidation.getFieldError('description')}
          inputSize="sm"
        />
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button variant="primary" size="sm" onClick={onValidate}>
          <Check className="w-4 h-4 mr-2" />
          Valider
        </Button>
      </div>
    </div>
  );
};
