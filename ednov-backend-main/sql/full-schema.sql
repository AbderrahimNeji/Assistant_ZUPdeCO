-- =============================================================================
-- EDNOV White-Label – Full SQL Schema (PostgreSQL)
-- =============================================================================
-- Multi-tenant by company_id | Firebase Auth (users.firebase_uid) | Soft delete
-- Review: 2026 – All table and column names in English
--
-- IMPORTANT: This file describes the INITIAL schema only. The actual database
-- state is: full-schema + migrations 1 through 9. Do not use this file alone
-- to create a new database; use "npm run migration:run" from ednov-backend
-- so that all migrations (AddRules, DropPasswordHash, UserInterfacePreferences,
-- ExtendBrandings, AddInterfaceElements, RefactorBrandingWithClearNaming,
-- AddBrandingHistoriesCreatedAt, AddTriggersUpdatedAt, etc.) are applied.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. COMPANIES (tenant root)
-- -----------------------------------------------------------------------------
CREATE TABLE companies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50) NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  legal_name           VARCHAR(255),
  description          TEXT,
  contract_type        VARCHAR(50),
  contract_start_date  DATE,
  contract_end_date    DATE,
  logo_url             VARCHAR(500),
  primary_color        VARCHAR(20),
  secondary_color      VARCHAR(20),
  domain               VARCHAR(255),
  timezone             VARCHAR(50) DEFAULT 'Europe/Paris',
  status               VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  settings             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_companies_code ON companies (code) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_status ON companies (status);
CREATE INDEX idx_companies_deleted_at ON companies (deleted_at);

