import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

/**
 * Page-aware coordinator follow-ups (templates only — no new suggestion engine).
 * Suggests useful next actions after answers when page / selection context exists.
 */
@Injectable()
export class FollowUpSuggestionContributor implements SuggestionContributor {
  readonly id = 'follow_up';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const page = `${context.pageInterfaceId ?? ''} ${context.pageRoute ?? ''} ${context.pageTitle ?? ''}`.toLowerCase();
    const kinds = new Set(
      (context.focusedEntityKinds ?? [])
        .map((k) => k.toLowerCase())
        .concat(context.selectionType ? [context.selectionType.toLowerCase()] : []),
    );
    const q = `${context.question} ${context.answer}`.toLowerCase();
    const label = context.selectionLabel?.trim();

    const out: SuggestedAction[] = [];

    const push = (action: SuggestedAction) => {
      if (out.length >= 4) return;
      out.push(action);
    };

    const onMatchingPage =
      kinds.has('matching') ||
      /\b(match|matching|appari|binome|binôme)\b/.test(page);

    const onStudentsPage =
      (/\b(student|élève|eleve)\b/.test(page) && !onMatchingPage) ||
      (kinds.has('student') && !onMatchingPage);

    // Matching chips first when on Matching — do not crowd them out.
    if (onMatchingPage || /\b(match|matching|appari|sans tuteur|binome|binôme)\b/.test(q)) {
      push({
        id: 'follow_up.assign_tutor',
        label: 'Assign tutor',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `What is missing to assign a tutor to ${label}?`
            : 'What is missing to assign a tutor?',
        },
      });
      push({
        id: 'follow_up.open_student_profile',
        label: 'Open student profile',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Open or summarize the student profile for ${label}`
            : 'Open or summarize the student profile for this matching selection',
        },
      });
      push({
        id: 'follow_up.view_tutor_availability',
        label: 'View tutor availability',
        type: 'follow_up_question',
        payload: {
          message:
            'Which tutors are available / eligible for this matching or session?',
        },
      });
      push({
        id: 'follow_up.matching_report',
        label: 'Generate matching report',
        type: 'follow_up_question',
        payload: {
          message:
            'Generate a matching report: active pairs, unmatched students, and tutor workload from live data',
        },
      });
      push({
        id: 'follow_up.notify_coordinator',
        label: 'Notify coordinator',
        type: 'follow_up_question',
        payload: {
          message:
            'What should I notify the coordinator about to finalize these matchings?',
        },
      });
    }

    if (onStudentsPage) {
      push({
        id: 'follow_up.view_profile',
        label: label ? `View profile — ${label}` : 'View profile',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Show the profile for ${label}`
            : 'Show the profile for this student',
        },
      });
      push({
        id: 'follow_up.open_tutor',
        label: 'Open tutor',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Who is the tutor for ${label}? Summarize or open the tutor.`
            : 'Who is the tutor for this student? Summarize or open the tutor.',
        },
      });
      push({
        id: 'follow_up.generate_student_summary',
        label: 'Generate summary',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Generate a short coordinator summary for student ${label}`
            : 'Generate a short coordinator summary for this student',
        },
      });
      push({
        id: 'follow_up.view_reports',
        label: 'View reports',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `What reports are available for ${label}?`
            : 'What reports are available for this student?',
        },
      });
      push({
        id: 'follow_up.attendance',
        label: 'Attendance',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `What do we know about attendance for ${label}?`
            : 'What do we know about attendance for this student?',
        },
      });
      push({
        id: 'follow_up.schedule_session',
        label: 'Schedule session',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Help me schedule a session for ${label}`
            : 'Help me schedule a session for this student',
        },
      });
      push({
        id: 'follow_up.notify_student_coord',
        label: 'Notify coordinator',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `What should I notify the coordinator about regarding ${label}?`
            : 'What should I notify the coordinator about regarding this student?',
        },
      });
    } else if (
      !onMatchingPage &&
      (kinds.has('student') ||
        /\b(student|élève|eleve)\b/.test(q))
    ) {
      push({
        id: 'follow_up.view_profile',
        label: label ? `View profile — ${label}` : 'View profile',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Show the profile for ${label}`
            : 'Show the profile for this student',
        },
      });
    }

    if (
      kinds.has('tutor') ||
      /\b(tutor|tuteur)\b/.test(page) ||
      /\b(tutor|tuteur)\b/.test(q)
    ) {
      const onTutorsPage =
        (/\b(tutor|tuteur)\b/.test(page) && !onMatchingPage) ||
        (kinds.has('tutor') && !onMatchingPage && !onStudentsPage);
      const focusedTutor = kinds.has('tutor');

      if (onTutorsPage || focusedTutor) {
        push({
          id: 'follow_up.view_timetable',
          label: 'View timetable',
          type: 'follow_up_question',
          payload: {
            message: label && focusedTutor
              ? `Show the timetable / sessions for tutor ${label}`
              : 'Show the timetable / sessions for this tutor',
          },
        });
        push({
          id: 'follow_up.show_assigned_students',
          label: 'Show assigned students',
          type: 'follow_up_question',
          payload: {
            message: label && focusedTutor
              ? `Which students are assigned to ${label}?`
              : 'Which students are assigned to this tutor?',
          },
        });
        push({
          id: 'follow_up.open_tutor_reports',
          label: 'Open reports',
          type: 'follow_up_question',
          payload: {
            message: label && focusedTutor
              ? `Open or summarize reports for tutor ${label}`
              : 'Open or summarize reports for this tutor',
          },
        });
        push({
          id: 'follow_up.notify_tutor_coordinator',
          label: 'Notify coordinator',
          type: 'follow_up_question',
          payload: {
            message: label && focusedTutor
              ? `What should I notify the coordinator about regarding tutor ${label}?`
              : 'What should I notify the coordinator about regarding this tutor?',
          },
        });
        push({
          id: 'follow_up.schedule_new_session',
          label: 'Schedule new session',
          type: 'follow_up_question',
          payload: {
            message: label && focusedTutor
              ? `Help me schedule a new session with tutor ${label}`
              : 'Help me schedule a new session with this tutor',
          },
        });
      } else {
        push({
          id: 'follow_up.show_tutor',
          label: label && kinds.has('tutor') ? `Show tutor — ${label}` : 'Show tutor',
          type: 'follow_up_question',
          payload: {
            message: label && kinds.has('tutor')
              ? `Summarize tutor ${label}`
              : 'Show the tutor for this selection',
          },
        });
        if (
          !onMatchingPage &&
          (kinds.has('student') ||
            /\b(match|matching|appari|sans tuteur)\b/.test(q + page))
        ) {
          push({
            id: 'follow_up.assign_tutor',
            label: 'Assign tutor',
            type: 'follow_up_question',
            payload: {
              message: label
                ? `What is missing to assign a tutor to ${label}?`
                : 'What is missing to assign a tutor?',
            },
          });
        }
      }
    }

    if (
      kinds.has('session') ||
      /\b(session|séance|seance|calendar|planning)\b/.test(page) ||
      /\b(session|séance|seance)\b/.test(q)
    ) {
      push({
        id: 'follow_up.create_session',
        label: 'Create session',
        type: 'follow_up_question',
        payload: {
          message: 'Help me create a session correctly for this context',
        },
      });
    }

    if (
      kinds.has('report') ||
      /\b(report|compte.?rendu|reports)\b/.test(page) ||
      /\b(report|compte.?rendu)\b/.test(q)
    ) {
      push({
        id: 'follow_up.open_report',
        label: 'Open report',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Open or summarize the report related to ${label}`
            : 'Open or summarize the relevant report',
        },
      });
    }

    const onDashboardPage =
      /\b(dashboard|tableau.?de.?bord|statistics|statistiques|kpi|indicateurs?)\b/.test(
        page,
      );
    const asksDashboardAnalytics =
      /\b(dashboard|kpi|indicateurs?|statistic|stats|compare|tendance|trend|attendance|assiduité|sessions? completed|élèves? actifs?|tuteurs? actifs?)\b/.test(
        q,
      );

    if (onDashboardPage || asksDashboardAnalytics) {
      push({
        id: 'follow_up.compare_last_month',
        label: 'Compare last month',
        type: 'follow_up_question',
        payload: {
          message:
            'Compare this month’s dashboard KPIs vs last month — which metric increased most?',
        },
      });
      push({
        id: 'follow_up.show_affected_people',
        label: 'Show affected students/tutors',
        type: 'follow_up_question',
        payload: {
          message:
            'Show affected students or tutors for the KPIs that moved (pending reports, registered onboarding, active tutors)',
        },
      });
      push({
        id: 'follow_up.open_dashboard',
        label: 'Open dashboard',
        type: 'follow_up_question',
        payload: {
          message:
            'Open or summarize the Dashboard with the same period / compare filters',
        },
      });
      push({
        id: 'follow_up.generate_stats_report',
        label: 'Generate report',
        type: 'follow_up_question',
        payload: {
          message:
            'Generate a short coordinator statistics report from live dashboard KPIs (current values, trends, recommended actions)',
        },
      });
    }

    if (
      context.plannerMode === 'rag' ||
      context.plannerMode === 'hybrid' ||
      (context.documentKbCount ?? 0) > 0 ||
      kinds.size > 0 ||
      Boolean(context.pageRoute)
    ) {
      push({
        id: 'follow_up.generate_summary',
        label: 'Generate summary',
        type: 'follow_up_question',
        payload: {
          message: label
            ? `Generate a short coordinator summary for ${label}`
            : 'Generate a short coordinator summary of the current situation',
        },
      });
    }

    // Always offer at least one useful coordinator next step when we have page context
    // but nothing matched above.
    if (!out.length && context.pageRoute) {
      push({
        id: 'follow_up.page_next',
        label: 'What should I do next?',
        type: 'follow_up_question',
        payload: {
          message: context.pageTitle
            ? `What should I do next on « ${context.pageTitle} »?`
            : 'What should I do next on this page?',
        },
      });
    }

    return out;
  }
}
