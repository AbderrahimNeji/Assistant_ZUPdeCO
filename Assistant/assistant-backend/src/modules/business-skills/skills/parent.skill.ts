import { Injectable } from '@nestjs/common';

import { UserAdapter } from '../../integration/adapters/user.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, displayName, safeErrorMessage } from '../skill.utils';

/**
 * Parents / guardians are not a separate Ednov user module.
 * Contacts live on student profiles (guardianContact) — name/relationship only.
 */
@Injectable()
export class ParentSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'parent';
  readonly domains = [
    /\b(parent|parents|guardian|guardians|tuteur légal|tuteurs légaux|responsable légal|famille)\b/i,
  ];
  readonly domainTags = ['parent', 'guardian'];
  readonly capabilities: SkillCapability[] = ['search', 'list', 'status'];

  constructor(
    private readonly users: UserAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['Parent/guardian contacts require staff authorization.'],
        };
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const focusedStudentId = this.users.resolveFocusedStudentId();
      if (focusedStudentId) {
        try {
          const student = await this.users.findStudentById(focusedStudentId);
          const contacts = await this.users.listGuardianContacts(5);
          const forStudent = contacts.filter(
            (row) =>
              row.studentLabel === displayName(student) || contacts.length <= 5,
          );
          const rows = forStudent.length ? forStudent : contacts;
          return {
            skillId: this.id,
            ok: true,
            operation: 'focused_student_guardians',
            data: { studentLabel: displayName(student), rows },
            facts: [
              `Guardian contacts related to student ${displayName(student)} (names only — phones/emails never exposed):`,
              '',
              '| Student | Guardian | Relationship |',
              '| --- | --- | --- |',
              ...rows.map(
                (r) =>
                  `| ${r.studentLabel} | ${r.guardianName ?? '—'} | ${r.relationship ?? '—'} |`,
              ),
              rows.length
                ? ''
                : 'No guardianContact fields found on recent student profiles.',
            ],
          };
        } catch (error) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'focused_partial',
            data: null,
            facts: apiPartialFacts('Parents / guardian contacts', error),
            warnings: [safeErrorMessage(error)],
          };
        }
      }

      const rows = await this.users.listGuardianContacts(12);
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_guardians',
        data: rows,
        facts: [
          `Guardian contacts sample (${rows.length}, authorization-scoped, names only):`,
          '',
          '| Student | Guardian | Relationship |',
          '| --- | --- | --- |',
          ...(rows.length
            ? rows.map(
                (r) =>
                  `| ${r.studentLabel} | ${r.guardianName ?? '—'} | ${r.relationship ?? '—'} |`,
              )
            : ['| — | (none found) | — |']),
          '',
          'There is no dedicated Parents module API — contacts come from student guardianContact fields.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts(this.id, error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }
}
