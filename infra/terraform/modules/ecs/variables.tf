variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "app_security_group_id" {
  type = string
}

variable "certificate_arn" {
  type = string
}

variable "web_acl_arn" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "hosted_zone_id" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "files_bucket_arn" {
  type = string
}

variable "secret_arns" {
  type        = map(string)
  description = "Environment variable name to Secrets Manager ARN."
}

variable "image_tag" {
  type        = string
  description = "The commit to run. Tags are immutable, so this is the exact image."
}

variable "web_environment" {
  type        = map(string)
  description = "Plain settings for the web app, such as API_MODE."
}

variable "api_task_count" {
  type        = number
  description = "0 while staging runs on the mock API."
}

variable "worker_task_count" {
  type = number
}

variable "web_task_count" {
  type = number
}

variable "trusted_proxy_hops" {
  type = number
}

variable "alert_log_retention_days" {
  type    = number
  default = 90
}
