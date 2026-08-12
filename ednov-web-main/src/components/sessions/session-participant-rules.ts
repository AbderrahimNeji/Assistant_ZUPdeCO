import type { CreateSessionDto, SessionType } from '@/types/session.types';
import type { UserWithProfile } from '@/types/user.types';
import { getUserRoleGroup } from '@/types/user.types';

/** VSC (groupe volunteers) : peut être présent sans élève assigné, sans séance dédiée. */
export function isVscTutor(user: UserWithProfile): boolean {
  return getUserRoleGroup(user) === 'volunteers';
}

/** Rôle affiché / persisté pour un facilitateur ajouté depuis la colonne tuteurs. */
export function facilitatorRoleForSession(user: UserWithProfile): 'tutor' | 'volunteer' {
  return isVscTutor(user) ? 'volunteer' : 'tutor';
}

export function buildSessionPairs(
  tutorIds: string[],
  studentIds: string[],
): Array<{ studentUserId: string; tutorUserId: string }> {
  const pairs: Array<{ studentUserId: string; tutorUserId: string }> = [];
  for (const studentUserId of studentIds) {
    for (const tutorUserId of tutorIds) {
      pairs.push({ studentUserId, tutorUserId });
    }
  }
  return pairs;
}

export function isGroupSessionType(type: SessionType | ''): boolean {
  return type === 'homework_help' || type === 'workshop';
}

export function getMaxTutorsForSessionType(
  type: SessionType | '',
  activityMaxTutors: number | null | undefined,
): number | null {
  if (type === 'individual_tutoring') {
    return 1;
  }
  return activityMaxTutors ?? null;
}

export function tutorLimitMessageForSessionType(
  type: SessionType | '',
  maxTutors: number | null,
  incomingName?: string,
): string {
  if (type === 'individual_tutoring') {
    return incomingName
      ? `Tutorat individuel : un seul tuteur autorisé. Retirez le tuteur actuel avant d'ajouter ${incomingName}.`
      : 'Tutorat individuel : un seul tuteur est autorisé. Retirez le tuteur actuel pour en ajouter un autre.';
  }
  return `Capacité maximale atteinte (${maxTutors} tuteur(s))`;
}

export function studentToTutorFromPairs(
  pairs: Array<{ studentUserId: string; tutorUserId: string }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of pairs) {
    map[p.studentUserId] = p.tutorUserId;
  }
  return map;
}

/** VSC présents dans la planification sans élève assigné (pas de séance dédiée). */
export function getFloatingVscTutorIds(
  tutors: UserWithProfile[],
  studentToTutor: Record<string, string>,
): string[] {
  return tutors
    .filter((t) => isVscTutor(t) && !Object.values(studentToTutor).includes(t.id))
    .map((t) => t.id);
}

/** Tuteurs / VSC qui génèrent une séance (1 séance par entrée). */
export function getGroupSessionOwnerTutors(
  tutors: UserWithProfile[],
  studentToTutor: Record<string, string>,
): UserWithProfile[] {
  return tutors.filter((t) => {
    if (!isVscTutor(t)) return true;
    return Object.values(studentToTutor).includes(t.id);
  });
}

export function validateMinParticipants(
  tutors: UserWithProfile[],
  students: UserWithProfile[],
  options?: { isGroupMode?: boolean; studentToTutor?: Record<string, string> },
): { valid: boolean; message?: string } {
  if (tutors.length < 1) {
    return {
      valid: false,
      message: 'Ajoutez au moins un tuteur avant d\u2019enregistrer la séance.',
    };
  }

  if (options?.isGroupMode) {
    const sessionOwners = getGroupSessionOwnerTutors(tutors, options.studentToTutor ?? {});
    if (sessionOwners.length < 1) {
      return {
        valid: false,
        message:
          'Ajoutez au moins un tuteur avec des élèves pour créer une séance. Un VSC sans élève sera ajouté comme participant sur les autres groupes.',
      };
    }
    const requiresStudents = sessionOwners.some((t) => !isVscTutor(t));
    if (requiresStudents && students.length < 1) {
      return {
        valid: false,
        message: 'Ajoutez au moins un élève avant d\u2019enregistrer la séance.',
      };
    }
    return { valid: true };
  }

  const requiresStudents = tutors.some((t) => !isVscTutor(t));
  if (requiresStudents && students.length < 1) {
    return {
      valid: false,
      message: 'Ajoutez au moins un élève avant d\u2019enregistrer la séance.',
    };
  }

  return { valid: true };
}

