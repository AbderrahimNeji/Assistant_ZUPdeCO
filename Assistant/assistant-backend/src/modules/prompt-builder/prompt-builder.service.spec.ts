import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should include strict system rules, history, context, and question', () => {
    const prompt = service.buildRagPrompt({
      history: [
        { role: 'user', content: 'What is RAG?' },
        { role: 'assistant', content: 'RAG means Retrieval Augmented Generation.' },
      ],
      context: 'RAG retrieves documents then generates answers.',
      question: 'Can you explain it simply?',
    });

    expect(prompt).toContain('experienced Ednov coordinator');
    expect(prompt).toContain('NEVER use your general knowledge');
    expect(prompt).toContain('NEVER invent');
    expect(prompt).toContain('CONVERSATION HISTORY');
    expect(prompt).toContain('User: What is RAG?');
    expect(prompt).toContain(
      'Assistant: RAG means Retrieval Augmented Generation.',
    );
    expect(prompt).toContain('CONTEXT');
    expect(prompt).toContain('RAG retrieves documents then generates answers.');
    expect(prompt).toContain('QUESTION');
    expect(prompt).toContain('Can you explain it simply?');
    expect(prompt).toContain('NEVER emit LaTeX');
    expect(prompt).toContain('plain Unicode');
    expect(prompt).toContain('NEVER reveal UUIDs');
    expect(prompt).toContain('human labels only');
    expect(prompt).toContain('REQUIRED ANSWER SHAPE');
    expect(prompt).toContain('Direct answer');
    expect(prompt).toContain('Business reasoning');
    expect(prompt).toContain('Next recommended action');
    expect(prompt).toContain('Sources');
    expect(prompt).toContain('NEVER invent numbers');
    expect(prompt).toContain('one-sentence-only');
    expect(prompt).toContain('UNTRUSTED DATA POLICY');
    expect(prompt).toContain('<<UNTRUSTED DATA kind="user-question">>');
    expect(prompt).toContain('<<UNTRUSTED DATA kind="retrieved-context">>');
    expect(prompt).toContain('<<<COPILOT_SYSTEM_INSTRUCTIONS>>>');
  });

  it('should redact sensitive values from context before prompting', () => {
    const prompt = service.buildRagPrompt({
      context:
        'Student Marie Dupont (id=550e8400-e29b-41d4-a716-446655440000) <marie@school.fr>',
      question: 'Who is selected?',
    });

    expect(prompt).toContain('Marie Dupont');
    expect(prompt).not.toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(prompt).not.toContain('marie@school.fr');
  });

  it('should handle empty history', () => {
    const prompt = service.buildRagPrompt({
      history: [],
      context: 'Some context',
      question: 'Hello?',
    });

    expect(prompt).toContain('(No previous messages)');
    expect(prompt).toContain('Some context');
    expect(prompt).toContain('Hello?');
  });

  it('should instruct refusal when context is insufficient', () => {
    const prompt = service.buildRagPrompt({
      context: 'Partial note',
      question: 'What is JWT?',
    });

    expect(prompt).toContain(
      "I couldn't find this information in the uploaded documents or company database.",
    );
  });

  it('should instruct the model to answer in the detected language', () => {
    const prompt = service.buildRagPrompt({
      context: 'Some context',
      question: "Combien d'élèves ?",
      language: 'French',
      insufficientContextMessage:
        "Je n'ai pas trouvé cette information dans les documents ou la base de données de l'application.",
    });

    expect(prompt).toContain('ALWAYS answer in French');
    expect(prompt).toContain('RESPONSE LANGUAGE');
    expect(prompt).toContain('French');
    expect(prompt).toContain(
      "Je n'ai pas trouvé cette information dans les documents ou la base de données de l'application.",
    );
  });

  it('should include hybrid structured issue sections for hybrid/business intents', () => {
    const hybrid = service.buildRagPrompt({
      context: 'Matching incomplete. Doc rule: tutor required.',
      question: 'Why is matching blocked?',
      routeIntent: 'hybrid',
    });

    expect(hybrid).toContain('STRUCTURED ISSUE EXPLANATION');
    expect(hybrid).toContain('## Current situation');
    expect(hybrid).toContain('## Required / satisfied conditions');
    expect(hybrid).toContain('## Missing conditions');
    expect(hybrid).toContain('## Relevant business rule');
    expect(hybrid).toContain('## Suggested resolution');
    expect(hybrid).toContain('Route focus: HYBRID');

    const business = service.buildRagPrompt({
      context: 'Students without tutor: 3',
      question: 'How many students lack a tutor?',
      routeIntent: 'business',
    });
    expect(business).toContain('Route focus: LIVE / BUSINESS');
    expect(business).toContain('## Current situation');
  });

  it('should strengthen page/selection pronoun guidance', () => {
    const prompt = service.buildRagPrompt({
      context: 'Current Ednov application context: Selected student “Marie”',
      question: 'Why is she blocked?',
    });

    expect(prompt).toContain('PAGE / SELECTION CONTEXT is authoritative');
    expect(prompt).toContain('cet élève');
  });

  it('should prefer documentation focus for functional intent', () => {
    const prompt = service.buildRagPrompt({
      context: 'Parcours tuteur p. 4',
      question: 'What are the tutor onboarding steps?',
      routeIntent: 'functional',
    });

    expect(prompt).toContain('Route focus: FUNCTIONAL');
    expect(prompt).toContain('DOCUMENTATION CITATIONS');
    expect(prompt).not.toContain('STRUCTURED ISSUE EXPLANATION');
  });
});
