import * as React from 'react';
import {
  PostIt,
  CreatePostItDto,
  UpdatePostItDto,
  PostItThematic,
  PostItColor,
  PostItStatus,
  AssignedRecurrence,
  CreateAssignedPostItDto,
  AssignedPostIt,
  ScheduleConfig,
  ScheduleType,
} from '@/types/post-it.types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Select } from '@/components/forms/Select';
import { DateTimePicker } from '@/components/forms/DateTimePicker';
import {
  Star,
  Clock,
  Palette,
  Tag,
  Save,
  Plus,
  RotateCcw,
  CheckCircle,
  ShieldUser,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useFormValidation } from '@/hooks/useFormValidation';
import { postItValidationSchema } from '@/utils/validation-schemas';
import '@/styles/postit.css';
import { THEMATICS, COLOR_MAP_MODAL, COLORS } from './postit-config';
import { useQuery } from '@tanstack/react-query';
import { getRoles } from '@/services/roles.service';
import { PostItScheduleConfigForm } from './schedule/PostItScheduleConfigForm';

// ─── Re-exports pour la compat des consommateurs ─────────────────────────────
export type { AssignedRecurrence, CreateAssignedPostItDto, AssignedPostIt };

const RECURRENCE_OPTIONS: { value: AssignedRecurrence; label: string }[] = [
  { value: 'weekly', label: '📅 Chaque semaine' },
  { value: 'monthly', label: '📅 Chaque mois' },
  { value: 'quarterly', label: '📆 Chaque trimestre' },
  { value: 'annually', label: '🗓️ Chaque année' },
  { value: 'specific_date', label: '📌 Date spécifique' },
];

const QUARTERLY_PERIODS: { value: number; label: string }[] = [
  { value: 1, label: 'T1' },
  { value: 2, label: 'T2' },
  { value: 3, label: 'T3' },
  { value: 4, label: 'T4' },
];

// ─── Props discriminées par variant ──────────────────────────────────────────

type PostItModalProps =
  | {
      variant: 'personal';
      mode: 'create' | 'edit' | 'view';
      postIt?: PostIt;
      onSave: (data: CreatePostItDto | UpdatePostItDto) => Promise<void>;
      isOpen: boolean;
      onClose: () => void;
    }
  | {
      variant: 'assigned';
      mode: 'create' | 'edit' | 'view';
      postIt?: PostIt;
      /** Passer pour pré-remplir en mode view/edit sur un post-it assigné existant */
      assignedPostIt?: AssignedPostIt;
      onSave: (data: CreateAssignedPostItDto) => Promise<void>;
      /** Appelé en mode edit pour sauvegarder un post-it existant */
      onUpdate?: (id: string, data: Partial<CreateAssignedPostItDto>) => Promise<void>;
      isOpen: boolean;
      onClose: () => void;
    };

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Maps new ScheduleType to legacy AssignedRecurrence for backward compatibility
 */
