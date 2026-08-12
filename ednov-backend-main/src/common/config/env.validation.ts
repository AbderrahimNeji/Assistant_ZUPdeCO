import * as Joi from 'joi';

const base = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  SERVICE_NAME: Joi.string().default('ednov-backend'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
});

const database = Joi.object({
  DATABASE_URL: Joi.string().required(),
  DATABASE_SCHEMA: Joi.string().default('public'),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
});

const firebase = Joi.object({
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  /** Web API key (Identity Toolkit) — legacy; no longer used for invitation emails (kept for other flows) */
  FIREBASE_WEB_API_KEY: Joi.string().optional().allow(''),
  /** Base URL used in invitation/activation email links */
  FRONTEND_URL: Joi.string().optional().allow(''),
});

/**
 * Secret used to sign 14-day account activation tokens (POST /users/invite email path).
 * Optional at boot (so unrelated environments still start); enforced at runtime when an
 * invitation/activation is actually issued (see invitation-token.ts).
 */
const invitation = Joi.object({
  INVITATION_JWT_SECRET: Joi.string().min(16).optional().allow(''),
});

const cors = Joi.object({
  CORS_ORIGINS: Joi.string().default('http://localhost:5173,http://localhost:3000,http://localhost:8081'),
});

/** Student account: min présences séances pour viser accompanied à la réactivation (défaut 3). */
const userStatus = Joi.object({
  STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS: Joi.number().integer().min(1).default(3),
});

export const monolithEnvSchema = base
  .concat(database)
  .concat(firebase)
  .concat(invitation)
  .concat(cors)
  .concat(userStatus);