-- -----------------------------------------------------------------------------
-- 2. ESTABLISHMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE establishments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  uai_code          VARCHAR(20) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  official_name     VARCHAR(255),
  type              VARCHAR(50)
    CHECK (type IN ('college', 'lycee', 'professionnel', 'other')),
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  address_line1     VARCHAR(255),
  address_line2     VARCHAR(255),
  postal_code       VARCHAR(20),
  city              VARCHAR(100),
  country           VARCHAR(2) DEFAULT 'FR',
  latitude          DECIMAL(10, 7),
  longitude         DECIMAL(10, 7),
  calendar_type     VARCHAR(20) DEFAULT 'none'
    CHECK (calendar_type IN ('none', 'weekly', 'ab')),
  timezone          VARCHAR(50) DEFAULT 'Europe/Paris',
  contact_name      VARCHAR(255),
  contact_email     VARCHAR(255),
  contact_phone     VARCHAR(50),
  student_quota     INT,
  volunteer_quota   INT,
  gov_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_establishments_company_uai
  ON establishments (company_id, uai_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_establishments_company_id ON establishments (company_id);
CREATE INDEX idx_establishments_company_status ON establishments (company_id, status);

-- -----------------------------------------------------------------------------
-- 3. ROOMS
-- -----------------------------------------------------------------------------
CREATE TABLE rooms (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  establishment_id     UUID NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
  name                 VARCHAR(100) NOT NULL,
  label                VARCHAR(255),
  capacity             INT,
  is_available         BOOLEAN NOT NULL DEFAULT true,
  availability_rules   JSONB,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_rooms_company_id ON rooms (company_id);
CREATE INDEX idx_rooms_establishment_id ON rooms (establishment_id);

-- -----------------------------------------------------------------------------
-- 4. USERS (Firebase Auth: firebase_uid links to Firebase User.uid)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  firebase_uid   VARCHAR(128) NOT NULL,
  email          VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  phone          VARCHAR(50),
  photo_url      VARCHAR(500),
  display_name   VARCHAR(255),
  first_name     VARCHAR(100),
  last_name      VARCHAR(100),
  password_hash  VARCHAR(255),
  status         VARCHAR(20) NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'accompanied', 'deactivated')),
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_users_firebase_uid ON users (firebase_uid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_company_email
  ON users (company_id, email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_users_company_id ON users (company_id);
CREATE INDEX idx_users_company_status ON users (company_id, status);
CREATE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. ROLES
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code         VARCHAR(50) NOT NULL,
  label        VARCHAR(100) NOT NULL,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT false,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  permissions  JSONB DEFAULT '{}',
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  role_group   VARCHAR(32) NOT NULL DEFAULT 'other'
    CHECK (role_group IN ('super_admin', 'steering', 'operations', 'service_user', 'other')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_roles_company_code ON roles (company_id, code) WHERE deleted_at IS NULL;
CREATE INDEX idx_roles_company_id ON roles (company_id);
CREATE INDEX idx_roles_company_role_group ON roles (company_id, role_group) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 6. USER_ROLES (M2M)
-- -----------------------------------------------------------------------------
CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles (user_id, role_id);
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- -----------------------------------------------------------------------------
-- 7. PROFILES (functional profile, not RBAC role)
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code        VARCHAR(50) NOT NULL,
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  category    VARCHAR(30) NOT NULL
    CHECK (category IN ('admin', 'volunteer', 'student', 'coordinator')),
  config      JSONB DEFAULT '{}',
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_profiles_company_id ON profiles (company_id);

-- -----------------------------------------------------------------------------
-- 8. USER_PROFILES
-- -----------------------------------------------------------------------------
CREATE TABLE user_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  profile_id       UUID REFERENCES profiles (id) ON DELETE SET NULL,
  profile_label    VARCHAR(255),
  grade_level      VARCHAR(50),
  subjects         JSONB,
  availability     JSONB,
  is_minor         BOOLEAN DEFAULT false,
  guardian_contact JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

-- -----------------------------------------------------------------------------
-- 9. PROGRAMS
-- -----------------------------------------------------------------------------
CREATE TABLE programs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code         VARCHAR(50) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  start_date   DATE,
  end_date     DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'suspended', 'closed')),
  rules        JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_programs_company_id ON programs (company_id);

-- -----------------------------------------------------------------------------
-- 10. LEVELS
-- -----------------------------------------------------------------------------
CREATE TABLE levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,
  label           VARCHAR(100) NOT NULL,
  education_cycle VARCHAR(20)
    CHECK (education_cycle IN ('primary', 'middle', 'high')),
  min_age         INT,
  max_age         INT,
  order_index     INT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_levels_company_id ON levels (company_id);

-- -----------------------------------------------------------------------------
-- 11. SUBJECTS
-- -----------------------------------------------------------------------------
CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,
  label           VARCHAR(100) NOT NULL,
  description     TEXT,
  education_cycle VARCHAR(20),
  is_core         BOOLEAN DEFAULT false,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_subjects_company_id ON subjects (company_id);

-- -----------------------------------------------------------------------------
-- 12. SCHOOL_YEARS
-- -----------------------------------------------------------------------------
CREATE TABLE school_years (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code        VARCHAR(20) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_school_years_company_id ON school_years (company_id);

-- -----------------------------------------------------------------------------
-- 12b. VACATION_ZONES (vacances scolaires France A/B/C par entreprise)
-- -----------------------------------------------------------------------------
CREATE TABLE vacation_zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code          VARCHAR(10) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_vacation_zones_company_id ON vacation_zones (company_id);

CREATE UNIQUE INDEX uq_vacation_zones_company_code
  ON vacation_zones (company_id, code)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_vacation_zones_deleted_at ON vacation_zones (deleted_at);

-- -----------------------------------------------------------------------------
-- 13. HOLIDAYS
-- -----------------------------------------------------------------------------
CREATE TABLE holidays (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  type                  VARCHAR(30) NOT NULL
    CHECK (type IN ('national', 'regional', 'establishment_specific')),
  establishment_id      UUID REFERENCES establishments (id) ON DELETE SET NULL,
  vacation_zone_id      UUID REFERENCES vacation_zones (id) ON DELETE SET NULL,
  is_recurring_yearly   BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_holidays_company_id ON holidays (company_id);
CREATE INDEX idx_holidays_vacation_zone_id ON holidays (vacation_zone_id);

-- -----------------------------------------------------------------------------
-- 14. SESSION_CONFIGS
-- -----------------------------------------------------------------------------
CREATE TABLE session_configs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  default_duration_minutes    INT,
  max_students_per_session    INT,
  max_volunteers_per_session   INT,
  allow_recurring             BOOLEAN DEFAULT true,
  allow_ab_calendar           BOOLEAN DEFAULT false,
  allow_overbooking           BOOLEAN DEFAULT false,
  report_deadline_hours      INT,
  auto_close_after_days       INT,
  matching_strategy           VARCHAR(20) DEFAULT 'manual'
    CHECK (matching_strategy IN ('manual', 'automatic', 'hybrid')),
  settings                    JSONB DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_session_configs_company ON session_configs (company_id);

-- -----------------------------------------------------------------------------
-- 15. SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  establishment_id  UUID NOT NULL REFERENCES establishments (id) ON DELETE RESTRICT,
  room_id           UUID REFERENCES rooms (id) ON DELETE SET NULL,
  program_id        UUID REFERENCES programs (id) ON DELETE SET NULL,
  school_year_id    UUID NOT NULL REFERENCES school_years (id) ON DELETE RESTRICT,
  level_id          UUID REFERENCES levels (id) ON DELETE SET NULL,
  session_date      DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  type              VARCHAR(50) NOT NULL
    CHECK (type IN ('homework_help', 'individual_tutoring', 'workshop', 'whole_class')),
  mode              VARCHAR(20) NOT NULL DEFAULT 'single'
    CHECK (mode IN ('single', 'recurring')),
  recurrence_type   VARCHAR(20) DEFAULT 'none'
    CHECK (recurrence_type IN ('none', 'weekly', 'biweekly', 'ab', 'monthly')),
  recurrence_rule   JSONB,
  max_students      INT,
  internal_notes     TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'closed', 'cancelled')),
  managed_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  version           INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_session_times CHECK (end_time > start_time)
);

