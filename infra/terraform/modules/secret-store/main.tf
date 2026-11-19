variable "name" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "secret_names" {
  type        = set(string)
  description = "Environment variable names. Terraform makes the empty secrets; a person sets the values, so no value is ever in Terraform state."
}

resource "aws_secretsmanager_secret" "main" {
  for_each = var.secret_names

  name                    = "${var.name}/${each.value}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30
}

output "secret_arns" {
  value = { for name, secret in aws_secretsmanager_secret.main : name => secret.arn }
}
