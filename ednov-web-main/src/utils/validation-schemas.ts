import { ValidationSchema } from '@/hooks/useFormValidation';

/**
 * Règle de validation pour le champ contact unifié (création)
 * Utilisée dans les schémas de création admin, tuteur, et bénévole
 */
const createContactRule = {
  required: true,
  custom: (value: any, formData?: any) => {
    if (!value?.trim()) {
      return 'Un email ou numéro de téléphone est requis';
    }

    // Déterminer le type de contact
    const type = formData?._contactType;

    if (type === 'email') {
      // Validation email via regex basique
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Email invalide';
      }
    } else if (type === 'phone') {
      // La validation téléphone détaillée se fait dans useFormValidation avec phone: true
      // On vérifie juste qu'il y a au moins quelques chiffres
      const digitsOnly = value.replaceAll(/\D/g, '');
      if (digitsOnly.length < 6) {
        return 'Numéro de téléphone trop court';
      }
    } else if (type === 'unknown') {
      return 'Veuillez saisir un email ou un numéro de téléphone valide';
    }

    return undefined;
  },
};

/**
 * Règle de validation pour le champ contact secondaire (création)
 * Contact secondaire est optionnel mais doit être valide s'il est renseigné
 */
const createSecondaryContactRule = {
  required: false,
  custom: (value: any, formData?: any) => {
    if (!value?.trim()) return undefined; // champ vide = ok

    // Le type du contact secondaire est l'inverse du primaire
    const primaryType = formData?._contactType;
    const secondaryType = primaryType === 'email' ? 'phone' : 'email';

    if (secondaryType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Email invalide';
      }
    } else if (secondaryType === 'phone') {
      const digitsOnly = value.replaceAll(/\D/g, '');
      if (digitsOnly.length < 6) {
        return 'Numéro de téléphone trop court';
      }
    }

    return undefined;
  },
};

export const studentValidationSchema: ValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 20,
    custom: (value) => {
      if (typeof value === 'string' && value.trim().length === 1)
        return 'Le nom doit contenir au moins 2 caractères';
      return undefined;
    },
  },
  dateOfBirth: {
    required: false,
  },
  gender: {
    required: true,
  },
  levelId: {
    required: false,
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  displayName: {
    maxLength: 50,
  },
  addressLine1: {
    maxLength: 255,
  },
  department: {
    maxLength: 100,
  },
  postalCode: {
    maxLength: 20,
  },
  city: {
    maxLength: 100,
  },
  country: {
    maxLength: 2,
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
  medicalNotes: {
    maxLength: 500,
  },
};

export const teacherValidationSchema: ValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  email: {
    required: true,
    email: true,
  },
  phone: {
    required: true,
    phone: true,
  },
  dateOfBirth: {
    required: true,
    custom: (value) => {
      if (!value) return undefined;
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      if (age < 18 || age > 70) {
        return "L'âge doit être entre 18 et 70 ans";
      }
      return undefined;
    },
  },
  gender: {
    required: true,
  },
  subjectIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins une matière doit être sélectionnée';
      }
      return undefined;
    },
  },
  address: {
    maxLength: 200,
  },
  emergencyContact: {
    phone: true,
  },
  notes: {
    maxLength: 500,
  },
};

export const adminValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  email: {
    email: true,
    dependsOn: ['inviteBy'],
    custom: (value, formData) => {
      if (formData?.inviteBy === 'email' && !value) {
        return "L'email est requis";
      }
      return undefined;
    },
  },
  phone: {
    phone: true,
    dependsOn: ['inviteBy'],
    custom: (value, formData) => {
      if (formData?.inviteBy === 'phone' && !value) {
        return 'Le téléphone est requis';
      }
      return undefined;
    },
  },
  displayName: {
    maxLength: 50,
  },
  roleIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un rôle doit être sélectionné';
      }
      return undefined;
    },
  },
  profileId: {
    required: false,
  },
  dateOfBirth: {
    custom: (value) => {
      if (!value) return undefined;
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      if (age < 18 || age > 70) {
        return "L'âge doit être entre 18 et 70 ans";
      }
      return undefined;
    },
  },
  gender: {
    required: false,
  },
  establishmentIds: {
    required: false,
  },
};

