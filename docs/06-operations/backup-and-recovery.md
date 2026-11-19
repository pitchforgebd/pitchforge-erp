# Backup and recovery

| Item           | Approach                                                                                                                             | Target                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| Database       | Continuous backup with point-in-time recovery (35 days); daily snapshots copied to a second region; monthly snapshots kept 12 months | RPO 15 min, RTO 4 h       |
| Files          | S3 versioning and cross-region replication; object lock on backup bucket                                                             | No loss of uploads        |
| Redis          | Rebuildable; queues recover from the outbox                                                                                          | No business data at risk  |
| Infrastructure | Terraform state versioned; environment re-creatable from code                                                                        | New region in under 1 day |
| Drills         | Quarterly restore into a fresh environment, timed against RTO                                                                        | Report to Partners        |

Restore steps are in [runbooks](runbooks.md#restore-the-database-to-a-point-in-time).
