-- Clone ednov_testing schema to remote schema
-- Run this manually in Supabase SQL Editor or via direct postgres connection (not pooler)
-- Estimated time: 2-5 minutes for full clone with 66k+ rows

-- Step 1: Create schema
CREATE SCHEMA IF NOT EXISTS remote;

-- Step 2: Clone all table structures and data
-- Using CREATE TABLE ... (LIKE ... INCLUDING ALL) + INSERT INTO ... SELECT *

CREATE TABLE remote.activities (LIKE ednov_testing.activities INCLUDING ALL);
INSERT INTO remote.activities SELECT * FROM ednov_testing.activities;

CREATE TABLE remote.activity_types (LIKE ednov_testing.activity_types INCLUDING ALL);
INSERT INTO remote.activity_types SELECT * FROM ednov_testing.activity_types;

CREATE TABLE remote.assigned_post_it_templates (LIKE ednov_testing.assigned_post_it_templates INCLUDING ALL);
INSERT INTO remote.assigned_post_it_templates SELECT * FROM ednov_testing.assigned_post_it_templates;

CREATE TABLE remote.assignments (LIKE ednov_testing.assignments INCLUDING ALL);
INSERT INTO remote.assignments SELECT * FROM ednov_testing.assignments;

CREATE TABLE remote.audit_logs (LIKE ednov_testing.audit_logs INCLUDING ALL);
INSERT INTO remote.audit_logs SELECT * FROM ednov_testing.audit_logs;

CREATE TABLE remote.branding_histories (LIKE ednov_testing.branding_histories INCLUDING ALL);
INSERT INTO remote.branding_histories SELECT * FROM ednov_testing.branding_histories;

CREATE TABLE remote.brandings (LIKE ednov_testing.brandings INCLUDING ALL);
INSERT INTO remote.brandings SELECT * FROM ednov_testing.brandings;

CREATE TABLE remote.companies (LIKE ednov_testing.companies INCLUDING ALL);
INSERT INTO remote.companies SELECT * FROM ednov_testing.companies;

CREATE TABLE remote.company_settings (LIKE ednov_testing.company_settings INCLUDING ALL);
INSERT INTO remote.company_settings SELECT * FROM ednov_testing.company_settings;

CREATE TABLE remote.contact_functions (LIKE ednov_testing.contact_functions INCLUDING ALL);
INSERT INTO remote.contact_functions SELECT * FROM ednov_testing.contact_functions;

CREATE TABLE remote.core_pairs (LIKE ednov_testing.core_pairs INCLUDING ALL);
INSERT INTO remote.core_pairs SELECT * FROM ednov_testing.core_pairs;

CREATE TABLE remote.document_templates (LIKE ednov_testing.document_templates INCLUDING ALL);
INSERT INTO remote.document_templates SELECT * FROM ednov_testing.document_templates;

CREATE TABLE remote.email_templates (LIKE ednov_testing.email_templates INCLUDING ALL);
INSERT INTO remote.email_templates SELECT * FROM ednov_testing.email_templates;

CREATE TABLE remote.establishment_coordinators (LIKE ednov_testing.establishment_coordinators INCLUDING ALL);
INSERT INTO remote.establishment_coordinators SELECT * FROM ednov_testing.establishment_coordinators;

CREATE TABLE remote.establishment_specialties (LIKE ednov_testing.establishment_specialties INCLUDING ALL);
INSERT INTO remote.establishment_specialties SELECT * FROM ednov_testing.establishment_specialties;

CREATE TABLE remote.establishments (LIKE ednov_testing.establishments INCLUDING ALL);
INSERT INTO remote.establishments SELECT * FROM ednov_testing.establishments;
-- Note: 66,858 rows - this will take a bit longer

CREATE TABLE remote.feature_flags (LIKE ednov_testing.feature_flags INCLUDING ALL);
INSERT INTO remote.feature_flags SELECT * FROM ednov_testing.feature_flags;

CREATE TABLE remote.gamification_badge_conditions (LIKE ednov_testing.gamification_badge_conditions INCLUDING ALL);
INSERT INTO remote.gamification_badge_conditions SELECT * FROM ednov_testing.gamification_badge_conditions;

CREATE TABLE remote.gamification_badges (LIKE ednov_testing.gamification_badges INCLUDING ALL);
INSERT INTO remote.gamification_badges SELECT * FROM ednov_testing.gamification_badges;

CREATE TABLE remote.gamification_challenge_progress (LIKE ednov_testing.gamification_challenge_progress INCLUDING ALL);
INSERT INTO remote.gamification_challenge_progress SELECT * FROM ednov_testing.gamification_challenge_progress;

CREATE TABLE remote.gamification_challenges (LIKE ednov_testing.gamification_challenges INCLUDING ALL);
INSERT INTO remote.gamification_challenges SELECT * FROM ednov_testing.gamification_challenges;

CREATE TABLE remote.gamification_niveaux (LIKE ednov_testing.gamification_niveaux INCLUDING ALL);
INSERT INTO remote.gamification_niveaux SELECT * FROM ednov_testing.gamification_niveaux;

