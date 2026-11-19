# Runbooks

Each runbook is rehearsed on staging before go-live and reviewed every six months.

## Restore the database to a point in time

1. Declare an incident; freeze deploys.
2. In RDS, restore to a new instance at the chosen time (before the problem).
3. Point staging at it; verify trial balance = 0 and audit chain valid.
4. With Partner approval, switch production's secret to the new endpoint; restart API and workers.
5. Replay outbox events after the restore point if needed; record the gap in the incident log.

## Replay dead-letter events

1. Open the admin dead-letter view; read the error.
2. Fix the cause and deploy.
3. Replay; consumers are idempotent, so duplicates are skipped.

## Reopen a locked period

1. Finance requests; a Partner approves in Administration with step-up auth.
2. Post the correction; lock the period again the same day.
3. The audit log and the alert record both actions.

## Revoke a compromised user

1. Deactivate the user (revokes all sessions and tokens).
2. Review the audit log for that user since the suspected time.
3. Rotate any secret the user could reach; reset 2FA on re-enable.

## Scale workers for payroll day

Increase the payroll queue's worker count; watch queue depth; scale back after the run is locked.

## Roll back a release

Redeploy the previous image tag. Migrations are expand-then-contract, so the previous version still works with the current schema.
