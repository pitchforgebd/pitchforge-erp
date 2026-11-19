provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "pitchforge-erp"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name = "pitchforge-staging"
}

module "network" {
  source = "../../modules/network"

  name               = local.name
  cidr_block         = "10.20.0.0/16"
  availability_zones = var.availability_zones
}

module "kms" {
  source = "../../modules/kms"

  name = local.name
}

module "secret_store" {
  source = "../../modules/secret-store"

  name         = local.name
  kms_key_arn  = module.kms.key_arn
  secret_names = ["DATABASE_URL", "REDIS_URL", "SESSION_SECRET", "FIELD_ENCRYPTION_KEY"]
}

module "s3" {
  source = "../../modules/s3"

  bucket_name = var.files_bucket_name
  kms_key_arn = module.kms.key_arn
}

module "rds" {
  source = "../../modules/rds"

  name                 = local.name
  subnet_ids           = module.network.data_subnet_ids
  security_group_id    = module.network.database_security_group_id
  kms_key_arn          = module.kms.key_arn
  instance_class       = "db.t4g.medium"
  allocated_storage_gb = 50
  multi_az             = false
}

module "cache" {
  source = "../../modules/cache"

  name              = local.name
  subnet_ids        = module.network.data_subnet_ids
  security_group_id = module.network.cache_security_group_id
  kms_key_arn       = module.kms.key_arn
  node_type         = "cache.t4g.small"
  engine_version    = "8.2"
}

module "waf" {
  source = "../../modules/waf"

  name                     = local.name
  rate_limit_per_5_minutes = 2000
  kms_key_arn              = module.kms.key_arn
}

module "dns_tls" {
  source = "../../modules/dns-tls"

  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
}

module "ecs" {
  source = "../../modules/ecs"

  name                  = local.name
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  private_subnet_ids    = module.network.private_subnet_ids
  alb_security_group_id = module.network.alb_security_group_id
  app_security_group_id = module.network.app_security_group_id
  certificate_arn       = module.dns_tls.certificate_arn
  web_acl_arn           = module.waf.web_acl_arn
  domain_name           = var.domain_name
  hosted_zone_id        = var.hosted_zone_id
  kms_key_arn           = module.kms.key_arn
  files_bucket_arn      = module.s3.bucket_arn
  secret_arns           = module.secret_store.secret_arns
  image_tag             = var.image_tag

  # Staging serves the mock API until the backend waves arrive in Phase 2.
  web_environment = {
    NODE_ENV       = "production"
    API_MODE       = "mock"
    ALLOW_MOCK_API = "true"
  }
  web_task_count     = 2
  api_task_count     = 0
  worker_task_count  = 0
  trusted_proxy_hops = 1
}

output "url" {
  value = module.ecs.url
}

output "repository_urls" {
  value = module.ecs.repository_urls
}
