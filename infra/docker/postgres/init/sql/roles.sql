-- Local development and CI only. Staging and production create these roles from Secrets Manager.
-- Run with psql -v migrate_password=… -v app_password=… -v report_password=… -v database=…
\set ON_ERROR_STOP on

CREATE ROLE app_migrate LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'migrate_password';
CREATE ROLE app_rw LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'app_password';
CREATE ROLE report_ro LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'report_password';

-- Tables belong to the role that runs migrations, never to the role the API connects as.
CREATE DATABASE :"database" OWNER app_migrate;

REVOKE ALL ON DATABASE :"database" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"database" TO app_rw, report_ro;
