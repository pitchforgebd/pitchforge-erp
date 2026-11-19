# Incident response

## Severity

| Severity | Examples                                                              | Response                                   |
| -------- | --------------------------------------------------------------------- | ------------------------------------------ |
| SEV-1    | Data breach, unauthorised payment, ledger tampering, production down  | Immediate; Partners informed within 1 hour |
| SEV-2    | One role can see another's data; audit chain failure; backups failing | Within 4 hours                             |
| SEV-3    | Degraded feature, suspicious but unconfirmed activity                 | Next working day                           |

## Steps

1. **Detect and declare.** Whoever notices opens an incident in the private channel and names an incident lead.
2. **Contain.** Revoke sessions and tokens, disable affected accounts or features, block IPs at the WAF. Do not delete evidence.
3. **Preserve evidence.** Snapshot database and logs; export the relevant audit log range; record a timeline.
4. **Eradicate and recover.** Fix the cause, rotate secrets, restore from backup if data integrity is in doubt, verify the audit chain.
5. **Notify.** Partners decide on notifying affected employees, clients or authorities as Bangladesh law requires.
6. **Review.** Blameless post-incident review within 5 working days; actions tracked to closure; threat model updated.

## Contacts

| Role                      | Name                 | Phone          |
| ------------------------- | -------------------- | -------------- |
| Incident lead (tech lead) | _to be filled_       | _to be filled_ |
| Security owner            | _to be filled_       | _to be filled_ |
| Partner on call           | _to be filled_       | _to be filled_ |
| Cloud provider support    | AWS Business Support | via console    |

Keep this table current; it is checked at every access review.