// --- NOUVEAUX SCHÉMAS CREATE/EDIT SÉPARÉS ---

/**
 * Schéma pour la CRÉATION d'un admin (avec contact unifié)
 */
export const adminCreateValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  contact: createContactRule,
  secondaryContact: createSecondaryContactRule,
  displayName: {
    maxLength: 50,
  },
  roleIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un rôle doit être sélectionné';
      }
      return undefined;
    },
  },
  establishmentIds: {
    required: false,
  },
};

/**
 * Schéma pour l'ÉDITION d'un admin (phone optionnel sans validation stricte)
 */
export const adminEditValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  displayName: {
    maxLength: 50,
  },
  email: {
    required: false,
    email: true,
  },
  phone: {
    required: false,
    phone: true,
  },
  roleIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un rôle doit être sélectionné';
      }
      return undefined;
    },
  },
  establishmentIds: {
    required: false,
  },
};

export const classroomValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  levelId: {
    required: true,
  },
  capacity: {
    required: true,
    min: 1,
    max: 100,
  },
  mainTeacherId: {
    required: false,
  },
};

export const levelValidationSchema: ValidationSchema = {
  code: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Z0-9_-]+$/,
  },
  label: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  minAge: {
    min: 3,
    max: 25,
  },
  maxAge: {
    min: 3,
    max: 25,
    dependsOn: ['minAge'],
    custom: (value, formData) => {
      if (!value || !formData?.minAge) return undefined;
      const minAge = Number(formData.minAge);
      const maxAge = Number(value);
      if (maxAge < minAge) {
        return "L'âge maximum doit être supérieur à l'âge minimum";
      }
      return undefined;
    },
  },
};

export const subjectValidationSchema: ValidationSchema = {
  code: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Z0-9_-]+$/,
  },
  label: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  description: {
    maxLength: 500,
  },
};

export const programValidationSchema: ValidationSchema = {
  code: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Z0-9_-]+$/,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  description: {
    maxLength: 500,
  },
};

export const schoolYearValidationSchema: ValidationSchema = {
  code: {
    required: true,
    minLength: 4,
    maxLength: 20,
    pattern: /^\d{4}-\d{4}$/,
  },
  startDate: {
    required: true,
  },
  endDate: {
    required: true,
    dependsOn: ['startDate'],
    custom: (value, formData) => {
      if (!value || !formData?.startDate) return undefined;
      const start = new Date(formData.startDate);
      const end = new Date(value);
      if (end <= start) {
        return 'La date de fin doit être après la date de début';
      }
      return undefined;
    },
  },
};

export const holidayValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  startDate: {
    required: true,
  },
  endDate: {
    required: true,
    dependsOn: ['startDate'],
    custom: (value, formData) => {
      if (!value || !formData?.startDate) return undefined;
      const start = new Date(formData.startDate);
      const end = new Date(value);
      if (end < start) {
        return 'La date de fin doit être après ou égale à la date de début';
      }
      return undefined;
    },
  },
  description: {
    maxLength: 500,
  },
  establishmentId: {
    required: false,
  },
  vacationZoneId: {
    required: false,
  },
};

export const activityValidationSchema: ValidationSchema = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000,
  },
  activityType: {
    required: true,
  },
  date: {
    required: true,
  },
  startTime: {
    required: true,
  },
  endTime: {
    required: true,
    dependsOn: ['startTime'],
    custom: (value, formData) => {
      if (!value || !formData?.startTime) return undefined;
      if (value <= formData.startTime) {
        return "L'heure de fin doit être après l'heure de début";
      }
      return undefined;
    },
  },
  location: {
    maxLength: 200,
  },
  maxParticipants: {
    min: 1,
    max: 1000,
  },
  levelIds: {
    custom: (value) => {
      if (value && Array.isArray(value) && value.length === 0) {
        return undefined;
      }
      return undefined;
    },
  },
  classroomIds: {
    custom: (value) => {
      if (value && Array.isArray(value) && value.length === 0) {
        return undefined;
      }
      return undefined;
    },
  },
};

