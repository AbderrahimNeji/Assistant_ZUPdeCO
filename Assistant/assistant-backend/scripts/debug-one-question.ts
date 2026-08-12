import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { AssistantService } from '../src/modules/assistant/assistant.service';
import { FirebaseAuthBridgeService } from '../src/modules/integration/firebase-auth-bridge.service';
import { RequestContextStore } from '../src/modules/integration/request-context';
import { AcademicAdapter } from '../src/modules/integration/adapters/academic.adapter';
import { SessionSkill } from '../src/modules/business-skills/skills/session.skill';
import { BusinessSkillRegistry } from '../src/modules/business-skills/skill.registry';
import { todayIso } from '../src/modules/integration/adapters/dashboard.adapter';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const bridge = app.get(FirebaseAuthBridgeService);
  const assistant = app.get(AssistantService);
  const academic = app.get(AcademicAdapter);
  const sessionSkill = app.get(SessionSkill);
  const registry = app.get(BusinessSkillRegistry);
  bridge.ensureFirebaseApp();

  const apiKey = 'AIzaSyDlH82OVofyKPk-NgZTnOLB7dmmSbmY60o';
  const tok = (await (
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ednov.test@example.com',
          password: 'TestEdnov123!',
          returnSecureToken: true,
        }),
      },
    )
  ).json()) as { idToken: string };

  const bridged = await bridge.authenticate(tok.idToken);
  const q = process.argv[2] || 'Quelles séances aujourd’hui ?';

  const matched = registry.skills
    .filter((s) => s.domains.some((p) => p.test(q)))
    .map((s) => s.id);
  console.log('matched skills', matched);
  console.log('todayIso', todayIso());

  await RequestContextStore.run(
    {
      accessToken: tok.idToken,
      authMode: 'firebase',
      ednovUserId: bridged.ednovUserId,
      ednovCompanyId: bridged.ednovCompanyId,
      firebaseUid: bridged.firebaseUid,
      applicationContext: {
        locale: 'fr',
        page: { route: '/dashboard', interfaceId: 'dashboard', title: 'Dashboard' },
      },
    },
    async () => {
      const today = todayIso();
      try {
        const page = await academic.listSessionsPage({
          limit: 10,
          sortBy: 'sessionDate',
          sortOrder: 'asc',
          dateFrom: today,
          dateTo: today,
        });
        console.log('listSessionsPage today', {
          total: page.total,
          n: page.sessions.length,
          first: page.sessions[0],
        });
      } catch (e) {
        console.log('listSessionsPage error', e instanceof Error ? e.message : e);
      }

      const skillResult = await sessionSkill.execute({
        question: q,
        user: {
          userId: bridged.id,
          role: bridged.role as never,
          email: bridged.email,
        } as never,
        applicationContext:
          RequestContextStore.getApplicationContext() ?? undefined,
        locale: 'fr',
      } as never);
      console.log('session skill', {
        ok: skillResult.ok,
        operation: skillResult.operation,
        factsHead: skillResult.facts?.slice(0, 4),
        warnings: skillResult.warnings,
      });

      const resp = await assistant.chat(
        bridged.id,
        q,
        undefined,
        undefined,
        undefined,
        undefined,
        { executionMode: 'interactive' },
      );
      console.log('ANSWER:\n', String(resp.answer).slice(0, 700));
      console.log(
        'biz',
        JSON.stringify(resp.executionTrace?.knowledge?.business, null, 2)?.slice(
          0,
          1200,
        ),
      );
    },
  );

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
