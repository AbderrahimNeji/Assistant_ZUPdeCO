import { normalizeSmallTalkInput } from './small-talk.normalize';
import { SmallTalkService } from './small-talk.service';

describe('normalizeSmallTalkInput', () => {
  it('normalizes case, spaces, punctuation, emojis, and accents', () => {
    expect(normalizeSmallTalkInput('  Merci   beaucoup 😊 !! ')).toBe(
      'merci beaucoup',
    );
    expect(normalizeSmallTalkInput('Comment ça va ?')).toBe('comment ca va');
  });
});

describe('SmallTalkService language-aware replies', () => {
  const service = new SmallTalkService();

  it('replies in English', () => {
    const match = service.match('Hello');
    expect(match?.language).toBe('en');
    expect(match?.answer).toMatch(/help|Hi|Hello|Hey/i);
  });

  it('replies in French for Bonjour / Merci', () => {
    expect(service.match('Bonjour')?.language).toBe('fr');
    expect(service.match('Bonjour')?.answer).toMatch(/Bonjour|aider/i);

    const merci = service.match('Merci');
    expect(merci?.language).toBe('fr');
    expect(merci?.answer).toMatch(/plaisir|prie|Ravi|hésitez|hesitez/i);

    const merciBeaucoup = service.match('Merci beaucoup');
    expect(merciBeaucoup?.language).toBe('fr');
    expect(merciBeaucoup?.answer).toMatch(/prie|plaisir|aide/i);
  });

  it('replies in Spanish for Gracias', () => {
    const gracias = service.match('Gracias');
    expect(gracias?.language).toBe('es');
    expect(gracias?.answer).toMatch(/De nada|Con gusto|Encantado|ayud/i);

    const muchas = service.match('Muchas gracias');
    expect(muchas?.language).toBe('es');
    expect(muchas?.answer).toMatch(/De nada|gusto|ayud/i);
  });

  it('avoids repeating the same reply consecutively in a conversation', () => {
    const first = service.match('thanks', { conversationId: 'conv-1' });
    const second = service.match('thanks', { conversationId: 'conv-1' });
    const third = service.match('thanks', { conversationId: 'conv-1' });
    expect(first?.answer).toBeTruthy();
    // With multiple variants, consecutive identical replies should be rare;
    // at least one of the next two should differ when pool size > 1.
    expect(
      [second?.answer, third?.answer].some(
        (answer) => answer !== first?.answer,
      ),
    ).toBe(true);
  });

  it('still covers multilingual detection cases', () => {
    const cases = [
      'hello',
      'bonjour',
      'salut',
      'hola',
      'thanks',
      'merci',
      'merci beaucoup',
      'gracias',
      'how are you',
      'comment ça va',
      'bye',
      'au revoir',
    ];
    for (const message of cases) {
      expect(service.match(message)).not.toBeNull();
    }
  });

  it('matches speak-Arabic capability in romanized Darija', () => {
    const match = service.match('tahki arabi');
    expect(match).not.toBeNull();
    expect(match?.intent).toBe('speak_arabic');
    expect(match?.language).toBe('ar');
    expect(match?.answer).toMatch(/عربي|العربية/);
    // Must not be the French RAG insufficient-context refusal
    expect(match?.answer).not.toMatch(/Je n'ai pas trouvé/);
  });

  it('matches speak-Arabic in French and English', () => {
    expect(service.match('tu parles arabe')?.language).toBe('fr');
    expect(service.match('tu parles arabe')?.answer).toMatch(/arabe/i);
    expect(service.match('do you speak arabic')?.language).toBe('en');
    expect(service.match('do you speak arabic')?.answer).toMatch(/Arabic/i);
  });
});
