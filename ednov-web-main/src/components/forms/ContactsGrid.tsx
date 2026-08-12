import * as React from 'react';
import { Plus, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { DynamicFunctionSelect } from '@/components/forms/DynamicFunctionSelect';
import { cn } from '@/lib/utils';
import type { EstablishmentContact } from '@/types/establishment.types';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';

interface ContactWithId extends EstablishmentContact {
  _tempId: string;
}

interface ContactsGridProps {
  value?: EstablishmentContact[];
  onChange?: (contacts: EstablishmentContact[]) => void;
  disabled?: boolean;
  className?: string;
}

const makeContactWithId = (contact: EstablishmentContact): ContactWithId => ({
  ...contact,
  _tempId: (contact as ContactWithId)._tempId || `contact-${Date.now()}-${Math.random()}`,
});

const makeDefaultContact = (): ContactWithId => ({
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  fonction: undefined,
  _tempId: `contact-${Date.now()}-${Math.random()}`,
});

export const ContactsGrid: React.FC<ContactsGridProps> = ({
  value = [],
  onChange,
  disabled = false,
  className,
}) => {
  const defaultCountry = useDefaultPhoneCountry();

  // État interne : toujours au moins un contact avec un _tempId stable.
  // Les IDs ne transitent pas par le parent — ils ne sont jamais régénérés
  // lors d'un re-render, ce qui évite toute perte de focus.
  const [contacts, setContacts] = React.useState<ContactWithId[]>(() => {
    const initial = value || [];
    return initial.length > 0 ? initial.map(makeContactWithId) : [makeDefaultContact()];
  });

  // Synchronisation depuis l'extérieur uniquement quand la donnée arrive sans
  // _tempId (chargement API dans EditView). Après la première saisie, value
  // contient toujours les _tempId → la condition est fausse → pas de reinit.
  const isFirstRun = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const external = value || [];
    const hasExternalIds = external.length > 0 && !!(external[0] as ContactWithId)._tempId;
    if (!hasExternalIds) {
      setContacts(external.length > 0 ? external.map(makeContactWithId) : [makeDefaultContact()]);
    }
  }, [value]);

  const addContact = () => {
    const updated = [...contacts, makeDefaultContact()];
    setContacts(updated);
    onChange?.(updated);
  };

  const removeContact = (tempId: string) => {
    if (contacts.length === 1) return;
    const updated = contacts.filter((c) => c._tempId !== tempId);
    setContacts(updated);
    onChange?.(updated);
  };

  const updateContact = (
    tempId: string,
    field: keyof EstablishmentContact,
    val: string | undefined,
  ) => {
    const updated = contacts.map((c) => (c._tempId === tempId ? { ...c, [field]: val } : c));
    setContacts(updated);
    onChange?.(updated);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-4">
        {contacts.map((contact, index) => {
          return (
            <div key={contact._tempId}>
              {contacts.length > 1 && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Contact {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContact(contact._tempId)}
                    disabled={disabled}
                    icon={Trash2}
                    className="text-error hover:text-error hover:bg-error-light"
                  >
                    Supprimer
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom du contact"
                  value={contact.contactName || ''}
                  onChange={(e) => {
                    updateContact(contact._tempId, 'contactName', e.target.value);
                  }}
                  disabled={disabled}
                  placeholder="Ex: Marie Dupont"
                  maxLength={255}
                />

                <DynamicFunctionSelect
                  label="Fonction"
                  value={contact.fonction || ''}
                  onChange={(val) => {
                    updateContact(contact._tempId, 'fonction', val);
                  }}
                  disabled={disabled}
                />

                <Input
                  label="Email"
                  type="email"
                  value={contact.contactEmail || ''}
                  onChange={(e) => {
                    updateContact(contact._tempId, 'contactEmail', e.target.value);
                  }}
                  disabled={disabled}
                  placeholder="Ex: cpe@college.fr"
                  maxLength={255}
                  icon={Mail}
                />

                <PhoneInput
                  label="Téléphone"
                  value={contact.contactPhone || ''}
                  onChange={(e) => {
                    updateContact(contact._tempId, 'contactPhone', e.target.value);
                  }}
                  countryCode={defaultCountry}
                  disabled={disabled}
                />
              </div>
              {index < contacts.length - 1 && (
                <div className="border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] mt-4" />
              )}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        icon={Plus}
        iconPosition="left"
        onClick={addContact}
        disabled={disabled}
        className="w-full mt-4"
      >
        Ajouter un contact
      </Button>
    </div>
  );
};
