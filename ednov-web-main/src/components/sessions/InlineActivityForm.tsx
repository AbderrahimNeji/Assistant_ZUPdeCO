import * as React from 'react';
import { Input } from '@/components/forms/Input';
import { Select, SelectOption } from '@/components/forms/Select';
import { Button } from '@/components/forms/Button';
import { Checkbox } from '@/components/forms/Checkbox';
import { X, Plus, Check } from 'lucide-react';
import type { UseFormValidationReturn } from '@/hooks/useFormValidation';
import type { CreateActivityDto } from '@/types/activity.types';

interface InlineActivityFormProps {
  newActivityData: Partial<CreateActivityDto>;
  setNewActivityData: React.Dispatch<React.SetStateAction<Partial<CreateActivityDto>>>;
  showActivityTypeForm: boolean;
  setShowActivityTypeForm: (show: boolean) => void;
  activityTypeOptions: SelectOption[];
  activityValidation: UseFormValidationReturn;
  onClose: () => void;
  onValidate: () => void;
}

export const InlineActivityForm: React.FC<InlineActivityFormProps> = ({
  newActivityData,
  setNewActivityData,
  showActivityTypeForm,
  setShowActivityTypeForm,
  activityTypeOptions,
  activityValidation,
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
        <h5 className="font-semibold">Nouvelle activité</h5>
        <Button preset="form-close" onClick={onClose} />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code"
            placeholder="Ex: AIDE_DEVOIRS_6EME"
            value={newActivityData.code || ''}
            onChange={(e) => {
              setNewActivityData((prev) => ({ ...prev, code: e.target.value }));
              activityValidation.validateField('code', e.target.value, newActivityData);
            }}
            onBlur={() => activityValidation.markAsTouched('code')}
            required
            maxLength={50}
            helperText="Code unique identifiant l'activité"
            state={activityValidation.getFieldState('code')}
            error={activityValidation.getFieldError('code')}
            inputSize="sm"
          />
          <Input
            label="Libellé"
            placeholder="Ex: Aide aux devoirs niveau 6ème"
            value={newActivityData.label || ''}
            onChange={(e) => {
              setNewActivityData((prev) => ({ ...prev, label: e.target.value }));
              activityValidation.validateField('label', e.target.value, newActivityData);
            }}
            onBlur={() => activityValidation.markAsTouched('label')}
            required
            maxLength={255}
            helperText="Nom complet de l'activité"
            state={activityValidation.getFieldState('label')}
            error={activityValidation.getFieldError('label')}
            inputSize="sm"
          />
        </div>

        {!showActivityTypeForm ? (
          <div className="space-y-2">
            <Select
              label="Type d'activité"
              placeholder="Sélectionner un type"
              options={activityTypeOptions}
              value={newActivityData.activityTypeId || ''}
              onChange={(value) => {
                setNewActivityData((prev) => ({ ...prev, activityTypeId: value }));
                activityValidation.validateField('activityTypeId', value, newActivityData);
              }}
              onBlur={() => activityValidation.markAsTouched('activityTypeId')}
              required
              size="sm"
              state={activityValidation.getFieldState('activityTypeId')}
              error={activityValidation.getFieldError('activityTypeId')}
            />
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              iconPosition="left"
              onClick={() => setShowActivityTypeForm(true)}
            >
              Créer un nouveau type
            </Button>
          </div>
        ) : null}

        <Input
          label="Description"
          placeholder="Ex: Accompagnement scolaire"
          value={newActivityData.description || ''}
          onChange={(e) => {
            setNewActivityData((prev) => ({ ...prev, description: e.target.value }));
            activityValidation.validateField('description', e.target.value, newActivityData);
          }}
          onBlur={() => activityValidation.markAsTouched('description')}
          maxLength={500}
          state={activityValidation.getFieldState('description')}
          error={activityValidation.getFieldError('description')}
          inputSize="sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Max tuteurs"
            type="number"
            placeholder="Ex: 5"
            value={newActivityData.maxTutors?.toString() || ''}
            onChange={(e) => {
              const value = e.target.value ? Number.parseInt(e.target.value, 10) : undefined;
              setNewActivityData((prev) => ({ ...prev, maxTutors: value }));
              activityValidation.validateField('maxTutors', value, newActivityData);
            }}
            onBlur={() => activityValidation.markAsTouched('maxTutors')}
            min={0}
            max={100}
            state={activityValidation.getFieldState('maxTutors')}
            error={activityValidation.getFieldError('maxTutors')}
            inputSize="sm"
          />
          <Input
            label="Max élèves"
            type="number"
            placeholder="Ex: 10"
            value={newActivityData.maxStudents?.toString() || ''}
            onChange={(e) => {
              const value = e.target.value ? Number.parseInt(e.target.value, 10) : undefined;
              setNewActivityData((prev) => ({ ...prev, maxStudents: value }));
              activityValidation.validateField('maxStudents', value, newActivityData);
            }}
            onBlur={() => activityValidation.markAsTouched('maxStudents')}
            min={0}
            max={100}
            state={activityValidation.getFieldState('maxStudents')}
            error={activityValidation.getFieldError('maxStudents')}
            inputSize="sm"
          />
          <Input
            label="Max VSC"
            type="number"
            placeholder="Ex: 5"
            value={newActivityData.maxVolunteers?.toString() || ''}
            onChange={(e) => {
              const value = e.target.value ? Number.parseInt(e.target.value, 10) : undefined;
              setNewActivityData((prev) => ({ ...prev, maxVolunteers: value }));
              activityValidation.validateField('maxVolunteers', value, newActivityData);
            }}
            onBlur={() => activityValidation.markAsTouched('maxVolunteers')}
            min={0}
            max={100}
            state={activityValidation.getFieldState('maxVolunteers')}
            error={activityValidation.getFieldError('maxVolunteers')}
            inputSize="sm"
          />
          <Input
            label="Max élèves par tuteur"
            type="number"
            placeholder="Ex: 5"
            value={newActivityData.maxStudentsPerTutor?.toString() || ''}
            onChange={(e) => {
              const value = e.target.value ? Number.parseInt(e.target.value, 10) : undefined;
              setNewActivityData((prev) => ({ ...prev, maxStudentsPerTutor: value }));
              activityValidation.validateField('maxStudentsPerTutor', value, newActivityData);
            }}
            onBlur={() => activityValidation.markAsTouched('maxStudentsPerTutor')}
            min={0}
            max={100}
            state={activityValidation.getFieldState('maxStudentsPerTutor')}
            error={activityValidation.getFieldError('maxStudentsPerTutor')}
            inputSize="sm"
          />
        </div>

        <div className="space-y-3">
          <Checkbox
            label="Peut avoir un compte-rendu"
            checked={newActivityData.canHasCr || false}
            onCheckedChange={(checked) => {
              setNewActivityData((prev) => ({ ...prev, canHasCr: checked }));
              activityValidation.validateField('canHasCr', checked, newActivityData);
            }}
          />
          <Checkbox
            label="Bot activé"
            checked={newActivityData.bot || false}
            onCheckedChange={(checked) => {
              setNewActivityData((prev) => ({ ...prev, bot: checked }));
              activityValidation.validateField('bot', checked, newActivityData);
            }}
          />
          <Checkbox
            label="Avec lien"
            checked={newActivityData.withLink || false}
            onCheckedChange={(checked) => {
              setNewActivityData((prev) => ({ ...prev, withLink: checked }));
              activityValidation.validateField('withLink', checked, newActivityData);
            }}
          />
          <Checkbox
            label="Chat activé"
            checked={newActivityData.chat || false}
            onCheckedChange={(checked) => {
              setNewActivityData((prev) => ({ ...prev, chat: checked }));
              activityValidation.validateField('chat', checked, newActivityData);
            }}
          />
        </div>
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
