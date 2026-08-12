import * as React from 'react';
import { Mail, NotepadText, X, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { SmartContactInput } from '@/components/forms/SmartContactInput';
import { toast } from '@/lib/toast';
import { getAdmin } from '@/services/users.service';
import { updateAdmin } from '@/services/admins.service';
import type { UpdateAdminDto } from '@/types/admin.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { profileEditValidationSchema } from '@/utils/validation-schemas';
import { useAuthStore } from '@/stores/authStore';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';
import { phoneToE164 } from '@/utils/phone-contact-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const defaultCountry = useDefaultPhoneCountry();
  const [formData, setFormData] = React.useState<UpdateAdminDto>({});
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<string>(defaultCountry);

  const validation = useFormValidation(profileEditValidationSchema);

  // Fetch the current user's data
  const { data: admin, isLoading } = useQuery({
    queryKey: ['admins', user?.id],
    queryFn: () => getAdmin(user.id),
    enabled: open && !!user?.id,
  });

  React.useEffect(() => {
    if (admin) {
      const initialData: UpdateAdminDto = {
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        displayName: admin.displayName || undefined,
        phone: admin.phone || undefined,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [admin]);

  const isEmailUID = !!admin?.email;

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateAdminDto) => updateAdmin(user.id, dto),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admins', user.id] });

      // Update auth store with new user data
      if (user) {
        setUser({
          ...user,
          firstName: updatedUser.firstName || user.firstName,
          lastName: updatedUser.lastName || user.lastName,
          displayName: updatedUser.displayName || user.displayName,
          phone: updatedUser.phone || user.phone,
          status: updatedUser.status || user.status,
        });
      }

      toast.success('Profil modifié avec succès !');
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification du profil');
    },
  });

  const handleFieldChange = (field: keyof UpdateAdminDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...formData, [field]: value };

    if (field === 'phone') {
      validation.validateField(field, value, {
        ...updatedData,
        _phoneCountryCode: phoneCountryCode,
      });
    } else {
      validation.validateField(field, value, updatedData);
    }

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

    const dto: UpdateAdminDto = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      displayName: formData.displayName || undefined,
      // Email-primary : on envoie le phone secondaire converti en E.164
      phone:
        isEmailUID && formData.phone ? phoneToE164(formData.phone, phoneCountryCode) : undefined,
      // Phone-primary : on envoie l'email secondaire s'il est renseigné
      email: !isEmailUID && formData.email?.trim() ? formData.email.trim() : undefined,
    };
    updateMutation.mutate(dto);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier mon profil</DialogTitle>
          <DialogDescription>Modifiez vos informations personnelles</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              <div className="form-section">
                <h4 className="form-section-title">
                  <NotepadText className="w-4 h-4" />
                  Informations personnelles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    value={formData.firstName || ''}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    placeholder="Ex: Marie"
                    maxLength={100}
                    state={validation.getFieldState('firstName')}
                    error={validation.getFieldError('firstName')}
                  />
                  <Input
                    label="Nom"
                    value={formData.lastName || ''}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    placeholder="Ex: Martin"
                    maxLength={100}
                    state={validation.getFieldState('lastName')}
                    error={validation.getFieldError('lastName')}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <Input
                    label="Nom d'affichage"
                    value={formData.displayName || ''}
                    onChange={(e) => handleFieldChange('displayName', e.target.value)}
                    onBlur={() => handleBlur('displayName')}
                    placeholder="Ex: M. Martin"
                    maxLength={50}
                    state={validation.getFieldState('displayName')}
                    error={validation.getFieldError('displayName')}
                  />
                  <SmartContactInput
                    label="Contact principal (identifiant)"
                    value=""
                    onContactChange={() => {}}
                    disabled
                    initialStoredEmail={admin?.email ?? null}
                    initialStoredPhone={admin?.phone ?? null}
                    helperText={
                      isEmailUID
                        ? "L'email ne peut pas être modifié car il sert d'identifiant de connexion"
                        : "Le téléphone ne peut pas être modifié car il sert d'identifiant de connexion"
                    }
                  />
                  {isEmailUID ? (
                    <PhoneInput
                      label="Numéro de téléphone (contact secondaire, optionnel)"
                      value={formData.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      onCountryChange={(country) => setPhoneCountryCode(country.code)}
                      countryCode={phoneCountryCode}
                      state={validation.getFieldState('phone')}
                      error={validation.getFieldError('phone')}
                      helperText="Numéro secondaire pour vous joindre"
                    />
                  ) : (
                    <Input
                      type="text"
                      label="Email (contact secondaire, optionnel)"
                      value={formData.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      icon={Mail}
                      placeholder="Ex: contact@example.com"
                      state={validation.getFieldState('email')}
                      error={validation.getFieldError('email')}
                      helperText="Email secondaire (le téléphone reste l'identifiant de connexion)"
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="md"
                icon={X}
                iconPosition="left"
                onClick={onClose}
                disabled={updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Save}
                iconPosition="left"
                onClick={handleSubmit}
                loading={updateMutation.isPending}
                disabled={!validation.isFormValid() || updateMutation.isPending}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
