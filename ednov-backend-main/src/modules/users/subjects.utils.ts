import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../academic/entities/subject.entity';

/**
 * UserProfile.subjects is JSONB; session has subjectId (UUID).
 * We consider a user "matching" session subject if their profile subjects array contains the subjectId (string).
 */

export function profileHasSubject(profileSubjects: unknown[] | null | undefined, subjectId: string | null): boolean {
  if (!subjectId) return true;
  if (!Array.isArray(profileSubjects) || profileSubjects.length === 0) return false;
  const idStr = subjectId.toLowerCase();
  return profileSubjects.some((s) => {
    if (typeof s === 'string') return s.toLowerCase() === idStr;
    if (s && typeof s === 'object' && 'id' in s) return String((s as { id: unknown }).id).toLowerCase() === idStr;
    return false;
  });
}

/**
 * SQL filter for user_profiles.subjects JSONB (array of UUID strings and/or { id } objects).
 * Semantics match {@link profileHasSubject}: user matches if any selected id appears in the array.
 */
export function appendUserProfileSubjectJsonbFilter(
  qb: SelectQueryBuilder<ObjectLiteral>,
  subjectIds: string[],
  options: { profileAlias?: string; paramSuffix?: string } = {},
): void {
  if (!subjectIds.length) return;
  const profileAlias = options.profileAlias ?? 'userProfile';
  const suffix = options.paramSuffix ?? 'subj';
  const paramKey = `subjectFilterIds_${suffix}`;
  const elAlias = `subj_el_${suffix}`;
  const lowered = subjectIds.map((id) => id.toLowerCase());
  qb.andWhere(
    `EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE("${profileAlias}"."subjects", '[]'::jsonb)) AS ${elAlias}
      WHERE (
        (jsonb_typeof(${elAlias}) = 'string' AND lower(${elAlias} #>> '{}') IN (:...${paramKey}))
        OR (jsonb_typeof(${elAlias}) = 'object' AND lower(${elAlias}->>'id') IN (:...${paramKey}))
      )
    )`,
    { [paramKey]: lowered },
  );
}

/**
 * Resolve subject names (labels) from subject IDs.
 * Returns an array of subject labels corresponding to the provided subject IDs.
 */
export async function resolveSubjectNames(
  subjectIds: string[] | null | undefined,
  subjectRepository: Repository<Subject>,
): Promise<string[]> {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    return [];
  }

  const subjects = await subjectRepository
    .createQueryBuilder('subject')
    .where('subject.id IN (:...ids)', { ids: subjectIds })
    .andWhere('subject.status = :status', { status: 'active' })
    .select(['subject.id', 'subject.label'])
    .getMany();

  const subjectMap = new Map(subjects.map((s) => [s.id, s.label]));
  return subjectIds.map((id) => subjectMap.get(id)).filter((label): label is string => !!label);
}
