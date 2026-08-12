import { useQuery } from '@tanstack/react-query';
import type {
  RecurrenceConfig as RecurrenceConfigType,
  RecurrenceMode,
  PostItColor,
} from '../../../types/post-it.types';
import { getNextOccurrences } from '../../../services/post-its.service';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, BORDER_COLOR_MAP, getScheduleChipClasses } from '../postit-config';

interface RecurrenceConfigProps {
  value: RecurrenceConfigType;
  onChange: (value: RecurrenceConfigType) => void;
  templateId?: string;
  color?: PostItColor;
}

const MODES_BASE: Array<{ value: RecurrenceMode; label: string; description: string }> = [
  { value: 'indefinitely', label: 'Indéfini', description: 'Toujours actif' },
  { value: 'n_times', label: 'Limité', description: 'N occurrences' },
];

const MODES_WITH_PICK: Array<{ value: RecurrenceMode; label: string; description: string }> = [
  ...MODES_BASE,
  { value: 'custom_pick', label: 'Sélection', description: 'Choisir manuellement' },
];

export function RecurrenceConfig({
  value,
  onChange,
  templateId,
  color = 'jaune',
}: RecurrenceConfigProps) {
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const modes = templateId ? MODES_WITH_PICK : MODES_BASE;

  const { data: occurrences = [] } = useQuery({
    queryKey: ['post-it-next-occurrences', templateId],
    queryFn: () => getNextOccurrences(templateId!, 12),
    enabled: value.mode === 'custom_pick' && !!templateId,
  });

  const handleModeChange = (mode: RecurrenceMode) => {
    onChange({ ...value, mode, count: undefined, pickedKeys: undefined });
  };

  const handleToggleOccurrence = (key: string) => {
    const current = value.pickedKeys || [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    onChange({ ...value, pickedKeys: updated });
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">Récurrence</p>

      <div className="flex gap-1.5">
        {modes.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => handleModeChange(m.value)}
            className={cn(
              'flex-1 px-2 py-1.5 rounded-lg border text-xs transition-all text-center',
              borderColor,
              getScheduleChipClasses(color, value.mode === m.value),
            )}
          >
            <div className="font-medium">{m.label}</div>
            <div className="opacity-60 text-[10px] mt-0.5">{m.description}</div>
          </button>
        ))}
      </div>

      {value.mode === 'n_times' && (
        <div className="flex items-center gap-2">
          <p className={cn('text-xs', textColor)}>Nombre d'occurrences :</p>
          <input
            type="number"
            min="1"
            max="100"
            value={value.count || 1}
            onChange={(e) => onChange({ ...value, count: Number.parseInt(e.target.value, 10) })}
            className={cn(
              'w-16 px-2 py-1 rounded border bg-white/5 text-sm text-center focus:outline-none focus:border-current',
              borderColor,
              textColor,
            )}
          />
        </div>
      )}

      {value.mode === 'custom_pick' && (
        <div className="space-y-1.5">
          <p className={cn('text-xs', textColor)}>Cochez les occurrences souhaitées :</p>
          {occurrences.length === 0 ? (
            <p className={cn('text-xs italic opacity-60', textColor)}>
              {templateId
                ? 'Aucune occurrence future disponible pour ce type de planification.'
                : "Disponible uniquement à l'édition d'une assignation existante."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {occurrences.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleOccurrence(key)}
                  className={cn(
                    'px-2 py-1 rounded text-xs border transition-all',
                    borderColor,
                    getScheduleChipClasses(color, (value.pickedKeys || []).includes(key)),
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
