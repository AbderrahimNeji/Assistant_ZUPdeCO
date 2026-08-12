/**
 * Re-run a saved failure list from question-battery-report.json.
 *   npx ts-node -r tsconfig-paths/register scripts/question-battery-rerun.ts
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { AppModule } from '../src/app.module';
import { AssistantService } from '../src/modules/assistant/assistant.service';
import { FirebaseAuthBridgeService } from '../src/modules/integration/firebase-auth-bridge.service';
import { RequestContextStore } from '../src/modules/integration/request-context';
import { SensitiveDataRedactor } from '../src/common/security/sensitive-data-redactor';

async function getIdToken(): Promise<string> {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY?.trim() ||
    'AIzaSyDlH82OVofyKPk-NgZTnOLB7dmmSbmY60o';
  const email = process.env.BATTERY_EMAIL?.trim() || 'ednov.test@example.com';
  const password = process.env.BATTERY_PASSWORD?.trim() || 'TestEdnov123!';
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const json = (await res.json()) as { idToken?: string; error?: unknown };
  if (!json.idToken) throw new Error(`sign-in failed: ${JSON.stringify(json)}`);
  return json.idToken;
}

function detectIssues(answer: string, category: string): string[] {
  const out: string[] = [];
  const a = SensitiveDataRedactor.redact(answer || '');
  if (!a.trim()) out.push('empty');
  if (
    (/je n'ai pas trouvé cette information dans les documents/i.test(a) ||
      /couldn't find this information in the uploaded documents/i.test(a)) &&
    (category.startsWith('docs') ||
      category.startsWith('live') ||
      category === 'hybrid')
  ) {
    out.push('insufficient_context_refusal');
  }
  if (/\b(?:GET|POST|PUT|PATCH|DELETE)\s+\//i.test(a)) {
    out.push('raw_api_path_in_answer');
  }
  if (/documentation fonctionnelle zupdeco/i.test(a)) {
    out.push('documentation_cited');
  }
  return out;
}

async function main() {
  const logger = new Logger('question-battery-rerun');
  const listPath = path.resolve(__dirname, '../tmp/battery-rerun-questions.json');
  const items = JSON.parse(fs.readFileSync(listPath, 'utf8')) as Array<{
    q: string;
    category: string;
  }>;
  const delayMs = Math.max(0, Number(process.env.DELAY_MS ?? 700) || 0);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const bridge = app.get(FirebaseAuthBridgeService);
    const assistant = app.get(AssistantService);
    bridge.ensureFirebaseApp();
    const idToken = await getIdToken();
    const bridged = await bridge.authenticate(idToken);
    logger.log(`Authenticated as ${bridged.email}; rerunning ${items.length}`);

    const results: Array<Record<string, unknown>> = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      try {
        const response = await RequestContextStore.run(
          {
            accessToken: idToken,
            authMode: 'firebase',
            ednovUserId: bridged.ednovUserId,
            ednovCompanyId: bridged.ednovCompanyId,
            firebaseUid: bridged.firebaseUid,
            applicationContext: {
              locale: 'fr',
              page: {
                route: '/dashboard',
                interfaceId: 'dashboard',
                title: 'Dashboard',
              },
            },
          },
          () =>
            assistant.chat(
              bridged.id,
              item.q,
              undefined,
              undefined,
              undefined,
              undefined,
              { executionMode: 'interactive' },
            ),
        );
        const answer = String(response?.answer ?? '');
        const safe = SensitiveDataRedactor.redact(answer);
        const issues = detectIssues(answer, item.category);
        const ok = issues.length === 0;
        logger.log(
          `#${i + 1}/${items.length} ${ok ? 'OK' : `FAIL[${issues.join(',')}]`} [${item.category}] ${item.q}`,
        );
        results.push({
          q: item.q,
          category: item.category,
          ok,
          issues,
          preview: safe.slice(0, 220).replace(/\s+/g, ' '),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`#${i + 1}/${items.length} FAIL[thrown] ${item.q} ${message}`);
        results.push({
          q: item.q,
          category: item.category,
          ok: false,
          issues: ['thrown_error'],
          error: message,
        });
      }
    }

    const failed = results.filter((r) => !r.ok);
    const report = {
      total: results.length,
      ok: results.length - failed.length,
      failed: failed.length,
      failures: failed,
    };
    const outPath = path.resolve(__dirname, '../tmp/question-battery-rerun.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    logger.log(`Done. ok=${report.ok}/${report.total} report=${outPath}`);
    console.log(JSON.stringify({ total: report.total, ok: report.ok, failed: report.failed }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
