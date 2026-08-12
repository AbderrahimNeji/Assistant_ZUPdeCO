import type { ApplicationContext } from './types';

export type PageSuggestion = {
  label: string;
  prompt: string;
};

const BY_ENTITY: Record<string, PageSuggestion[]> = {
  student: [
    { label: 'Explain status', prompt: 'Explain this student’s current status and onboarding.' },
    { label: 'Explain matching', prompt: 'Why isn’t he matched? Who is his tutor?' },
    { label: 'Show sessions', prompt: 'Show his next session and recent attendance.' },
    { label: 'Show reports', prompt: 'Summarize his reports.' },
    { label: 'Contact?', prompt: 'Should we contact him? Recommend the next coordinator action.' },
  ],
  tutor: [
    { label: 'Show workload', prompt: 'Show this tutor’s workload.' },
    { label: 'Show students', prompt: 'Show his assigned students.' },
    { label: 'Show availability', prompt: 'Show this tutor’s availability.' },
    { label: 'Sessions', prompt: 'What is this tutor’s next session?' },
  ],
  session: [
    { label: 'Show participants', prompt: 'Who participates in this session?' },
    { label: 'Show reports', prompt: 'Show reports for this session.' },
    { label: 'Show attendance', prompt: 'Has attendance been recorded for this session?' },
  ],
  report: [
    { label: 'Summarize', prompt: 'Summarize this report.' },
    { label: 'Explain validation', prompt: 'Explain the validation status of this report.' },
    { label: 'Missing information', prompt: 'Show missing information on this report.' },
  ],
  establishment: [
    { label: 'Statistics', prompt: 'Show statistics for this establishment.' },
    { label: 'Active students', prompt: 'How many active students are in this establishment?' },
    { label: 'Sessions', prompt: 'Show sessions for this establishment.' },
    { label: 'Tutors', prompt: 'Which tutors work at this establishment?' },
  ],
  program: [
    { label: 'Summary', prompt: 'Summarize this program and who is eligible.' },
    { label: 'Students', prompt: 'Which students are on this program?' },
  ],
  matching: [
    { label: 'Explain matching', prompt: 'Explain this pair: origin, session status, and what’s missing.' },
    { label: 'Student', prompt: 'Why isn’t this student matched / who is his tutor?' },
    { label: 'Tutor', prompt: 'Show this tutor’s workload and assigned students.' },
  ],
  company: [
    { label: 'KPIs', prompt: 'What are today’s company KPIs?' },
    { label: 'Alerts', prompt: 'What needs attention across the company?' },
  ],
};

const FALLBACK: PageSuggestion[] = [
  { label: 'Page', prompt: 'Que puis-je faire sur cette page ?' },
  { label: 'Aide', prompt: 'Comment fonctionne ZUPdeCo Assistant ?' },
  { label: 'Planning', prompt: 'Quel est mon planning cette semaine ?' },
  { label: 'Docs', prompt: 'Quelles sont les étapes du parcours tuteur ?' },
];

