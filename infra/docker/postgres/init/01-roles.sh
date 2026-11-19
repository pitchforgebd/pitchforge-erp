#!/bin/sh
# Runs once, when the local data volume is first created.
set -eu

psql --username "$POSTGRES_USER" --dbname postgres \
  --set=migrate_password="$APP_MIGRATE_PASSWORD" \
  --set=app_password="$APP_RW_PASSWORD" \
  --set=report_password="$REPORT_RO_PASSWORD" \
  --set=database="$APP_DATABASE" \
  --file=/docker-entrypoint-initdb.d/sql/roles.sql
