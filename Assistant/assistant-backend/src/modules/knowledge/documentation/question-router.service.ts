import { Injectable } from '@nestjs/common';

import { matchesAny } from '../application/application-provider.types';

export type QuestionRouteIntent = 'functional' | 'business' | 'hybrid';

export type QuestionRoutePlan = {
  intent: QuestionRouteIntent;
  /** Official functional documentation RAG. */
  useDocumentation: boolean;
  /** Live Business Intelligence / application DB providers. */
  useBusiness: boolean;
  /** User-uploaded permanent KB documents. */
  useUserDocuments: boolean;
  /** Conversation-scoped attachments. */
  useAttachments: boolean;
};

/**
 * Lightweight functional vs business vs hybrid router.
 * Does not replace Planner — only gates Knowledge Orchestrator sources.
 *
 * Live operational questions MUST enable Business Skills. RAG-only is reserved
 * for definitional / how-to documentation questions.
 */
@Injectable()
export class QuestionRouterService {
  route(question: string): QuestionRoutePlan {
    const q = question?.trim() || '';
    const functional = this.isFunctional(q);
    const business = this.isBusiness(q);
    const why = this.isWhyQuestion(q);

    let intent: QuestionRouteIntent;
    if (business && (functional || why)) intent = 'hybrid';
    else if (business) intent = 'business';
    else if (functional) intent = 'functional';
    else {
      intent = this.looksDefinitional(q) ? 'functional' : 'business';
    }

    return {
      intent,
      useDocumentation: intent === 'functional' || intent === 'hybrid',
      useBusiness: intent === 'business' || intent === 'hybrid',
      useUserDocuments: true,
      useAttachments: true,
    };
  }

