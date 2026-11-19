# Terraform

> Staging runs on cPanel for now ([ADR-0013](../../docs/02-architecture/adr/0013-staging-on-cpanel.md)). This code is for the move to AWS in Phase 2.

Staging on AWS, as code. **Nothing here has been applied.** Applying it creates billed resources, and it needs an AWS account, a region and a domain (Q6 in the Phase 0 plan).

`terraform apply` and `destroy` are human steps, after review. Claude Code sessions are denied them in `.claude/settings.json`.

## Layout

| Path                   | What                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/network`      | VPC, public, private and data subnets, one NAT gateway, security groups                                                                  |
| `modules/kms`          | One customer key with rotation                                                                                                           |
| `modules/secret-store` | Empty secrets; a person sets the values, so none reach Terraform state. Not called `secrets`: `.gitignore` drops any folder of that name |
| `modules/s3`           | Files bucket: private, versioned, KMS-encrypted, TLS only                                                                                |
| `modules/rds`          | PostgreSQL 16: encrypted, TLS required, 35-day backups, deletion protection                                                              |
| `modules/cache`        | Valkey: two nodes, encrypted at rest and in transit                                                                                      |
| `modules/waf`          | AWS managed rules and a rate limit, with cookies kept out of the logs                                                                    |
| `modules/dns-tls`      | ACM certificate with DNS validation                                                                                                      |
| `modules/ecs`          | ECR, cluster, load balancer, and the web, API and worker services on read-only root filesystems                                          |
| `envs/staging`         | Wires the modules together                                                                                                               |

The load balancer reaches only the web app. The API stays inside the VPC, and browsers reach it through the BFF.

## First apply

1. Create the state bucket by hand, with versioning and encryption.
2. Create `envs/staging/staging.tfvars`, which git ignores, with the values listed in `envs/staging/variables.tf`.
3. Review the plan, then apply:

   ```bash
   cd infra/terraform/envs/staging
   terraform init -backend-config="bucket=<state bucket>" -backend-config="region=<region>"
   terraform plan -var-file=staging.tfvars -out=staging.plan
   terraform apply staging.plan
   ```

4. Set each secret's value in Secrets Manager.
5. Push the images to ECR with the tag in `image_tag`, and let the services start.
6. Scan the staging address for the header grade and save the report in `docs/04-security/evidence/`.

## Not covered yet

- CloudFront, SES, the read replica and the second-region backup copy in the production layout. They arrive with the production environment.
- The PDF and virus-scan service, which arrives in Phase 2.
- The database roles (`app_rw`, `app_migrate`, `report_ro`). They need a one-off bootstrap against RDS with the master secret.
- Valkey has no auth token yet: only the app security group can reach it, and TLS is required.