CREATE TABLE remote.gamification_user_badges (LIKE ednov_testing.gamification_user_badges INCLUDING ALL);
INSERT INTO remote.gamification_user_badges SELECT * FROM ednov_testing.gamification_user_badges;

CREATE TABLE remote.gamification_xp_logs (LIKE ednov_testing.gamification_xp_logs INCLUDING ALL);
INSERT INTO remote.gamification_xp_logs SELECT * FROM ednov_testing.gamification_xp_logs;

CREATE TABLE remote.gamification_xp_regles (LIKE ednov_testing.gamification_xp_regles INCLUDING ALL);
INSERT INTO remote.gamification_xp_regles SELECT * FROM ednov_testing.gamification_xp_regles;

CREATE TABLE remote.holidays (LIKE ednov_testing.holidays INCLUDING ALL);
INSERT INTO remote.holidays SELECT * FROM ednov_testing.holidays;

CREATE TABLE remote.idempotency_keys (LIKE ednov_testing.idempotency_keys INCLUDING ALL);
INSERT INTO remote.idempotency_keys SELECT * FROM ednov_testing.idempotency_keys;

CREATE TABLE remote.interface_elements (LIKE ednov_testing.interface_elements INCLUDING ALL);
INSERT INTO remote.interface_elements SELECT * FROM ednov_testing.interface_elements;

CREATE TABLE remote.levels (LIKE ednov_testing.levels INCLUDING ALL);
INSERT INTO remote.levels SELECT * FROM ednov_testing.levels;

CREATE TABLE remote.media_assets (LIKE ednov_testing.media_assets INCLUDING ALL);
INSERT INTO remote.media_assets SELECT * FROM ednov_testing.media_assets;

CREATE TABLE remote.migrations (LIKE ednov_testing.migrations INCLUDING ALL);
INSERT INTO remote.migrations SELECT * FROM ednov_testing.migrations;

CREATE TABLE remote.notifications (LIKE ednov_testing.notifications INCLUDING ALL);
INSERT INTO remote.notifications SELECT * FROM ednov_testing.notifications;

CREATE TABLE remote.outbox_events (LIKE ednov_testing.outbox_events INCLUDING ALL);
INSERT INTO remote.outbox_events SELECT * FROM ednov_testing.outbox_events;

CREATE TABLE remote.pedagogical_resources (LIKE ednov_testing.pedagogical_resources INCLUDING ALL);
INSERT INTO remote.pedagogical_resources SELECT * FROM ednov_testing.pedagogical_resources;

CREATE TABLE remote.post_it_shares (LIKE ednov_testing.post_it_shares INCLUDING ALL);
INSERT INTO remote.post_it_shares SELECT * FROM ednov_testing.post_it_shares;

CREATE TABLE remote.post_its (LIKE ednov_testing.post_its INCLUDING ALL);
INSERT INTO remote.post_its SELECT * FROM ednov_testing.post_its;

CREATE TABLE remote.processed_events (LIKE ednov_testing.processed_events INCLUDING ALL);
INSERT INTO remote.processed_events SELECT * FROM ednov_testing.processed_events;

CREATE TABLE remote.profiles (LIKE ednov_testing.profiles INCLUDING ALL);
INSERT INTO remote.profiles SELECT * FROM ednov_testing.profiles;

CREATE TABLE remote.programs (LIKE ednov_testing.programs INCLUDING ALL);
INSERT INTO remote.programs SELECT * FROM ednov_testing.programs;

CREATE TABLE remote.role_groups (LIKE ednov_testing.role_groups INCLUDING ALL);
INSERT INTO remote.role_groups SELECT * FROM ednov_testing.role_groups;

CREATE TABLE remote.role_interface_elements (LIKE ednov_testing.role_interface_elements INCLUDING ALL);
INSERT INTO remote.role_interface_elements SELECT * FROM ednov_testing.role_interface_elements;

CREATE TABLE remote.roles (LIKE ednov_testing.roles INCLUDING ALL);
INSERT INTO remote.roles SELECT * FROM ednov_testing.roles;

CREATE TABLE remote.rooms (LIKE ednov_testing.rooms INCLUDING ALL);
INSERT INTO remote.rooms SELECT * FROM ednov_testing.rooms;

CREATE TABLE remote.rule_overrides (LIKE ednov_testing.rule_overrides INCLUDING ALL);
INSERT INTO remote.rule_overrides SELECT * FROM ednov_testing.rule_overrides;

CREATE TABLE remote.rules (LIKE ednov_testing.rules INCLUDING ALL);
INSERT INTO remote.rules SELECT * FROM ednov_testing.rules;

CREATE TABLE remote.school_classes (LIKE ednov_testing.school_classes INCLUDING ALL);
INSERT INTO remote.school_classes SELECT * FROM ednov_testing.school_classes;

CREATE TABLE remote.school_years (LIKE ednov_testing.school_years INCLUDING ALL);
INSERT INTO remote.school_years SELECT * FROM ednov_testing.school_years;

CREATE TABLE remote.session_ai_chat_messages (LIKE ednov_testing.session_ai_chat_messages INCLUDING ALL);
INSERT INTO remote.session_ai_chat_messages SELECT * FROM ednov_testing.session_ai_chat_messages;

