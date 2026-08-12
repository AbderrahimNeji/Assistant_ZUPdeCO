import { Test, TestingModule } from '@nestjs/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LanguageService],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect French from a short French question', async () => {
    const language = await service.detectLanguage("Combien d'élèves ?");
    expect(language).toBe('French');
  });

  it('should detect English from a short English question', async () => {
    const language = await service.detectLanguage('How many students?');
    expect(language).toBe('English');
  });

  it('should return a French insufficient-context message', () => {
    expect(service.insufficientContextMessage('French')).toBe(
      "Je n'ai pas trouvé cette information dans les documents ou la base de données de l'application.",
    );
  });

  it('should detect romanized Maghrebi Arabic (tahki arabi)', async () => {
    const language = await service.detectLanguage('tahki arabi', 'fr');
    expect(language).toBe('Arabic');
  });

  it('should detect Arabic script even when locale is French', async () => {
    const language = await service.detectLanguage(
      'هل تتكلم العربية؟',
      'fr',
    );
    expect(language).toBe('Arabic');
  });
});
