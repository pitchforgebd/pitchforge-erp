# Environments and deployment

| Environment | Purpose                                                                         | Data                          | Deploys               |
| ----------- | ------------------------------------------------------------------------------- | ----------------------------- | --------------------- |
| Local       | Development (Docker Compose: PostgreSQL, Valkey, Garage, Mailpit; see ADR-0010) | Seed data                     | Developer             |
| Preview     | One per pull request, auto-deleted                                              | Seed data                     | CI on PR              |
| Staging     | Demos, UAT, migration rehearsals, pen test                                      | Anonymised copy of production | CI on merge to `main` |
| Production  | Live                                                                            | Real                          | Tag + manual approval |

## Pipeline

1. **Pull request:** lint, types, tests, boundaries, contract diff, secret scan, dependency audit, static analysis, build images, preview environment.
2. **Merge to `main`:** images tagged with the commit, migration dry-run, deploy to staging, end-to-end tests.
3. **Release:** manual approval, migrations, rolling deploy with health checks, automatic rollback on failure.
4. **After deploy:** smoke tests, 30-minute error-rate watch, release notes from commits.

## Production layout (AWS)

Route 53 + CloudFront → ALB + WAF (public subnet) → ECS Fargate (web ×2, API ×2, workers ×2, PDF + virus scan) in private subnets → RDS PostgreSQL Multi-AZ + read replica, ElastiCache Redis in data subnets; S3, SES, Secrets Manager + KMS, CloudWatch + Sentry. Region: Singapore or Mumbai, or a Bangladesh data centre if residency requires (open decision). Everything defined in `infra/terraform`.