CREATE INDEX idx_sessions_company_id ON sessions (company_id);
CREATE INDEX idx_sessions_company_created ON sessions (company_id, created_at);
CREATE INDEX idx_sessions_company_status ON sessions (company_id, status);
CREATE INDEX idx_sessions_establishment_date ON sessions (establishment_id, session_date);
CREATE INDEX idx_sessions_school_year ON sessions (company_id, school_year_id);

-- -----------------------------------------------------------------------------
-- 16. SESSION_PARTICIPANTS
-- -----------------------------------------------------------------------------
CREATE TABLE session_participants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role               VARCHAR(20) NOT NULL
    CHECK (role IN ('volunteer', 'student')),
  attendance_status  VARCHAR(20) DEFAULT 'pending'
    CHECK (attendance_status IN ('present', 'absent', 'excused', 'pending')),
  matched_at         TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_session_participants_session_user
  ON session_participants (session_id, user_id);
CREATE INDEX idx_session_participants_session_id ON session_participants (session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants (user_id);

-- -----------------------------------------------------------------------------
-- 17. ASSIGNMENTS (one assigned volunteer per session)
-- -----------------------------------------------------------------------------
CREATE TABLE assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  session_id         UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  volunteer_user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_assignments_company_session ON assignments (company_id, session_id);
CREATE INDEX idx_assignments_company_id ON assignments (company_id);
CREATE INDEX idx_assignments_volunteer ON assignments (company_id, volunteer_user_id);

-- -----------------------------------------------------------------------------
-- 18. SESSION_REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE session_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  session_id    UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  rating        SMALLINT CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  subject       VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'validated', 'overdue')),
  validated_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  validated_at  TIMESTAMPTZ,
  version       INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_session_reports_session ON session_reports (company_id, session_id);
CREATE INDEX idx_session_reports_company_id ON session_reports (company_id);

-- -----------------------------------------------------------------------------
-- 19. VSC_REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE vsc_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  session_id           UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  student_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  volunteer_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  summary              TEXT,
  progress_evaluation  TEXT,
  recommendations      TEXT,
  status               VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'validated')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsc_reports_company_id ON vsc_reports (company_id);
CREATE INDEX idx_vsc_reports_session_id ON vsc_reports (session_id);

-- -----------------------------------------------------------------------------
-- 20. COMPANY_SETTINGS
-- -----------------------------------------------------------------------------
CREATE TABLE company_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_company_settings_company_key ON company_settings (company_id, key);
CREATE INDEX idx_company_settings_company_id ON company_settings (company_id);

-- -----------------------------------------------------------------------------
-- 21. FEATURE_FLAGS
-- -----------------------------------------------------------------------------
CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_feature_flags_company_key ON feature_flags (company_id, key);

-- -----------------------------------------------------------------------------
-- 22. BRANDINGS
-- -----------------------------------------------------------------------------
CREATE TABLE brandings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL UNIQUE REFERENCES companies (id) ON DELETE CASCADE,
  logo_url            VARCHAR(500),
  logo_dark_url       VARCHAR(500),
  favicon_url         VARCHAR(500),
  primary_color       VARCHAR(20),
  secondary_color     VARCHAR(20),
  accent_color        VARCHAR(20),
  background_color    VARCHAR(20),
  text_color          VARCHAR(20),
  font_family         VARCHAR(100),
  font_url            VARCHAR(500),
  border_radius       VARCHAR(50),
  button_style        VARCHAR(20)
    CHECK (button_style IN ('rounded', 'square', 'pill')),
  layout_type         VARCHAR(20) DEFAULT 'default'
    CHECK (layout_type IN ('default', 'compact', 'modern')),
  custom_css          TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 23. BRANDING_HISTORIES
-- -----------------------------------------------------------------------------
CREATE TABLE branding_histories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  old_config  JSONB NOT NULL,
  changed_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_branding_histories_company_id ON branding_histories (company_id);

-- -----------------------------------------------------------------------------
-- 24. THEMES
-- -----------------------------------------------------------------------------
CREATE TABLE themes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(50) NOT NULL,
  mode        VARCHAR(10) NOT NULL
    CHECK (mode IN ('light', 'dark', 'auto')),
  variables   JSONB DEFAULT '{}',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_themes_company_id ON themes (company_id);

