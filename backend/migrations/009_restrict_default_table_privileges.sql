
-- 009_restrict_default_table_privileges.sql
-- Restrict default privileges for future tables created by postgres.
-- Preserve service_role access.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

-- Keep service_role's existing default privileges unchanged.