/** Payload participants pour l’édition d’une séance en mode groupes (une seule séance, plusieurs tuteurs). */
export function buildGroupModeUpdateParticipantPayload(
  tutors: UserWithProfile[],
  students: UserWithProfile[],
  studentToTutor: Record<string, string>,
): {
  tutorIds: string[];
  studentIds: string[];
  volunteerIds: string[];
  pairs: Array<{ studentUserId: string; tutorUserId: string }>;
} {
  const tutorIds = getGroupSessionOwnerTutors(tutors, studentToTutor).map((t) => t.id);
  const studentIds = students.map((s) => s.id);
  const volunteerIds = getFloatingVscTutorIds(tutors, studentToTutor);
  const pairs = Object.entries(studentToTutor).map(([studentUserId, tutorUserId]) => ({
    studentUserId,
    tutorUserId,
  }));
  return { tutorIds, studentIds, volunteerIds, pairs };
}

export function buildGroupModeSessionDtos(
  tutors: UserWithProfile[],
  studentToTutor: Record<string, string>,
  baseDto: Omit<CreateSessionDto, 'tutorIds' | 'studentIds' | 'volunteerIds' | 'pairs'>,
): CreateSessionDto[] {
  const floatingVscIds = getFloatingVscTutorIds(tutors, studentToTutor);
  const sessionOwners = getGroupSessionOwnerTutors(tutors, studentToTutor);

  return sessionOwners.map((tutor) => {
    const studentIds = Object.entries(studentToTutor)
      .filter(([, tid]) => tid === tutor.id)
      .map(([sid]) => sid);
    const tutorIds = [tutor.id];
    const volunteerIds = floatingVscIds.filter((id) => id !== tutor.id);
    return {
      ...baseDto,
      tutorIds,
      studentIds,
      volunteerIds,
      pairs: buildSessionPairs(tutorIds, studentIds),
    };
  });
}

/**
 * Vérifie les DTOs « 1 séance par tuteur » avant envoi bulk : chaque tuteur non-VSC doit avoir des élèves.
 */
export function validateGroupSessionDtos(
  tutors: UserWithProfile[],
  studentToTutor: Record<string, string>,
  dtos: Array<{ tutorIds?: string[]; studentIds?: string[] }>,
): { valid: boolean; message?: string } {
  const withoutStudents = getGroupSessionOwnerTutors(tutors, studentToTutor)
    .filter((t) => !isVscTutor(t))
    .filter((t) => {
      const dto = dtos.find((d) => d.tutorIds?.includes(t.id));
      return (dto?.studentIds?.length ?? 0) < 1;
    });
  if (withoutStudents.length === 0) {
    return { valid: true };
  }
  const names = withoutStudents
    .slice(0, 3)
    .map((t) => `${t.firstName} ${t.lastName}`.trim())
    .join(', ');
  const suffix = withoutStudents.length > 3 ? ` et ${withoutStudents.length - 3} autre(s)` : '';
  return {
    valid: false,
    message: `Chaque tuteur doit avoir au moins un élève : ${names}${suffix}.`,
  };
}

/** Création mode groupes : chaque tuteur (hors VSC) doit avoir au moins un élève assigné. */
export function validateGroupCreateTutorsHaveStudents(
  tutors: UserWithProfile[],
  studentToTutor: Record<string, string>,
): { valid: boolean; message?: string } {
  const withoutStudents = tutors
    .filter((t) => !isVscTutor(t))
    .filter((t) => !Object.values(studentToTutor).includes(t.id));
  if (withoutStudents.length === 0) {
    return { valid: true };
  }
  const names = withoutStudents
    .slice(0, 3)
    .map((t) => `${t.firstName} ${t.lastName}`.trim())
    .join(', ');
  const suffix = withoutStudents.length > 3 ? ` et ${withoutStudents.length - 3} autre(s)` : '';
  return {
    valid: false,
    message: `Chaque tuteur doit avoir au moins un élève : ${names}${suffix}.`,
  };
}

export function validateOrphanStudentsForGroupMode(
  students: UserWithProfile[],
  studentToTutor: Record<string, string>,
): { valid: boolean; message?: string } {
  const orphans = students.filter((s) => !studentToTutor[s.id]);
  if (orphans.length === 0) {
    return { valid: true };
  }
  const names = orphans
    .slice(0, 3)
    .map((s) => `${s.firstName} ${s.lastName}`.trim())
    .join(', ');
  const suffix = orphans.length > 3 ? ` et ${orphans.length - 3} autre(s)` : '';
  return {
    valid: false,
    message: `Chaque élève doit être assigné à un tuteur : ${names}${suffix}. Utilisez l'affectation automatique ou glissez-les sous un tuteur.`,
  };
}