export const timetableValidationSchema: ValidationSchema = {
  classroomId: {
    required: true,
  },
  subjectId: {
    required: true,
  },
  teacherId: {
    required: true,
  },
  dayOfWeek: {
    required: true,
    min: 0,
    max: 6,
  },
  startTime: {
    required: true,
  },
  endTime: {
    required: true,
    dependsOn: ['startTime'],
    custom: (value, formData) => {
      if (!value || !formData?.startTime) return undefined;
      if (value <= formData.startTime) {
        return "L'heure de fin doit être après l'heure de début";
      }
      return undefined;
    },
  },
  room: {
    maxLength: 50,
  },
};

export const gradeValidationSchema: ValidationSchema = {
  studentId: {
    required: true,
  },
  subjectId: {
    required: true,
  },
  evaluationType: {
    required: true,
  },
  score: {
    required: true,
    min: 0,
    max: 20,
  },
  coefficient: {
    min: 0.5,
    max: 5,
  },
  date: {
    required: true,
  },
  comments: {
    maxLength: 500,
  },
};

export const attendanceValidationSchema: ValidationSchema = {
  studentId: {
    required: true,
  },
  date: {
    required: true,
  },
  status: {
    required: true,
  },
  reason: {
    maxLength: 500,
  },
};

export const loginValidationSchema: ValidationSchema = {
  identifier: {
    required: true,
    minLength: 3,
  },
  password: {
    required: true,
    minLength: 6,
  },
};

export const postItValidationSchema: ValidationSchema = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  thematic: {
    required: true,
  },
  content: {
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
  deadline: {
    required: false,
  },
  color: {
    required: false,
  },
  isPriority: {
    required: false,
  },
};

export const activityTypeValidationSchema: ValidationSchema = {
  code: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Z0-9_-]+$/,
  },
  label: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  description: {
    maxLength: 500,
  },
};

export const activityConfigValidationSchema: ValidationSchema = {
  code: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Z0-9_-]+$/,
  },
  label: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  description: {
    maxLength: 500,
  },
  activityTypeId: {
    required: true,
  },
  maxTutors: {
    min: 0,
    max: 100,
  },
  maxStudents: {
    min: 0,
    max: 100,
  },
  maxVolunteers: {
    min: 0,
    max: 100,
  },
  maxStudentsPerTutor: {
    min: 0,
    max: 100,
  },
};

export const sessionValidationSchema: ValidationSchema = {
  establishmentId: {
    required: true,
  },
  roomId: {
    required: false,
  },
  programId: {
    required: false,
  },
  levelIds: {
    required: false,
  },
  subjectIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins une matière doit être sélectionnée';
      }
      return undefined;
    },
  },
  classId: {
    required: false,
  },
  specialtyIds: {
    required: false,
  },
  activityId: {
    required: false,
  },
  sessionDate: {
    required: true,
  },
  startTime: {
    required: true,
  },
  endTime: {
    required: true,
    dependsOn: ['startTime'],
    custom: (value, formData) => {
      if (!value || !formData?.startTime) return undefined;
      if (value <= formData.startTime) {
        return "L'heure de fin doit être après l'heure de début";
      }
      return undefined;
    },
  },
  type: {
    required: true,
  },
  sessionFormat: {
    required: true,
  },
  mode: {
    required: true,
    dependsOn: ['recurrenceType'],
    custom: (value, formData) => {
      if (!value) return 'Le mode de séance est requis';
      if (
        value === 'recurring' &&
        (!formData?.recurrenceType || formData.recurrenceType === 'none')
      ) {
        return 'Veuillez sélectionner un type de récurrence pour une séance récurrente';
      }
      return undefined;
    },
  },
  recurrenceType: {
    required: false,
    dependsOn: ['mode'],
    custom: (value, formData) => {
      if (formData?.mode === 'recurring' && (!value || value === 'none')) {
        return 'Le type de récurrence est obligatoire pour une séance récurrente';
      }
      return undefined;
    },
  },
  recurrenceRule: {
    required: false,
    dependsOn: ['recurrenceType'],
    custom: (value, formData) => {
      if (formData?.recurrenceType === 'several_days_per_week') {
        const weekDays = value?.weekDays;
        if (!Array.isArray(weekDays) || weekDays.length === 0) {
          return 'Veuillez sélectionner au moins un jour de la semaine';
        }
      }
      return undefined;
    },
  },
  topic: {
    required: false,
    maxLength: 500,
  },
  joinLink: {
    required: false,
    url: true,
    dependsOn: ['sessionFormat'],
    custom: (value, formData) => {
      if (formData?.sessionFormat === 'remote' && !value) {
        return 'Le lien visio est obligatoire pour une séance à distance';
      }
      if (value && !/^https?:\/\/.+/.test(value)) {
        return 'Le lien doit être une URL valide (http:// ou https://)';
      }
      return undefined;
    },
  },
  internalNotes: {
    required: false,
    maxLength: 1000,
  },
  planDuringHolidays: {
    required: false,
  },
};

