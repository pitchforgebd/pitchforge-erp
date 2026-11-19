# State holds resource details, so it lives in an encrypted bucket with locking. The bucket name
# depends on the AWS account (Q6): pass it to `terraform init` with -backend-config.
terraform {
  backend "s3" {
    key          = "staging/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
