# Monitoring and alerts

| SLO               | Target                                    | Alert when                            |
| ----------------- | ----------------------------------------- | ------------------------------------- |
| Availability      | 99.5% monthly                             | Health check fails 3 minutes in a row |
| API latency       | p95 < 500 ms                              | p95 > 800 ms for 10 minutes           |
| Posting freshness | Approved documents posted within 1 minute | Outbox lag > 5 minutes                |
| Reminders         | Sent within the hour                      | Reminder job missed a run             |
| Data integrity    | Audit chain valid; 0 unbalanced attempts  | Any failure (page immediately)        |

## Security alerts

Repeated failed logins · new-device login for Partner/Finance/HR · role or permission change · period reopened · drawing or payment above threshold · large export of restricted data · audit chain failure · WAF block spikes.

## Tooling

Sentry (errors), OpenTelemetry traces, structured JSON logs with request id and PII masking, Grafana or CloudWatch dashboards, external uptime checks every minute.
