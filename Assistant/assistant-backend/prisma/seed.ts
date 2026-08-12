import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@zupdeco.fr';
const DEMO_PASSWORD = 'Password123';
const TUTOR_EMAIL = 'tutor@zupdeco.fr';

/**
 * Seed strategy:
 * - Always seed local auth users (for AUTH_MODE=local development).
 * - Always seed Assistant-owned FAQ/policy snippets.
 * - Academic demo data (courses/registrations/programs) is OFF by default.
 *   Set SEED_DEMO_ACADEMIC=true only for standalone local demos.
 *   Production Copilot uses Ednov APIs via adapters (AUTH_MODE=firebase).
 */
async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const seedDemoAcademic = process.env.SEED_DEMO_ACADEMIC === 'true';

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      password,
      firstName: 'Demo',
      lastName: 'User',
      role: UserRole.STUDENT,
    },
    create: {
      email: DEMO_EMAIL,
      firstName: 'Demo',
      lastName: 'User',
      password,
      role: UserRole.STUDENT,
    },
  });

  const tutor = await prisma.user.upsert({
    where: { email: TUTOR_EMAIL },
    update: {
      password,
      firstName: 'Camille',
      lastName: 'Martin',
      role: UserRole.TUTOR,
    },
    create: {
      email: TUTOR_EMAIL,
      firstName: 'Camille',
      lastName: 'Martin',
      password,
      role: UserRole.TUTOR,
    },
  });

  await prisma.user
    .update({
      where: { email: 'demo@assistant.ai' },
      data: { password },
    })
    .catch(() => undefined);

  if (seedDemoAcademic) {
    await seedAcademicDemo(demoUser.id, tutor.id);
    console.log('Seeded demo academic data (SEED_DEMO_ACADEMIC=true)');
  } else {
    // Clear leftover demo campus rows so local AUTH_MODE=firebase/ednov data
    // is not mixed with obsolete seed courses.
    await prisma.registration.deleteMany({
      where: {
        OR: [
          { courseId: { in: ['seed-course-math', 'seed-course-french', 'seed-course-ai'] } },
          { programId: 'seed-program-success' },
        ],
      },
    });
    await prisma.course.deleteMany({
      where: {
        id: {
          in: ['seed-course-math', 'seed-course-french', 'seed-course-ai'],
        },
      },
    });
    await prisma.program.deleteMany({
      where: { id: 'seed-program-success' },
    });
    console.log(
      'Skipped demo academic seed (use SEED_DEMO_ACADEMIC=true for standalone demos)',
    );
  }

  await prisma.faq.upsert({
    where: { id: 'seed-faq-hours' },
    update: {
      question: 'What are tutoring session hours?',
      answer:
        'Sessions typically run Monday–Friday between 16:00 and 19:00. Exact slots depend on your tutor.',
      audience: [],
      tags: ['schedule', 'tutoring'],
      isPublished: true,
    },
    create: {
      id: 'seed-faq-hours',
      question: 'What are tutoring session hours?',
      answer:
        'Sessions typically run Monday–Friday between 16:00 and 19:00. Exact slots depend on your tutor.',
      audience: [],
      tags: ['schedule', 'tutoring'],
      isPublished: true,
    },
  });

  await prisma.faq.upsert({
    where: { id: 'seed-faq-enroll' },
    update: {
      question: 'How do I enroll in a course?',
      answer:
        'Ask your coordinator or tutor to register you in Ednov. The Copilot can help summarize sessions and assignments.',
      audience: ['STUDENT', 'PARENT', 'ALL'],
      tags: ['enrollment', 'registration'],
      isPublished: true,
    },
    create: {
      id: 'seed-faq-enroll',
      question: 'How do I enroll in a course?',
      answer:
        'Ask your coordinator or tutor to register you in Ednov. The Copilot can help summarize sessions and assignments.',
      audience: ['STUDENT', 'PARENT', 'ALL'],
      tags: ['enrollment', 'registration'],
      isPublished: true,
    },
  });

  await prisma.policy.upsert({
    where: { id: 'seed-policy-privacy' },
    update: {
      title: 'Privacy & data protection',
      summary:
        'Personal learning data is visible only to the learner and authorized staff for that learner.',
      content:
        'Ednov Copilot must never expose another user’s private profile, messages, or enrollments. Staff access is role-scoped via Ednov APIs.',
      audience: [],
      isPublished: true,
    },
    create: {
      id: 'seed-policy-privacy',
      title: 'Privacy & data protection',
      summary:
        'Personal learning data is visible only to the learner and authorized staff for that learner.',
      content:
        'Ednov Copilot must never expose another user’s private profile, messages, or enrollments. Staff access is role-scoped via Ednov APIs.',
      audience: [],
      isPublished: true,
    },
  });

  console.log(`Seeded local auth user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Seeded local tutor user: ${TUTOR_EMAIL} / ${DEMO_PASSWORD}`);
  console.log('Seeded Assistant-owned FAQ/policy knowledge');
}

