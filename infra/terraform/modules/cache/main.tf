variable "name" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "node_type" {
  type = string
}

variable "engine_version" {
  type = string
}

resource "aws_elasticache_subnet_group" "main" {
  name       = var.name
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = var.name
  description          = "${var.name} sessions and queues"

  engine         = "valkey"
  engine_version = var.engine_version
  node_type      = var.node_type

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.security_group_id]

  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true
  transit_encryption_mode    = "required"

  snapshot_retention_limit = 7
}

output "endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}