  /** Definition / process / permission — not live lists or KPIs. */
  private isFunctional(question: string): boolean {
    // How-to / process questions always prefer official documentation, even when
    // they share verbs with live actions ("créer un compte-rendu").
    if (this.isHowTo(question)) return true;
    // Process / glossary / permission cues beat live list cues when both appear
    // (e.g. "Quelles sont les étapes d'inscription parent ?").
    if (
      matchesAny(question, [
        /\b(how does|how do|what is|what are|qu['’]est[- ]ce|c['’]est quoi|comment (fonctionne|marche|se déroule|se deroule)|définition|definition|explain|explique)\b/i,
        /\b(documentation|fonctionnel|référence métier|reference metier)\b/i,
        /\b(rôle du|role du|rôle de|role de|lead qualifi|prospect)\b/i,
        /\b(peut[- ]on|peut[- ]il|peut[- ]elle|est[- ]il possible|autorisé|autorise|interdit|who can|qui (peut|est autorisé)|can a parent|can a tutor)\b/i,
        /\b(étape|etape|étapes|etapes|questionnaire|pré[- ]?qualification|pre[- ]?qualification|casier|certification|réunion d['’]information|onboarding|inscription parent)\b/i,
        /\b(bin[oô]me c[œoe]ur|scoring|durée d['’]une séance|dure une séance)\b/i,
      ])
    ) {
      return true;
    }
    // "What is the next session?" is operational, not a glossary definition.
    if (this.isBusiness(question)) return false;
    return false;
  }

  /**
   * Procedural / onboarding how-to (French + English).
   * Example: "comment créer des comptes-rendus" → documentation, not live BI.
   */
  private isHowTo(question: string): boolean {
    return matchesAny(question, [
      /\bhow (do|does|can|to)\b.+\b(create|make|fill|complete|generate|use|validate|submit|onboard\w*|assign|add|edit)\b/i,
      /\bcomment\b.+\b(cr[ée]er?|crée|cree|faire|remplir|compl[ée]ter|g[ée]n[ée]rer|utiliser|saisir|valider|soumettre|fonctionne|marche|onboard\w*|ajouter|affecter|modifier)\b/i,
      /\b(comment (cr[ée]er?|crée|cree|faire|remplir|g[ée]n[ée]rer|saisir|onboard\w*|ajouter|affecter)\b)/i,
      /\b(onboard\w*|étapes? d['’']?inscription|etapes? d['’']?inscription)\b/i,
      /\b(que voit|what (does|can) (a |the )?parent|tutor onboard\w*)\b/i,
      /\b(how to|how do i|how can i)\b/i,
    ]);
  }

  /** Live data: counts, lists, rankings, statuses, KPIs, deixis. */
  private isBusiness(question: string): boolean {
    return matchesAny(question, [
      /\b(how many|combien|count|nombre de|number of|how much)\b/i,
      /\b(liste|lister|list|montre|montrer|show|trouve|trouver|find|affiche|afficher|display|quels?|quelles?|which|who has|qui (a|ont|n['’]a))\b/i,
      /\b(top|classer|classe les|classement|ranking|rank|most active|least active|plus actifs?|moins actifs?|plus actif|moins actif|le plus actif|les plus actifs|meilleur|pire|highest|lowest|most |least )\b/i,
      /\b(aujourd['’]hui|today|demain|tomorrow|cette semaine|this week|ce mois|this month|upcoming|à venir|a venir|next|prochaine?|last|derni[eè]re?)\b/i,
      /\b(cancelled|annul(?:ée|ées|és|es)?|completed|termin(?:ée|ées|és|es)?|missing|manqu(?:ant|e)|pending|en attente|overdue|en retard|without|sans |unmatched|non[ -]?appari)\b/i,
      /\b(kpi|kpis|dashboard|tableau de bord|statistique|stats|tendance|trend|évolution|evolution|activité|activity|workload|charge)\b/i,
      /\b(cet élève|cet eleve|this student|ce tuteur|this tutor|cette séance|cette seance|this session|cet établissement|this school|this report|ce compte.?rendu|this tutor|open this)\b/i,
      /\b(who am i|mon profil|my profile|mes séances|mes seances)\b/i,
      /\b(actifs?|inactifs?|active|inactive|disponibles?|available|availability|disponibilité|disponibilite)\b/i,
      /\b(validés?|validated|inscrits?|registered|accompagnés?|accompagnes?)\b/i,
      /\b(by |par )(establishment|établissement|etablissement|program|programme|tutor|tuteur|student|élève|eleve)\b/i,
      /\b(sans matching|without matching|sans tuteur|without (a )?tutor|sans élèves?|without students)\b/i,
      /\b(open|ouvre|ouvrir)\b.{0,50}\b(profil|profile|fiche)\b/i,
      /\b(open|ouvre|ouvrir)\s+[A-ZÀ-Ÿ]/u,
      /\b(profil(?:e)?|fiche)\s+(of|de)\b/i,
      /\b(particip|who (is|are) in|qui (participe|sont|est dans))\b/i,
      /\b(schedule|emploi du temps|planning du jour|today['’]?s schedule)\b/i,
      /\b(joined|inscrits? (ce mois|this month)|who joined)\b/i,
      /\b(coordinator|coordinateur|coordonnateur|gère cet|manages this)\b/i,
      /\b(attended|ont assisté|présents? (à|a)|who attended)\b/i,
      /\b(awaiting validation|en attente de validation|à valider|a valider)\b/i,
      /\b(gamification|leaderboard|xp|badge|notification|vsc)\b/i,
    ]);
  }

  private isWhyQuestion(question: string): boolean {
    return matchesAny(question, [
      /\b(pourquoi (ce|cette|cet|ne|n['’])|why (can'?t|cannot|is|does|isn['’]?t))\b/i,
    ]);
  }

  private looksDefinitional(question: string): boolean {
    return (
      this.isHowTo(question) ||
      matchesAny(question, [
        /\b(qu['’]est|c['’]est quoi|what is|what are|comment fonctionne|how does|explain|explique)\b/i,
      ])
    );
  }
}