export const reportValidationSchema: ValidationSchema = {
  subject: {
    maxLength: 255,
  },
  comment: {
    maxLength: 1000,
  },
  rating: {
    min: 1,
    max: 5,
  },
};

export const vscReportValidationSchema: ValidationSchema = {
  summary: {
    maxLength: 1000,
  },
  progressEvaluation: {
    maxLength: 1000,
  },
  recommendations: {
    maxLength: 1000,
  },
  status: {
    required: true,
  },
  sessionsCompleted: {
    min: 0,
  },
  sessionsClosed: {
    min: 0,
  },
  sessionsCancelled: {
    min: 0,
  },
  assignmentsCreated: {
    min: 0,
  },
  reportsSubmitted: {
    min: 0,
  },
  reportsPending: {
    min: 0,
  },
  reportsValidated: {
    min: 0,
  },
  tutorHours: {
    min: 0,
  },
};

export const tutorValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  email: {
    email: true,
    dependsOn: ['inviteBy'],
    custom: (value, formData) => {
      if (formData?.inviteBy === 'email' && !value) {
        return "L'email est requis";
      }
      return undefined;
    },
  },
  phone: {
    phone: true,
    dependsOn: ['inviteBy'],
    custom: (value, formData) => {
      if (formData?.inviteBy === 'phone' && !value) {
        return 'Le téléphone est requis';
      }
      return undefined;
    },
  },
  displayName: {
    maxLength: 50,
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  profileId: {
    required: false,
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
};

/**
 * Schéma pour la CRÉATION d'un tuteur (avec contact unifié)
 */
export const tutorCreateValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  contact: createContactRule,
  secondaryContact: createSecondaryContactRule,
  displayName: {
    maxLength: 50,
  },
  roleIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un rôle doit être sélectionné';
      }
      return undefined;
    },
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
  gender: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return 'Le genre est obligatoire';
      return undefined;
    },
  },
  professionalSituation: {
    required: true,
    custom: (value) => {
      if (value === '' || value == null) {
        return 'La situation professionnelle est obligatoire';
      }
      if (!['employee', 'student', 'retired'].includes(String(value))) {
        return 'Sélectionnez une situation professionnelle valide';
      }
      return undefined;
    },
  },
  targetHours: {
    required: false,
    min: 0,
  },
  engagementStartDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de début d'engagement est obligatoire";
      return undefined;
    },
  },
  engagementEndDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de fin d'engagement est obligatoire";
      return undefined;
    },
  },
};

/**
 * Schéma pour l'ÉDITION d'un tuteur (phone optionnel sans validation stricte)
 */