const BY_INTERFACE: Record<string, PageSuggestion[]> = {
  matching: [
    { label: 'Assigner tuteur', prompt: 'Que manque-t-il pour assigner un tuteur à cet élève ?' },
    { label: 'Profil élève', prompt: 'Ouvre ou résume le profil de cet élève.' },
    { label: 'Dispo tuteur', prompt: 'Quels tuteurs sont disponibles pour cette séance / ce matching ?' },
    { label: 'Rapport matching', prompt: 'Génère un rapport matching : binômes actifs, élèves non appariés, charge tuteurs.' },
    { label: 'Notifier', prompt: 'Que dois-je notifier au coordinateur pour finaliser les appariements ?' },
  ],
  sessions: [
    { label: 'Séances', prompt: 'Résume les prochaines séances et les absences.' },
    { label: 'Créer séance', prompt: 'Aide-moi à créer une séance correctement.' },
    { label: 'Annuler', prompt: 'Quelles sont les règles pour annuler une séance ?' },
  ],
  session: [
    { label: 'Séance', prompt: 'Résume la séance sélectionnée et son statut.' },
    { label: 'Compte-rendu', prompt: 'Ouvre ou résume le compte-rendu de cette séance.' },
    { label: 'Résumé', prompt: 'Génère un résumé coordinateur de cette séance.' },
  ],
  students: [
    { label: 'Aperçu', prompt: 'Combien d’élèves inscrits, accompagnés et désactivés ?' },
    { label: 'Sans tuteur', prompt: 'Quels élèves n’ont pas de tuteur / pas d’appariement actif ?' },
    { label: 'Attention', prompt: 'Quels élèves nécessitent une attention (inscrits, désactivés, non appariés) ?' },
    { label: 'Voir profil', prompt: 'Montre le profil de cet élève.' },
    { label: 'Planifier', prompt: 'Aide-moi à planifier une séance pour un élève sélectionné.' },
  ],
  student: [
    { label: 'Voir profil', prompt: 'Résume le profil, le statut et le parcours de cet élève.' },
    { label: 'Ouvrir tuteur', prompt: 'Qui est le tuteur de cet élève ? Ouvre ou résume son tuteur.' },
    { label: 'Résumé', prompt: 'Génère un résumé coordinateur pour cet élève.' },
    { label: 'Rapports', prompt: 'Quels comptes-rendus concernent cet élève ?' },
    { label: 'Présences', prompt: 'Que sait-on des présences / absences de cet élève ?' },
    { label: 'Planifier', prompt: 'Aide-moi à planifier une séance pour cet élève.' },
    { label: 'Notifier', prompt: 'Que dois-je notifier au coordinateur à propos de cet élève ?' },
  ],
  tutors: [
    { label: 'Tuteurs actifs', prompt: 'Combien de tuteurs actifs ?' },
    { label: 'Dispo aujourd’hui', prompt: 'Quels tuteurs sont disponibles aujourd’hui ?' },
    { label: 'Sans élèves', prompt: 'Quels tuteurs n’ont pas d’élèves assignés ?' },
    { label: 'Charge', prompt: 'Quels tuteurs ont la charge la plus élevée ?' },
    { label: 'Inactifs', prompt: 'Quels tuteurs sont inactifs ou désactivés ?' },
  ],
  tutor: [
    { label: 'Emploi du temps', prompt: 'Montre l’emploi du temps / les séances de ce tuteur.' },
    { label: 'Élèves assignés', prompt: 'Quels élèves sont assignés à ce tuteur ?' },
    { label: 'Rapports', prompt: 'Ouvre ou résume les comptes-rendus de ce tuteur.' },
    { label: 'Notifier', prompt: 'Que dois-je notifier au coordinateur à propos de ce tuteur ?' },
    { label: 'Planifier', prompt: 'Aide-moi à planifier une nouvelle séance avec ce tuteur.' },
  ],
  parents: [
    { label: 'Parents', prompt: 'Quels contacts parents/responsables sont renseignés ?' },
    { label: 'Élève', prompt: 'Qui est le responsable légal de cet élève ?' },
  ],
  dashboard: [
    { label: 'Tableau de bord', prompt: 'Quels indicateurs clés dois-je regarder aujourd’hui ?' },
    { label: 'Alertes', prompt: 'Y a-t-il des alertes ou actions urgentes ?' },
    { label: 'Résumé', prompt: 'Génère un résumé coordinateur des statistiques principales.' },
  ],
  registrations: [
    { label: 'Inscriptions', prompt: 'Quelles inscriptions sont en attente ou incomplètes ?' },
    { label: 'Règles', prompt: 'Quelles conditions sont requises pour valider une inscription ?' },
  ],
  programs: [
    { label: 'Programmes', prompt: 'Résume les programmes actifs et leurs règles.' },
    { label: 'Éligibilité', prompt: 'Qui est éligible à ce programme ?' },
  ],
  calendar: [
    { label: 'Planning', prompt: 'Quel est mon planning cette semaine ?' },
    { label: 'Créer séance', prompt: 'Aide-moi à créer une séance correctement.' },
  ],
  documents: [
    { label: 'Documents', prompt: 'Quels documents sont requis ou manquants ?' },
    { label: 'Docs', prompt: 'Où trouver la documentation fonctionnelle pertinente ?' },
  ],
  attendance: [
    { label: 'Présences', prompt: 'Résume les absences récentes.' },
    { label: 'Séance', prompt: 'Qui était présent à cette séance ?' },
  ],
  reports: [
    { label: 'Ouvrir rapport', prompt: 'Résume ce compte-rendu : statut, validation, informations manquantes et prochaine action.' },
    { label: 'Voir séance', prompt: 'Ouvre ou résume la séance liée à ce compte-rendu / à cette sélection.' },
    { label: 'Voir élève/tuteur', prompt: 'Quels élèves ou tuteurs sont concernés par ce compte-rendu ou ces filtres ?' },
    { label: 'Notifier', prompt: 'Que dois-je notifier au coordinateur à propos des comptes-rendus en attente ?' },
    { label: 'Résumé', prompt: 'Génère un résumé coordinateur des comptes-rendus (KPIs + en attente de validation) à partir des données live uniquement.' },
  ],
  report: [
    { label: 'Ouvrir rapport', prompt: 'Résume ce compte-rendu : statut, validation, informations manquantes et prochaine action.' },
    { label: 'Voir séance', prompt: 'Ouvre ou résume la séance de ce compte-rendu.' },
    { label: 'Voir élève/tuteur', prompt: 'Qui sont l’élève et le tuteur liés à ce compte-rendu / cette séance ?' },
    { label: 'Notifier', prompt: 'Que dois-je notifier au coordinateur pour ce compte-rendu ?' },
    { label: 'Résumé', prompt: 'Génère un résumé de ce compte-rendu à partir des faits live uniquement (sans inventer le contenu pédagogique).' },
  ],
  notifications: [
    { label: 'Inbox', prompt: 'Quelles sont mes notifications non lues ?' },
    { label: 'Lire', prompt: 'Marque toutes mes notifications comme lues.' },
  ],
  schools: [
    { label: 'Établissements', prompt: 'Liste les établissements et leur ville.' },
    { label: 'Stats', prompt: 'Combien y a-t-il d’établissements ?' },
  ],
  establishments: [
    { label: 'Établissements', prompt: 'Liste les établissements et leur ville.' },
    { label: 'Focus', prompt: 'Résume l’établissement sélectionné.' },
  ],
  statistics: [
    { label: 'Stats', prompt: 'Donne un résumé des statistiques principales.' },
    { label: 'Comparer', prompt: 'Compare les indicateurs clés du tableau de bord.' },
  ],
  users: [
    { label: 'Voir profil', prompt: 'Qui suis-je dans Ednov et quels sont mes droits ?' },
    { label: 'Équipe', prompt: 'Combien y a-t-il de tuteurs et d’élèves ?' },
  ],
  config: [
    { label: 'Config', prompt: 'Quels paramètres et feature flags sont actifs ?' },
    { label: 'Règles', prompt: 'Que puis-je modifier dans la configuration ?' },
  ],
  settings: [
    { label: 'Config', prompt: 'Quels paramètres et feature flags sont actifs ?' },
    { label: 'Règles', prompt: 'Que puis-je modifier dans la configuration ?' },
  ],
  configuration: [
    { label: 'Config', prompt: 'Quels paramètres et feature flags sont actifs ?' },
    { label: 'Règles', prompt: 'Que puis-je modifier dans la configuration ?' },
  ],
};

