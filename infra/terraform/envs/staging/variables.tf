variable "region" {
  type        = string
  description = "AWS region (Q6: Singapore or Mumbai)."
}

variable "availability_zones" {
  type        = list(string)
  description = "Two zones of the region."
}

variable "domain_name" {
  type        = string
  description = "Staging host name."
}

variable "hosted_zone_id" {
  type        = string
  description = "Route 53 zone that holds the domain."
}

variable "files_bucket_name" {
  type        = string
  description = "Globally unique name of the files bucket."
}

variable "image_tag" {
  type        = string
  description = "The commit to deploy."
}
