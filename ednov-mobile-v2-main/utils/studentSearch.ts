import type { Student } from '@/types/student';

import { getStudentDisplayName } from '@/utils/studentDisplay';

/** Search uses public display name and programme only (not legal names). */
export function filterStudentsBySearch(students: Student[], query: string): Student[] {
  const trimmed = query.trim();
  if (!trimmed) return students;

  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  return students.filter((s) => {
    const display = getStudentDisplayName(s).toLowerCase();
    const program = (s.program ?? '').toLowerCase();
    const level = (s.levelLabel ?? '').toLowerCase();

    return terms.every((term) => display.includes(term) || program.includes(term) || level.includes(term));
  });
}