function normalizeInterfaceId(raw?: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchKey(interfaceId?: string, route?: string): string | null {
  const hay = `${normalizeInterfaceId(interfaceId)} ${normalizeInterfaceId(route)}`;
  const keys = Object.keys(BY_INTERFACE);
  for (const key of keys) {
    if (hay.includes(key)) return key;
  }
  // French / common synonyms
  if (/\b(seance|séance|session)\b/.test(hay)) return 'sessions';
  if (/\b(eleve|élève|student)\b/.test(hay)) return 'students';
  if (/\b(tuteur|tutor)\b/.test(hay)) return 'tutors';
  if (/\b(parent|guardian|famille)\b/.test(hay)) return 'parents';
  if (/\b(appari|match|binome|binôme)\b/.test(hay)) return 'matching';
  if (/\b(inscription|registration)\b/.test(hay)) return 'registrations';
  if (/\b(tableau|dashboard|accueil|home)\b/.test(hay)) return 'dashboard';
  if (/\b(calendrier|planning|calendar)\b/.test(hay)) return 'calendar';
  if (/\b(programme|program)\b/.test(hay)) return 'programs';
  if (/\b(document)\b/.test(hay)) return 'documents';
  if (/\b(presence|présence|attendance|absence)\b/.test(hay)) return 'attendance';
  if (/\b(compte.?rendu|comptes.?rendus|report)\b/.test(hay)) return 'reports';
  if (/\b(notif)/.test(hay)) return 'notifications';
  if (/\b(etablissement|établissement|school|ecole|école)\b/.test(hay))
    return 'establishments';
  if (/\b(statistique|statistic)\b/.test(hay)) return 'statistics';
  if (/\b(utilisateur|users?)\b/.test(hay)) return 'users';
  if (/\b(config|setting|parametre|paramètre)\b/.test(hay)) return 'config';
  return null;
}

export function getPageAwareSuggestions(
  context: ApplicationContext,
): PageSuggestion[] {
  const focusedType =
    context.selection?.primary?.type ||
    (context.student?.id && 'student') ||
    (context.tutor?.id && 'tutor') ||
    (context.session?.id && 'session') ||
    (context.report?.id && 'report') ||
    (context.establishment?.id && 'establishment') ||
    (context.program?.id && 'program') ||
    (context.matching?.id && 'matching') ||
    null;

  const extras = context.selection?.entities?.filter(
    (e) => e.id && e.id !== context.selection?.primary?.id,
  );
  const compareChip: PageSuggestion | null =
    extras && extras.length > 0 && context.selection?.primary
      ? {
          label: 'Compare',
          prompt: `Compare these ${extras.length + 1} ${context.selection.primary.type}s.`,
        }
      : null;

  if (focusedType && BY_ENTITY[focusedType]) {
    const chips = [...BY_ENTITY[focusedType]];
    if (compareChip) chips.unshift(compareChip);
    return chips.slice(0, 5);
  }

  const key = matchKey(context.page?.interfaceId, context.page?.route);
  const pageSpecific = key ? BY_INTERFACE[key] : undefined;
  if (pageSpecific?.length) {
    // Matching: surface the five coordinator actions without diluting the chip budget.
    if (key === 'matching') {
      return pageSpecific.slice(0, 5);
    }
    // Student detail: prefer action chips (profile / tutor / reports / schedule / notify).
    if (key === 'student' || (key === 'students' && context.student?.id)) {
      const studentChips =
        key === 'student' || context.student?.id
          ? BY_INTERFACE.student
          : pageSpecific;
      return studentChips.slice(0, 5);
    }
    if (key === 'students') {
      return pageSpecific.slice(0, 5);
    }
    // Tutor detail: prefer timetable / students / reports / notify / schedule.
    if (key === 'tutor' || (key === 'tutors' && context.tutor?.id)) {
      const tutorChips =
        key === 'tutor' || context.tutor?.id
          ? BY_INTERFACE.tutor
          : pageSpecific;
      return tutorChips.slice(0, 5);
    }
    if (key === 'tutors') {
      return pageSpecific.slice(0, 5);
    }
    // Reports: focused report chips vs list chips.
    if (key === 'report' || (key === 'reports' && context.report?.id)) {
      const reportChips =
        key === 'report' || context.report?.id
          ? BY_INTERFACE.report
          : pageSpecific;
      return reportChips.slice(0, 5);
    }
    if (key === 'reports') {
      return pageSpecific.slice(0, 5);
    }
    const withPage: PageSuggestion = {
      label: 'Cette page',
      prompt: context.page?.title
        ? `Que puis-je faire sur la page « ${context.page.title} » ?`
        : 'Que puis-je faire sur cette page ?',
    };
    return [withPage, ...pageSpecific].slice(0, 5);
  }
  return FALLBACK;
}