function toLegacyRecurrence(type: ScheduleType): AssignedRecurrence {
  switch (type) {
    case 'weekly':
    case 'day_of_week':
      return 'weekly';
    case 'monthly':
    case 'day_of_month':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    case 'school_year':
    case 'civil_year':
      return 'annually';
    case 'custom_dates':
      return 'specific_date';
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const PostItModal: React.FC<PostItModalProps> = (props) => {
  const { variant, isOpen, onClose } = props;
  const postIt = props.postIt;
  const assignedPostIt =
    variant === 'assigned'
      ? (props as { assignedPostIt?: AssignedPostIt }).assignedPostIt
      : undefined;
  // Allow switching from view → edit inline
  const [currentMode, setCurrentMode] = React.useState<'create' | 'edit' | 'view'>(props.mode);

  const normalizeDeadline = (deadline?: string | Date | null): string => {
    if (!deadline) return '';
    if (typeof deadline === 'string') return deadline;
    return deadline.toISOString();
  };

  // ── État partagé ─────────────────────────────────────────────────────────
  const [formData, setFormData] = React.useState({
    title: postIt?.title || '',
    thematic: postIt?.thematic || '',
    content: postIt?.content || '',
    color: postIt?.color || ((variant === 'assigned' ? 'blanc-casse' : 'jaune') as PostItColor),
    isPriority: postIt?.isPriority || false,
  });

  // ── État personal uniquement ──────────────────────────────────────────────
  const [personalData, setPersonalData] = React.useState({
    deadline: normalizeDeadline(postIt?.deadline),
    status: (postIt?.status || 'en_cours') as PostItStatus,
  });

  // ── État assigned uniquement ──────────────────────────────────────────────
  const [assignConfig, setAssignConfig] = React.useState({
    recurrence: '' as AssignedRecurrence | '',
    specificDateFrom: '',
    specificDateTo: '',
    targetRoleIds: [] as string[],
    quarterlyPeriods: [] as number[],
  });

  // ── État schedule config (nouveau système de planification avancée) ────────
  const [scheduleConfig, setScheduleConfig] = React.useState<ScheduleConfig | null>(null);

  const [loading, setLoading] = React.useState(false);
  const validation = useFormValidation(postItValidationSchema);

  React.useEffect(() => {
    if (!isOpen) return;
    setCurrentMode(props.mode);

    const shared = {
      title: (assignedPostIt?.title ?? postIt?.title) || '',
      thematic: (assignedPostIt?.thematic ?? postIt?.thematic) || '',
      content: (assignedPostIt?.content ?? postIt?.content) || '',
      color: ((assignedPostIt?.color ?? postIt?.color) || 'jaune') as PostItColor,
      isPriority: (assignedPostIt?.isPriority ?? postIt?.isPriority) || false,
    };
    setFormData(shared);

    if (variant === 'personal') {
      const pd = {
        deadline: normalizeDeadline(postIt?.deadline),
        status: (postIt?.status || 'en_cours') as PostItStatus,
      };
      setPersonalData(pd);
      if (postIt) {
        validation.validateInitialFormData({ ...shared, ...pd });
      } else {
        validation.resetValidation();
      }
    } else {
      if (assignedPostIt) {
        setAssignConfig({
          recurrence: (assignedPostIt.recurrence as AssignedRecurrence) || '',
          specificDateFrom: assignedPostIt.specificDateFrom || '',
          specificDateTo: assignedPostIt.specificDateTo || '',
          targetRoleIds: assignedPostIt.targetRoleIds ?? [],
          quarterlyPeriods: assignedPostIt.quarterlyPeriods ?? [],
        });
        // Charger scheduleConfig si présent (nouveau système)
        if ('scheduleConfig' in assignedPostIt && assignedPostIt.scheduleConfig) {
          setScheduleConfig(assignedPostIt.scheduleConfig as ScheduleConfig);
        }
      } else {
        setAssignConfig({
          recurrence: '',
          specificDateFrom: '',
          specificDateTo: '',
          targetRoleIds: [],
          quarterlyPeriods: [],
        });
      }
      validation.resetValidation();
    }
  }, [postIt, assignedPostIt, isOpen]);

  // Rôles — chargés uniquement pour la variante assigned
  const { data: rolesResponse } = useQuery({
    queryKey: ['roles-for-postit'],
    queryFn: () => getRoles({ pageSize: 100 }),
    enabled: isOpen && variant === 'assigned',
  });

  const roleOptions = React.useMemo(
    () =>
      (rolesResponse?.data ?? []).map((r) => ({
        value: r.id,
        label: r.label,
      })),
    [rolesResponse],
  );

  const handleFieldChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      validation.validateField(field, value, newData);
      return newData;
    });
  };

  const handleBlur = (field: keyof typeof formData) => {
    validation.validateField(field, formData[field], formData);
  };

  const handleAssignChange = (
    field: keyof typeof assignConfig,
    value: string | string[] | number[] | undefined,
  ) => {
    setAssignConfig((prev) => ({ ...prev, [field]: value }));
  };

  const isAssignValid = () => {
    // Si le nouveau système est utilisé, pas besoin de validation supplémentaire
    if (scheduleConfig) return true;
    // Ancien système : vérifier specific_date
    if (assignConfig.recurrence === 'specific_date' && !assignConfig.specificDateFrom) return false;
    return true;
  };

  const isSubmitDisabled = () => {
    const baseInvalid = !formData.title.trim() || !formData.thematic || !formData.content.trim();
    if (variant === 'assigned') return baseInvalid || !isAssignValid() || loading;
    return baseInvalid || loading;
  };

  const availableColors = React.useMemo(() => {
    const colors = [...COLORS];
    if (
      currentMode === 'edit' &&
      formData.color === 'blanc-casse' &&
      !colors.includes('blanc-casse')
    ) {
      colors.push('blanc-casse');
    }
    return colors;
  }, [currentMode, formData.color]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isValid = validation.validateForm(formData);
    if (!isValid) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (variant === 'assigned' && !isAssignValid()) {
      toast.error('Veuillez configurer la plage de dates pour cette récurrence');
      return;
    }

    setLoading(true);
    try {
      if (variant === 'assigned') {
        const data: CreateAssignedPostItDto = {
          title: formData.title.trim(),
          thematic: formData.thematic as PostItThematic,
          content: formData.content.trim(),
          color: formData.color,
          isPriority: formData.isPriority,
          // Nouveau système : scheduleConfig
          scheduleConfig: scheduleConfig || undefined,
          // Ancien système : toujours dérivé de scheduleConfig.type pour rétrocompatibilité
          recurrence: scheduleConfig
            ? toLegacyRecurrence(scheduleConfig.type)
            : assignConfig.recurrence
              ? (assignConfig.recurrence as AssignedRecurrence)
              : undefined,
          specificDateFrom:
            !scheduleConfig && assignConfig.recurrence === 'specific_date'
              ? assignConfig.specificDateFrom
              : undefined,
          specificDateTo:
            !scheduleConfig && assignConfig.recurrence === 'specific_date'
              ? assignConfig.specificDateTo
              : undefined,
          targetRoleIds:
            assignConfig.targetRoleIds.length > 0 ? assignConfig.targetRoleIds : undefined,
          quarterlyPeriods:
            !scheduleConfig &&
            assignConfig.recurrence === 'quarterly' &&
            assignConfig.quarterlyPeriods.length > 0
              ? assignConfig.quarterlyPeriods
              : undefined,
        };
        if (currentMode === 'edit' && assignedPostIt) {
          const onUpdate = (
            props as {
              onUpdate?: (id: string, d: Partial<CreateAssignedPostItDto>) => Promise<void>;
            }
          ).onUpdate;
          if (onUpdate) {
            await onUpdate(assignedPostIt.id, data);
          }
        } else {
          await (props.onSave as (d: CreateAssignedPostItDto) => Promise<void>)(data);
        }
      } else {
        let data: CreatePostItDto | UpdatePostItDto;
        if (currentMode === 'create') {
          data = {
            title: formData.title.trim(),
            thematic: formData.thematic as PostItThematic,
            content: formData.content.trim(),
            deadline: personalData.deadline || undefined,
            color: formData.color,
            isPriority: formData.isPriority,
          };
        } else {
          data = {
            title: formData.title.trim(),
            thematic: formData.thematic as PostItThematic,
            content: formData.content.trim(),
            deadline: personalData.deadline || undefined,
            color: formData.color,
            isPriority: formData.isPriority,
            status: personalData.status,
          };
        }
        await (props.onSave as (d: CreatePostItDto | UpdatePostItDto) => Promise<void>)(data);
      }
      onClose();
    } catch {
      toast.error(
        variant === 'assigned'
          ? 'Erreur lors de la création du post-it assigné'
          : 'Erreur lors de la sauvegarde du post-it',
      );
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = currentMode === 'view';
  const colorStyles = COLOR_MAP_MODAL[formData.color];
  const currentThematic = THEMATICS.find((t) => t.value === formData.thematic);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'max-w-lg p-0 border-2 overflow-hidden',
          colorStyles.bg,
          colorStyles.border,
          'shadow-2xl',
          'postit-modal-tilt',
          'max-h-[90vh] flex flex-col',
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Title accessible masqué visuellement — requis par Radix UI */}
        <DialogTitle className="sr-only">
          {assignedPostIt || postIt
            ? 'Modifier le post-it'
            : variant === 'assigned'
              ? 'Créer un post-it assigné'
              : 'Créer un post-it'}
        </DialogTitle>
        {/* Header */}
        <div className={cn('relative p-5 pb-3', colorStyles.text)}>
          {isReadOnly && (
            <div className="absolute top-3 left-3 text-2xl">{currentThematic?.emoji || '📌'}</div>
          )}
          {formData.isPriority && (
            <div className={cn('absolute top-3', isReadOnly ? 'left-12' : 'left-3')}>
              <Star className="w-5 h-5 fill-[#f59e0b] text-[#f59e0b]" />
            </div>
          )}
          <div className="mt-8">
            <Input
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="Titre du post-it..."
              required
              disabled={isReadOnly}
              className={cn(
                '!bg-transparent border-none outline-none shadow-none',
                'font-caveat text-2xl font-bold placeholder:opacity-30 placeholder:font-light',
                colorStyles.text,
                'disabled:opacity-70',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                validation.getFieldError('title') && 'border-b-2 border-red-500',
              )}
              maxLength={255}
              error={validation.getFieldError('title')}
            />
          </div>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className={cn('px-5 pb-5 overflow-y-auto flex-1', colorStyles.text)}
        >
          <Textarea
            value={formData.content}
            onChange={(e) => handleFieldChange('content', e.target.value)}
            onBlur={() => handleBlur('content')}
            placeholder="Écrivez votre note ici..."
            required
            disabled={isReadOnly}
            className={cn(
              'bg-transparent border-none outline-none shadow-none resize-none',
              'font-caveat text-lg placeholder:opacity-30 placeholder:font-light',
              colorStyles.text,
              'disabled:opacity-70',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              validation.getFieldError('content') && 'border-2 border-red-500 rounded-lg p-2',
            )}
            rows={variant === 'assigned' ? 4 : 5}
            maxLength={1000}
            error={validation.getFieldError('content')}
          />

          <div className="mt-4 pt-4 border-t border-black/10 space-y-4">
            {/* Thématique + Deadline (personal) ou Rôles cibles (assigned) */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                <Tag className="w-4 h-4 opacity-60 flex-shrink-0" />
                <Select
                  value={formData.thematic}
                  onChange={(value) => handleFieldChange('thematic', value as PostItThematic)}
                  onBlur={() => handleBlur('thematic')}
                  disabled={isReadOnly}
                  placeholder="Thématique"
                  options={THEMATICS.map((t) => ({
                    value: t.value,
                    label: `${t.emoji} ${t.label}`,
                  }))}
                  className={cn('flex-1', colorStyles.text)}
                  size="sm"
                />
              </div>

              {variant === 'personal' && (
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <Clock className="w-5 h-5 opacity-60 flex-shrink-0" />
                  <DateTimePicker
                    value={personalData.deadline}
                    onChange={(value) => setPersonalData((prev) => ({ ...prev, deadline: value }))}
                    disabled={isReadOnly}
                    className="flex-1"
                    disablePast={true}
                    timeStep={5}
                    error={validation.getFieldError('deadline')}
                  />
                </div>
              )}

              {variant === 'assigned' && (
                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <ShieldUser className="w-4 h-4 opacity-60 flex-shrink-0" />
                  <Select
                    placeholder="Choisir un rôle"
                    options={roleOptions}
                    value={assignConfig.targetRoleIds[0] ?? ''}
                    onChange={(val) => handleAssignChange('targetRoleIds', val ? [val] : [])}
                    disabled={isReadOnly}
                    className={cn('flex-1', colorStyles.text)}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Planification avancée — assigned uniquement */}
            {variant === 'assigned' && (
              <div className="postit-modal__schedule-section">
                <PostItScheduleConfigForm
                  value={scheduleConfig}
                  onChange={(config) => setScheduleConfig(config)}
                  templateId={assignedPostIt?.id}
                  color={formData.color}
                />
              </div>
            )}

            {/* Couleurs */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 opacity-60" />
              <div className="flex gap-1.5">
                {availableColors.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    preset="postit-color"
                    onClick={() => !isReadOnly && handleFieldChange('color', c)}
                    disabled={isReadOnly}
                    className={cn(
                      COLOR_MAP_MODAL[c].bg,
                      COLOR_MAP_MODAL[c].hoverBg,
                      formData.color === c
                        ? 'border-black/40 scale-110 shadow-md'
                        : 'border-black/10 hover:scale-105',
                      'disabled:cursor-not-allowed',
                    )}
                    title={
                      c === 'blanc-casse'
                        ? 'Blanc cassé (post-it planifié)'
                        : c.charAt(0).toUpperCase() + c.slice(1)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Priorité + Statut (personal uniquement) */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  preset="postit-action"
                  icon={Star}
                  onClick={() =>
                    !isReadOnly && handleFieldChange('isPriority', !formData.isPriority)
                  }
                  disabled={isReadOnly}
                  aria-label="Marquer comme prioritaire"
                  className={cn(
                    formData.isPriority
                      ? 'bg-[#f59e0b]/20 [&_svg]:fill-[#f59e0b] [&_svg]:text-[#f59e0b]'
                      : '[&_svg]:text-black/40',
                  )}
                />
                <span className="text-sm opacity-70">Marquer comme prioritaire</span>
              </div>

              {variant === 'personal' && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    preset="postit-action"
                    icon={personalData.status === 'done' ? RotateCcw : CheckCircle}
                    onClick={() =>
                      !isReadOnly &&
                      setPersonalData((prev) => ({
                        ...prev,
                        status: prev.status === 'done' ? 'en_cours' : 'done',
                      }))
                    }
                    disabled={isReadOnly}
                    aria-label={
                      personalData.status === 'done'
                        ? 'Marquer comme en cours'
                        : 'Marquer comme terminé'
                    }
                    className={cn(
                      personalData.status === 'done'
                        ? 'bg-green-500/20 [&_svg]:text-green-700'
                        : '[&_svg]:text-green-600',
                    )}
                  />
                  <span className="text-sm opacity-70">
                    {personalData.status === 'done'
                      ? 'Marquer comme en cours'
                      : 'Marquer comme terminé'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <div className="mt-5 flex justify-end">
              <Button
                preset="form-save"
                iconOnly
                icon={currentMode === 'create' ? Plus : Save}
                loading={loading}
                disabled={isSubmitDisabled()}
                aria-label={currentMode === 'create' ? 'Créer' : 'Enregistrer'}
              />
            </div>
          )}
          {isReadOnly && variant === 'assigned' && (
            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentMode('edit')}
              >
                Modifier
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