export const tutorEditValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  displayName: {
    maxLength: 50,
  },
  email: {
    required: false,
    email: true,
  },
  phone: {
    required: false,
    phone: true,
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
  gender: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return 'Le genre est obligatoire';
      return undefined;
    },
  },
  professionalSituation: {
    required: false,
    custom: (value) => {
      if (value === '' || value == null) return undefined;
      if (!['employee', 'student', 'retired'].includes(String(value))) {
        return 'Sélectionnez une situation professionnelle valide';
      }
      return undefined;
    },
  },
  targetHours: {
    required: false,
    min: 0,
  },
  engagementStartDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de début d'engagement est obligatoire";
      return undefined;
    },
  },
  engagementEndDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de fin d'engagement est obligatoire";
      return undefined;
    },
  },
};

export const volunteerValidationSchema: ValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  email: {
    email: true,
    dependsOn: ['inviteBy'],
    custom: (value, formData) => {
      if (formData?.inviteBy === 'email' && !value) {
        return "L'email est requis";
      }
      return undefined;
    },
  },
  phone: {
    phone: true,
    dependsOn: ['inviteBy'],
    custom: (value, formData) => {
      if (formData?.inviteBy === 'phone' && !value) {
        return 'Le téléphone est requis';
      }
      return undefined;
    },
  },
  displayName: {
    maxLength: 50,
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  managedById: {
    required: false,
  },
  profileId: {
    required: false,
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
};

/**
 * Schéma pour la CRÉATION d'un bénévole (avec contact unifié)
 */
export const volunteerCreateValidationSchema: ValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  contact: createContactRule,
  secondaryContact: createSecondaryContactRule,
  displayName: {
    maxLength: 50,
  },
  roleIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un rôle doit être sélectionné';
      }
      return undefined;
    },
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  gender: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return 'Le genre est obligatoire';
      return undefined;
    },
  },
  managedById: {
    required: false,
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
  engagementStartDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de début d'engagement est obligatoire";
      return undefined;
    },
  },
  engagementEndDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de fin d'engagement est obligatoire";
      return undefined;
    },
  },
};

/**
 * Schéma pour l'ÉDITION d'un bénévole (phone optionnel sans validation stricte)
 */
export const volunteerEditValidationSchema: ValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  displayName: {
    maxLength: 50,
  },
  email: {
    required: false,
    email: true,
  },
  phone: {
    required: false,
    phone: true,
  },
  establishmentIds: {
    required: true,
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Au moins un établissement doit être sélectionné';
      }
      return undefined;
    },
  },
  gender: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return 'Le genre est obligatoire';
      return undefined;
    },
  },
  managedById: {
    required: false,
  },
  subjects: {
    required: false,
  },
  availability: {
    required: false,
  },
  engagementStartDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de début d'engagement est obligatoire";
      return undefined;
    },
  },
  engagementEndDate: {
    required: true,
    custom: (value) => {
      if (!value || value === '') return "La date de fin d'engagement est obligatoire";
      return undefined;
    },
  },
};

export const establishmentValidationSchema: ValidationSchema = {
  uaiCode: {
    required: false,
    minLength: 7,
    maxLength: 8,
    pattern: /^\d{7}[A-Z]$/,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  officialName: {
    maxLength: 255,
  },
  type: {
    required: true,
  },
  status: {
    required: false,
  },
  addressLine1: {
    maxLength: 255,
  },
  department: {
    maxLength: 100,
  },
  postalCode: {
    maxLength: 20,
  },
  city: {
    maxLength: 100,
  },
  country: {
    maxLength: 2,
    pattern: /^[A-Z]{2}$/,
  },
  timezone: {
    maxLength: 50,
  },
  contactName: {
    maxLength: 255,
  },
  contactEmail: {
    email: true,
    maxLength: 255,
  },
  contactPhone: {
    phone: true,
    maxLength: 50,
  },
  studentQuota: {
    min: 0,
    max: 10000,
  },
  volunteerQuota: {
    min: 0,
    max: 10000,
  },
  managedById: {
    required: false,
  },
};

export const profileEditValidationSchema: ValidationSchema = {
  firstName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    required: false,
    minLength: 2,
    maxLength: 100,
  },
  displayName: {
    required: false,
    maxLength: 50,
  },
  email: {
    required: false,
    email: true,
  },
  phone: {
    required: false,
    phone: true,
  },
  status: {
    required: false,
  },
};
