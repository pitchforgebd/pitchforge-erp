# infra

- `terraform/`: AWS network, ECS, RDS, ElastiCache, S3, WAF, KMS, Secrets Manager, CloudWatch; one workspace per environment
- `docker/`: Dockerfiles (non-root, read-only filesystem) and Docker Compose for local development

See [environments and deployment](../docs/05-engineering/environments-and-deployment.md). Changes need tech lead and security review.