CREATE TABLE remote.session_configs (LIKE ednov_testing.session_configs INCLUDING ALL);
INSERT INTO remote.session_configs SELECT * FROM ednov_testing.session_configs;

CREATE TABLE remote.session_participants (LIKE ednov_testing.session_participants INCLUDING ALL);
INSERT INTO remote.session_participants SELECT * FROM ednov_testing.session_participants;

CREATE TABLE remote.session_reports (LIKE ednov_testing.session_reports INCLUDING ALL);
INSERT INTO remote.session_reports SELECT * FROM ednov_testing.session_reports;

CREATE TABLE remote.session_status_history (LIKE ednov_testing.session_status_history INCLUDING ALL);
INSERT INTO remote.session_status_history SELECT * FROM ednov_testing.session_status_history;

CREATE TABLE remote.session_student_tutor_pairs (LIKE ednov_testing.session_student_tutor_pairs INCLUDING ALL);
INSERT INTO remote.session_student_tutor_pairs SELECT * FROM ednov_testing.session_student_tutor_pairs;

CREATE TABLE remote.sessions (LIKE ednov_testing.sessions INCLUDING ALL);
INSERT INTO remote.sessions SELECT * FROM ednov_testing.sessions;

CREATE TABLE remote.specialties (LIKE ednov_testing.specialties INCLUDING ALL);
INSERT INTO remote.specialties SELECT * FROM ednov_testing.specialties;

CREATE TABLE remote.specialty_levels (LIKE ednov_testing.specialty_levels INCLUDING ALL);
INSERT INTO remote.specialty_levels SELECT * FROM ednov_testing.specialty_levels;

CREATE TABLE remote.student_status_history (LIKE ednov_testing.student_status_history INCLUDING ALL);
INSERT INTO remote.student_status_history SELECT * FROM ednov_testing.student_status_history;

CREATE TABLE remote.subjects (LIKE ednov_testing.subjects INCLUDING ALL);
INSERT INTO remote.subjects SELECT * FROM ednov_testing.subjects;

CREATE TABLE remote.themes (LIKE ednov_testing.themes INCLUDING ALL);
INSERT INTO remote.themes SELECT * FROM ednov_testing.themes;

CREATE TABLE remote.tutor_criminal_records (LIKE ednov_testing.tutor_criminal_records INCLUDING ALL);
INSERT INTO remote.tutor_criminal_records SELECT * FROM ednov_testing.tutor_criminal_records;

CREATE TABLE remote.tutor_gamification (LIKE ednov_testing.tutor_gamification INCLUDING ALL);
INSERT INTO remote.tutor_gamification SELECT * FROM ednov_testing.tutor_gamification;

CREATE TABLE remote.ui_configurations (LIKE ednov_testing.ui_configurations INCLUDING ALL);
INSERT INTO remote.ui_configurations SELECT * FROM ednov_testing.ui_configurations;

CREATE TABLE remote.user_establishments (LIKE ednov_testing.user_establishments INCLUDING ALL);
INSERT INTO remote.user_establishments SELECT * FROM ednov_testing.user_establishments;

CREATE TABLE remote.user_interface_preferences (LIKE ednov_testing.user_interface_preferences INCLUDING ALL);
INSERT INTO remote.user_interface_preferences SELECT * FROM ednov_testing.user_interface_preferences;

CREATE TABLE remote.user_profile_specialties (LIKE ednov_testing.user_profile_specialties INCLUDING ALL);
INSERT INTO remote.user_profile_specialties SELECT * FROM ednov_testing.user_profile_specialties;

CREATE TABLE remote.user_profiles (LIKE ednov_testing.user_profiles INCLUDING ALL);
INSERT INTO remote.user_profiles SELECT * FROM ednov_testing.user_profiles;

CREATE TABLE remote.user_roles (LIKE ednov_testing.user_roles INCLUDING ALL);
INSERT INTO remote.user_roles SELECT * FROM ednov_testing.user_roles;

CREATE TABLE remote.users (LIKE ednov_testing.users INCLUDING ALL);
INSERT INTO remote.users SELECT * FROM ednov_testing.users;

CREATE TABLE remote.vacation_zones (LIKE ednov_testing.vacation_zones INCLUDING ALL);
INSERT INTO remote.vacation_zones SELECT * FROM ednov_testing.vacation_zones;

CREATE TABLE remote.vsc_daily_reports (LIKE ednov_testing.vsc_daily_reports INCLUDING ALL);
INSERT INTO remote.vsc_daily_reports SELECT * FROM ednov_testing.vsc_daily_reports;

CREATE TABLE remote.vsc_reports (LIKE ednov_testing.vsc_reports INCLUDING ALL);
INSERT INTO remote.vsc_reports SELECT * FROM ednov_testing.vsc_reports;

CREATE TABLE remote.school_year_quarters (LIKE ednov_testing.school_year_quarters INCLUDING ALL);
INSERT INTO remote.school_year_quarters SELECT * FROM ednov_testing.school_year_quarters;

-- Done! Schema "remote" now contains a full clone of "ednov_testing"