-- -----------------------------------------------------------------------------
-- 25. MEDIA_ASSETS
-- -----------------------------------------------------------------------------
CREATE TABLE media_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL
    CHECK (type IN ('logo', 'icon', 'banner', 'document', 'email_template')),
  name        VARCHAR(255),
  file_url    VARCHAR(500) NOT NULL,
  file_type   VARCHAR(50),
  file_size   BIGINT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_media_assets_company_id ON media_assets (company_id);

-- -----------------------------------------------------------------------------
-- 26. EMAIL_TEMPLATES
-- -----------------------------------------------------------------------------
CREATE TABLE email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code        VARCHAR(50) NOT NULL,
  name        VARCHAR(255),
  subject     VARCHAR(500),
  body_html   TEXT,
  body_text   TEXT,
  variables   JSONB DEFAULT '[]',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_email_templates_company_code
  ON email_templates (company_id, code) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 27. DOCUMENT_TEMPLATES
-- -----------------------------------------------------------------------------
CREATE TABLE document_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code          VARCHAR(50) NOT NULL,
  name          VARCHAR(255),
  type          VARCHAR(30)
    CHECK (type IN ('report', 'certificate', 'contract', 'other')),
  template_html TEXT,
  variables     JSONB DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_document_templates_company_id ON document_templates (company_id);

-- -----------------------------------------------------------------------------
-- 28. UI_CONFIGURATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE ui_configurations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                 UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  show_logo_in_header        BOOLEAN DEFAULT true,
  show_company_name          BOOLEAN DEFAULT true,
  enable_dark_mode_toggle    BOOLEAN DEFAULT true,
  default_language          VARCHAR(10) DEFAULT 'fr',
  available_languages       JSONB DEFAULT '["fr", "en"]',
  dashboard_layout          JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_ui_configurations_company ON ui_configurations (company_id);

-- -----------------------------------------------------------------------------
-- 29. AUDIT_LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  entity      VARCHAR(100) NOT NULL,
  entity_id   UUID NOT NULL,
  action      VARCHAR(50) NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs (company_id);
CREATE INDEX idx_audit_logs_company_created ON audit_logs (company_id, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);

-- -----------------------------------------------------------------------------
-- 30. OUTBOX_EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE outbox_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  aggregate_type   VARCHAR(100) NOT NULL,
  aggregate_id     UUID NOT NULL,
  event_type       VARCHAR(100) NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}',
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_events_status_created
  ON outbox_events (status, created_at) WHERE status = 'pending';
CREATE INDEX idx_outbox_events_company_id ON outbox_events (company_id);

-- -----------------------------------------------------------------------------
-- 31. PROCESSED_EVENTS (idempotency for consumers)
-- -----------------------------------------------------------------------------
CREATE TABLE processed_events (
  consumer_id  VARCHAR(100) NOT NULL,
  event_id     UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_id, event_id)
);

-- -----------------------------------------------------------------------------
-- 32. IDEMPOTENCY_KEYS
-- -----------------------------------------------------------------------------
CREATE TABLE idempotency_keys (
  key                 VARCHAR(255) PRIMARY KEY,
  company_id          UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  response_status     SMALLINT,
  response_body_hash  VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_idempotency_keys_company_created
  ON idempotency_keys (company_id, created_at);

-- =============================================================================
-- TRIGGER: set updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_establishments_updated_at
  BEFORE UPDATE ON establishments FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_rooms_updated_at
  BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_roles_updated_at
  BEFORE UPDATE ON roles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_programs_updated_at
  BEFORE UPDATE ON programs FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_levels_updated_at
  BEFORE UPDATE ON levels FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_subjects_updated_at
  BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_school_years_updated_at
  BEFORE UPDATE ON school_years FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_vacation_zones_updated_at
  BEFORE UPDATE ON vacation_zones FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_holidays_updated_at
  BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_session_configs_updated_at
  BEFORE UPDATE ON session_configs FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_sessions_updated_at
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_assignments_updated_at
  BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_session_reports_updated_at
  BEFORE UPDATE ON session_reports FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_vsc_reports_updated_at
  BEFORE UPDATE ON vsc_reports FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_company_settings_updated_at
  BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_brandings_updated_at
  BEFORE UPDATE ON brandings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_themes_updated_at
  BEFORE UPDATE ON themes FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_media_assets_updated_at
  BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_email_templates_updated_at
  BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_document_templates_updated_at
  BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_ui_configurations_updated_at
  BEFORE UPDATE ON ui_configurations FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- =============================================================================
-- END OF SCHEMA (rules / rule_overrides ajoutées par migration 1730000000001-AddRules)
-- =============================================================================
