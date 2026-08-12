/**
 * Strips secrets, internal IDs, and sensitive PII from text that reaches
 * the LLM context or the user-facing assistant answer.
 *
 * Names / human labels are kept. Prefer referring to entities by label only.
 */
export class SensitiveDataRedactor {
  private static readonly REDACTED = '[REDACTED]';

  /** UUID (with or without braces). */
  private static readonly UUID =
    /\b\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?\b/g;

  /** MongoDB ObjectId (24 hex). */
  private static readonly OBJECT_ID = /\b[0-9a-fA-F]{24}\b/g;

  private static readonly EMAIL =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  /** International / FR phone-ish numbers (avoid matching bare years). */
  private static readonly PHONE =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}\b/g;

  private static readonly BEARER =
    /\b(?:Bearer|bearer)\s+[A-Za-z0-9\-._~+/]+=*/g;

  private static readonly JWT =
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

  private static readonly API_KEY_ASSIGN =
    /\b(?:api[_-]?key|apikey|secret|password|passwd|token|access[_-]?token|refresh[_-]?token|private[_-]?key)\s*[:=]\s*["']?[^\s"',;]+["']?/gi;

  private static readonly CONNECTION_STRING =
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s]+/gi;

  private static readonly PEM_BLOCK =
    /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;

  /** `id=...`, `studentId: ...`, etc. */
  private static readonly ID_FIELD =
    /\b(?:id|uuid|objectId|_id|userId|studentId|tutorId|sessionId|companyId|programId|courseId|registrationId|documentId|firebaseUid|uid)\s*[:=]\s*["']?[A-Za-z0-9\-_]{6,}["']?/gi;

  /** Parenthetical id dumps: `(id=abc)` or `(id: abc)`. */
  private static readonly PAREN_ID =
    /\(\s*(?:id|uuid|objectId|_id)\s*[:=]\s*[^)]+\)/gi;

  /** Birth dates often appear as YYYY-MM-DD next to birth/naissance labels. */
  private static readonly BIRTH_DATE =
    /\b(?:birth(?:Date|_date)?|dateOfBirth|date de naissance|né(?:e)? le)\s*[:=]?\s*\d{4}-\d{2}-\d{2}\b/gi;

  private static readonly SIRET_OR_NATIONAL =
    /\b(?:SIRET|SIREN|NIR|NSS|nationalId|national[_-]?id)\s*[:=]?\s*[\d\s]{9,20}\b/gi;

  static redact(text: string): string {
    if (!text) return text;

    let out = text;
    out = out.replace(SensitiveDataRedactor.PEM_BLOCK, SensitiveDataRedactor.REDACTED);
    out = out.replace(
      SensitiveDataRedactor.CONNECTION_STRING,
      SensitiveDataRedactor.REDACTED,
    );
    out = out.replace(SensitiveDataRedactor.BEARER, `Bearer ${SensitiveDataRedactor.REDACTED}`);
    out = out.replace(SensitiveDataRedactor.JWT, SensitiveDataRedactor.REDACTED);
    out = out.replace(
      SensitiveDataRedactor.API_KEY_ASSIGN,
      (match) => {
        const key = match.split(/[:=]/)[0]?.trim() ?? 'secret';
        return `${key}=${SensitiveDataRedactor.REDACTED}`;
      },
    );
    out = out.replace(SensitiveDataRedactor.EMAIL, SensitiveDataRedactor.REDACTED);
    out = out.replace(SensitiveDataRedactor.PAREN_ID, '');
    out = out.replace(
      SensitiveDataRedactor.ID_FIELD,
      (match) => {
        const key = match.split(/[:=]/)[0]?.trim() ?? 'id';
        return `${key}=${SensitiveDataRedactor.REDACTED}`;
      },
    );
    out = out.replace(SensitiveDataRedactor.UUID, SensitiveDataRedactor.REDACTED);
    out = out.replace(SensitiveDataRedactor.OBJECT_ID, SensitiveDataRedactor.REDACTED);
    out = out.replace(SensitiveDataRedactor.BIRTH_DATE, (m) => {
      const label = m.split(/[:=\d]/)[0]?.trim() || 'birthDate';
      return `${label}=${SensitiveDataRedactor.REDACTED}`;
    });
    out = out.replace(
      SensitiveDataRedactor.SIRET_OR_NATIONAL,
      (m) => {
        const label = m.split(/[:=\d]/)[0]?.trim() || 'id';
        return `${label}=${SensitiveDataRedactor.REDACTED}`;
      },
    );
    out = SensitiveDataRedactor.redactPhonesSafely(out);

    // Collapse leftover double spaces from removed parentheticals
    return out.replace(/[ \t]{2,}/g, ' ').replace(/ \./g, '.').trimEnd();
  }

  static redactLines(lines: string[]): string[] {
    return lines.map((line) => SensitiveDataRedactor.redact(line));
  }

  /**
   * Phone redaction is conservative: only rewrite when the match looks like
   * a phone (has separators or leading +, length >= 10 digits).
   */
  private static redactPhonesSafely(text: string): string {
    return text.replace(SensitiveDataRedactor.PHONE, (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 10) return match;
      // Avoid redacting ISO dates glued oddly or pure numeric counts
      if (/^\d{4}-\d{2}-\d{2}$/.test(match.trim())) return match;
      return SensitiveDataRedactor.REDACTED;
    });
  }
}
