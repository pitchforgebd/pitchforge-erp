# ADR-0010: Valkey and Garage for local development

- **Status:** Accepted
- **Date:** 06 Nov 2026
- **Deciders:** Tech lead

## Context

The first design named Redis and MinIO. `minio/minio` no longer exists on Docker Hub, because MinIO's community edition went source-only in 2025. Redis 8 is AGPL, RSAL or SSPL rather than BSD. The local stack needs a Redis-compatible cache and an S3-compatible store with presigned URLs.

## Options considered

1. **Redis 8:** the reference, but with licence terms that need legal review.
2. **Valkey 9:** BSD-licensed, Redis-compatible, supported by BullMQ, and offered by ElastiCache.
3. **Garage:** mature, S3-compatible, supports presigned URLs, and small. It needs a one-time layout step.
4. **RustFS:** closer to MinIO's experience, but younger.

## Decision

Use Valkey 9.0 locally and in AWS, and Garage 2.5 locally. Production storage stays S3. Application code talks to the Redis and S3 protocols only, so these names appear only in `infra/`.

## Consequences

- No licence questions for the cache, and the same engine everywhere.
- A new developer runs the storage setup once ([infra/docker/README.md](../../../infra/docker/README.md)).
- Garage and S3 can differ in small ways, so file handling needs a staging test against real S3 in Phase 2.
- Docs that say "Redis" mean the protocol.
