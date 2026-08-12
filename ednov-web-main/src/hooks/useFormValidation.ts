import { useState, useCallback, useMemo } from 'react';
import { validatePhoneByCountry, getPhoneFormat } from '@/utils/phone-formats';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  custom?: (value: any, formData?: any) => string | undefined;
  dependsOn?: string[];
  attendanceValidation?: boolean;
  phoneCountryCode?: string;
}

export interface FieldValidation {
  isValid: boolean;
  isTouched: boolean;
  isDirty: boolean;
  error?: string;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface UseFormValidationReturn {
  fields: Record<string, FieldValidation>;
  validateField: (fieldName: string, value: any, formData?: any) => boolean;
  validateForm: (formData: any) => boolean;
  validateInitialFormData: (formData: any) => void;
  isFormValid: () => boolean;
  markAsTouched: (fieldName: string) => void;
  markAsDirty: (fieldName: string) => void;
  resetValidation: () => void;
  getFieldState: (fieldName: string) => 'default' | 'error' | 'success';
  getFieldError: (fieldName: string) => string | undefined;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;

export const useFormValidation = (
  schema: ValidationSchema,
  debounceMs: number = 0,
): UseFormValidationReturn => {
  const [fields, setFields] = useState<Record<string, FieldValidation>>(() => {
    const initialFields: Record<string, FieldValidation> = {};
    Object.keys(schema).forEach((fieldName) => {
      initialFields[fieldName] = {
        isValid: !schema[fieldName].required,
        isTouched: false,
        isDirty: false,
        error: undefined,
      };
    });
    return initialFields;
  });

  const [debounceTimers, setDebounceTimers] = useState<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const validateFieldValue = useCallback(
    (fieldName: string, value: any, formData?: any): { isValid: boolean; error?: string } => {
      const rule = schema[fieldName];
      if (!rule) return { isValid: true };

      if (rule.required) {
        if (value === undefined || value === null || value === '') {
          return { isValid: false, error: 'Ce champ est obligatoire' };
        }
        if (Array.isArray(value) && value.length === 0) {
          return { isValid: false, error: 'Au moins une sélection est requise' };
        }
      }

      if (value && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          return {
            isValid: false,
            error: `Minimum ${rule.minLength} caractères requis`,
          };
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          return {
            isValid: false,
            error: `Maximum ${rule.maxLength} caractères autorisés`,
          };
        }

        if (rule.email && !EMAIL_REGEX.test(value)) {
          return { isValid: false, error: 'Email invalide' };
        }

        if (rule.phone) {
          const countryCode =
            (formData?._phoneCountryCode as string) || rule.phoneCountryCode || 'FR';
          const digitsOnly = value.replaceAll(/\D/g, '');
          const format = getPhoneFormat(countryCode);

          if (!format) {
            return { isValid: false, error: 'Numéro de téléphone invalide' };
          }

          if (digitsOnly.length < format.minLength) {
            return {
              isValid: false,
              error: `Le numéro doit contenir au moins ${format.minLength} chiffres`,
            };
          }

          if (digitsOnly.length > format.maxLength) {
            return {
              isValid: false,
              error: `Le numéro ne peut pas dépasser ${format.maxLength} chiffres`,
            };
          }

          if (!validatePhoneByCountry(value, countryCode)) {
            return { isValid: false, error: 'Format de numéro invalide pour ce pays' };
          }
        }

        if (rule.url && !URL_REGEX.test(value)) {
          return { isValid: false, error: 'URL invalide' };
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          return { isValid: false, error: 'Format invalide' };
        }
      }

      if (typeof value === 'number' || (value && !isNaN(Number(value)))) {
        const numValue = typeof value === 'number' ? value : Number(value);

        if (rule.min !== undefined && numValue < rule.min) {
          return { isValid: false, error: `Minimum ${rule.min}` };
        }

        if (rule.max !== undefined && numValue > rule.max) {
          return { isValid: false, error: `Maximum ${rule.max}` };
        }
      }

      if (rule.attendanceValidation && value) {
        if (value.attendanceStatus === 'absent') {
          if (!value.absenceReason) {
            return { isValid: false, error: "Un motif d'absence est requis" };
          }
          if (value.absenceReason === 'other' && !value.absenceJustification?.trim()) {
            return { isValid: false, error: 'Veuillez préciser le motif' };
          }
        }
      }

      if (rule.custom) {
        const customError = rule.custom(value, formData);
        if (customError) {
          return { isValid: false, error: customError };
        }
      }

      return { isValid: true };
    },
    [schema],
  );

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): boolean => {
      const performValidation = () => {
        const { isValid, error } = validateFieldValue(fieldName, value, formData);

        setFields((prev) => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            isValid,
            error,
          },
        }));

        const rule = schema[fieldName];
        if (rule?.dependsOn) {
          rule.dependsOn.forEach((dependentField) => {
            if (formData && formData[dependentField] !== undefined) {
              const { isValid: depIsValid, error: depError } = validateFieldValue(
                dependentField,
                formData[dependentField],
                formData,
              );
              setFields((prev) => ({
                ...prev,
                [dependentField]: {
                  ...prev[dependentField],
                  isValid: depIsValid,
                  error: depError,
                },
              }));
            }
          });
        }

        Object.keys(schema).forEach((otherFieldName) => {
          if (otherFieldName !== fieldName) {
            const otherRule = schema[otherFieldName];
            if (otherRule?.dependsOn?.includes(fieldName)) {
              if (formData && formData[otherFieldName] !== undefined) {
                const { isValid: depIsValid, error: depError } = validateFieldValue(
                  otherFieldName,
                  formData[otherFieldName],
                  formData,
                );
                setFields((prev) => ({
                  ...prev,
                  [otherFieldName]: {
                    ...prev[otherFieldName],
                    isValid: depIsValid,
                    error: depError,
                  },
                }));
              }
            }
          }
        });

        return isValid;
      };

      if (debounceMs > 0) {
        if (debounceTimers[fieldName]) {
          clearTimeout(debounceTimers[fieldName]);
        }

        const timer = setTimeout(performValidation, debounceMs);
        setDebounceTimers((prev) => ({ ...prev, [fieldName]: timer }));

        return true;
      } else {
        return performValidation();
      }
    },
    [validateFieldValue, schema, debounceMs, debounceTimers],
  );

  const validateForm = useCallback(
    (formData: any): boolean => {
      let isValid = true;

      Object.keys(schema).forEach((fieldName) => {
        let fieldValue;

        if (fieldName.includes('.')) {
          const parts = fieldName.split('.');
          fieldValue = parts.reduce((obj, key) => obj?.[key], formData);
        } else {
          fieldValue = formData[fieldName];
        }

        const fieldIsValid = validateField(fieldName, fieldValue, formData);
        if (!fieldIsValid) {
          isValid = false;
        }
      });

      return isValid;
    },
    [schema, validateField],
  );

  const validateInitialFormData = useCallback(
    (formData: any): void => {
      const updatedFields: Record<string, FieldValidation> = {};

      Object.keys(schema).forEach((fieldName) => {
        let fieldValue;

        if (fieldName.includes('.')) {
          const parts = fieldName.split('.');
          fieldValue = parts.reduce((obj, key) => obj?.[key], formData);
        } else {
          fieldValue = formData[fieldName];
        }

        const { isValid, error } = validateFieldValue(fieldName, fieldValue, formData);

        updatedFields[fieldName] = {
          isValid,
          isTouched: false,
          isDirty: false,
          error,
        };
      });

      setFields(updatedFields);
    },
    [schema, validateFieldValue],
  );

  const isFormValid = useCallback((): boolean => {
    return Object.values(fields).every((field) => field.isValid);
  }, [fields]);

  const markAsTouched = useCallback((fieldName: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        isValid: true,
        isDirty: false,
        ...prev[fieldName],
        isTouched: true,
      },
    }));
  }, []);

  const markAsDirty = useCallback((fieldName: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: {
        isValid: true,
        isTouched: false,
        ...prev[fieldName],
        isDirty: true,
      },
    }));
  }, []);

  const resetValidation = useCallback(() => {
    const resetFields: Record<string, FieldValidation> = {};
    Object.keys(schema).forEach((fieldName) => {
      resetFields[fieldName] = {
        isValid: !schema[fieldName].required,
        isTouched: false,
        isDirty: false,
        error: undefined,
      };
    });
    setFields(resetFields);
  }, [schema]);

  const getFieldState = useCallback(
    (fieldName: string): 'default' | 'error' | 'success' => {
      const field = fields[fieldName];
      if (!field || !field.isTouched) return 'default';
      return field.isValid ? 'success' : 'error';
    },
    [fields],
  );

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      const field = fields[fieldName];
      if (!field || !field.isTouched) return undefined;
      return field.error;
    },
    [fields],
  );

  const isDirty = useMemo(() => {
    return Object.values(fields).some((field) => field.isDirty);
  }, [fields]);

  return {
    fields,
    validateField,
    validateForm,
    validateInitialFormData,
    isFormValid,
    markAsTouched,
    markAsDirty,
    resetValidation,
    getFieldState,
    getFieldError,
    isDirty,
  } as UseFormValidationReturn & { isDirty: boolean };
};