async function seedAcademicDemo(demoUserId: string, tutorId: string) {
  const mathCourse = await prisma.course.upsert({
    where: { id: 'seed-course-math' },
    update: {
      title: 'Mathematics Foundations',
      description:
        'Algebra, functions, and problem solving for middle-school learners.',
      subject: 'Mathematics',
      level: 'Collège',
      isPublished: true,
      tutorUserId: tutorId,
    },
    create: {
      id: 'seed-course-math',
      title: 'Mathematics Foundations',
      description:
        'Algebra, functions, and problem solving for middle-school learners.',
      subject: 'Mathematics',
      level: 'Collège',
      isPublished: true,
      tutorUserId: tutorId,
    },
  });

  const frenchCourse = await prisma.course.upsert({
    where: { id: 'seed-course-french' },
    update: {
      title: 'French Literacy',
      description: 'Reading comprehension, writing, and oral expression.',
      subject: 'French',
      level: 'Collège',
      isPublished: true,
      tutorUserId: tutorId,
    },
    create: {
      id: 'seed-course-french',
      title: 'French Literacy',
      description: 'Reading comprehension, writing, and oral expression.',
      subject: 'French',
      level: 'Collège',
      isPublished: true,
      tutorUserId: tutorId,
    },
  });

  await prisma.course.upsert({
    where: { id: 'seed-course-ai' },
    update: {
      title: 'AI Foundations',
      description:
        'Introduction to artificial intelligence concepts for tutoring programs.',
      subject: 'Computer Science',
      level: 'Lycée',
      isPublished: true,
      tutorUserId: tutorId,
    },
    create: {
      id: 'seed-course-ai',
      title: 'AI Foundations',
      description:
        'Introduction to artificial intelligence concepts for tutoring programs.',
      subject: 'Computer Science',
      level: 'Lycée',
      isPublished: true,
      tutorUserId: tutorId,
    },
  });

  const program = await prisma.program.upsert({
    where: { id: 'seed-program-success' },
    update: {
      name: 'Academic Success Track',
      description:
        'Personalized tutoring path combining mathematics and literacy support.',
      isPublished: true,
    },
    create: {
      id: 'seed-program-success',
      name: 'Academic Success Track',
      description:
        'Personalized tutoring path combining mathematics and literacy support.',
      isPublished: true,
    },
  });

  await prisma.registration.deleteMany({
    where: {
      studentUserId: demoUserId,
      OR: [
        { courseId: mathCourse.id },
        { courseId: frenchCourse.id },
        { programId: program.id },
      ],
    },
  });

  await prisma.registration.createMany({
    data: [
      {
        studentUserId: demoUserId,
        courseId: mathCourse.id,
        status: 'ACTIVE',
      },
      {
        studentUserId: demoUserId,
        courseId: frenchCourse.id,
        status: 'ACTIVE',
      },
      {
        studentUserId: demoUserId,
        programId: program.id,
        status: 'ACTIVE',
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
