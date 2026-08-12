import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/forms/Select';
import { Input } from '@/components/forms/Input';
import { getContactFunctions } from '@/services/contact-functions.service';
import type { SelectOption } from '@/components/forms/Select';

interface DynamicFunctionSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const OTHER_VALUE = '__OTHER__';

export const DynamicFunctionSelect: React.FC<DynamicFunctionSelectProps> = ({
  value = '',
  onChange,
  disabled = false,
  label = 'Fonction',
  className,
}) => {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');
  const [initialized, setInitialized] = React.useState(false);

  const { data: functions = [], isLoading } = useQuery({
    queryKey: ['contact-functions'],
    queryFn: getContactFunctions,
  });

  React.useEffect(() => {
    if (isLoading || functions.length === 0) {
      return;
    }

    if (!initialized) {
      setInitialized(true);
    }

    if (!value || value === '') {
      setShowCustomInput(false);
      setCustomValue('');
      return;
    }

    const isExistingFunction = functions.some((f) => f.label === value);
    if (!isExistingFunction) {
      setShowCustomInput(true);
      setCustomValue(value);
    } else {
      setShowCustomInput(false);
      setCustomValue('');
    }
  }, [value, functions, isLoading]);

  const options: SelectOption[] = React.useMemo(() => {
    const opts: SelectOption[] = [{ value: '', label: 'Sélectionner une fonction' }];

    functions
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
        return a.label.localeCompare(b.label);
      })
      .forEach((func) => {
        opts.push({ value: func.label, label: func.label });
      });

    opts.push({ value: OTHER_VALUE, label: 'Autre...' });

    return opts;
  }, [functions]);

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === OTHER_VALUE) {
      setShowCustomInput(true);
      setCustomValue('');
      onChange?.('');
    } else {
      setShowCustomInput(false);
      setCustomValue('');
      onChange?.(selectedValue);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    onChange?.(newValue);
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Select
          label={label}
          value=""
          options={[{ value: '', label: 'Chargement...' }]}
          disabled={true}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {showCustomInput ? (
        <div className="space-y-2">
          <Input
            label={label}
            value={customValue}
            onChange={handleCustomInputChange}
            disabled={disabled}
            placeholder="Ex: CPE, Proviseur..."
            maxLength={100}
          />
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue('');
              onChange?.('');
            }}
            disabled={disabled}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Choisir dans la liste
          </button>
        </div>
      ) : (
        <Select
          label={label}
          value={value || ''}
          onChange={handleSelectChange}
          disabled={disabled}
          options={options}
          placeholder="Sélectionner une fonction"
        />
      )}
    </div>
  );
};
