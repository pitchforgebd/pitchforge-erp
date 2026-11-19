data "aws_region" "current" {}

locals {
  services = toset(["web", "api", "worker"])

  region = data.aws_region.current.region

  api_secrets = [
    for name in ["DATABASE_URL", "REDIS_URL", "SESSION_SECRET", "FIELD_ENCRYPTION_KEY"] :
    { name = name, valueFrom = var.secret_arns[name] }
  ]
  worker_secrets = [{ name = "REDIS_URL", valueFrom = var.secret_arns["REDIS_URL"] }]
}

resource "aws_ecr_repository" "service" {
  for_each = local.services

  name                 = "${var.name}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }
}

resource "aws_cloudwatch_log_group" "service" {
  for_each = local.services

  name              = "/${var.name}/${each.value}"
  retention_in_days = var.alert_log_retention_days
  kms_key_id        = var.kms_key_arn
}

resource "aws_ecs_cluster" "main" {
  name = var.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_service_discovery_http_namespace" "main" {
  name = var.name
}

data "aws_iam_policy_document" "assume_task" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Starts a task: pulls the image, writes logs, reads the secrets it names.
resource "aws_iam_role" "execution" {
  name               = "${var.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = values(var.secret_arns)
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# What the running API may do: files only. The web and worker tasks get no AWS rights.
resource "aws_iam_role" "api_task" {
  name               = "${var.name}-api-task"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
}

data "aws_iam_policy_document" "api_task" {
  statement {
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${var.files_bucket_arn}/*"]
  }

  statement {
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "api_task" {
  name   = "files"
  role   = aws_iam_role.api_task.id
  policy = data.aws_iam_policy_document.api_task.json
}

resource "aws_iam_role" "no_rights_task" {
  name               = "${var.name}-no-rights-task"
  assume_role_policy = data.aws_iam_policy_document.assume_task.json
}

resource "aws_lb" "main" {
  name                       = var.name
  load_balancer_type         = "application"
  subnets                    = var.public_subnet_ids
  security_groups            = [var.alb_security_group_id]
  drop_invalid_header_fields = true
  enable_deletion_protection = true
}

resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = var.web_acl_arn
}

resource "aws_lb_target_group" "web" {
  name        = "${var.name}-web"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/login"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  # TLS 1.3 and 1.2 only.
  ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_route53_record" "app" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

locals {
  # Root filesystems are read-only, so anything that must write gets a small scratch volume.
  scratch_volume = [{ sourceVolume = "scratch", containerPath = "/tmp", readOnly = false }]

  log_configuration = {
    for service in local.services : service => {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service[service].name
        awslogs-region        = local.region
        awslogs-stream-prefix = service
      }
    }
  }

  container_defaults = {
    essential              = true
    user                   = "10001:10001"
    readonlyRootFilesystem = true
    mountPoints            = local.scratch_volume
    linuxParameters = {
      capabilities = { drop = ["ALL"] }
    }
  }
}

resource "aws_ecs_task_definition" "web" {
  family                   = "${var.name}-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.no_rights_task.arn

  volume {
    name = "scratch"
  }

  volume {
    name = "next-cache"
  }

  container_definitions = jsonencode([merge(local.container_defaults, {
    name  = "web"
    image = "${aws_ecr_repository.service["web"].repository_url}:${var.image_tag}"
    portMappings = [{
      name          = "web"
      containerPort = 3000
      protocol      = "tcp"
    }]
    mountPoints = concat(local.scratch_volume, [{
      sourceVolume  = "next-cache"
      containerPath = "/app/apps/web/.next/cache"
      readOnly      = false
    }])
    environment = [
      for name, value in merge(var.web_environment, { API_URL = "http://api:4000" }) :
      { name = name, value = value }
    ]
    logConfiguration = local.log_configuration["web"]
  })])
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.api_task.arn

  volume {
    name = "scratch"
  }

  container_definitions = jsonencode([merge(local.container_defaults, {
    name  = "api"
    image = "${aws_ecr_repository.service["api"].repository_url}:${var.image_tag}"
    portMappings = [{
      name          = "api"
      containerPort = 4000
      protocol      = "tcp"
    }]
    environment = [
      { name = "TRUSTED_PROXY_HOPS", value = tostring(var.trusted_proxy_hops) },
    ]
    secrets          = local.api_secrets
    logConfiguration = local.log_configuration["api"]
  })])
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.name}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.no_rights_task.arn

  volume {
    name = "scratch"
  }

  container_definitions = jsonencode([merge(local.container_defaults, {
    name             = "worker"
    image            = "${aws_ecr_repository.service["worker"].repository_url}:${var.image_tag}"
    secrets          = local.worker_secrets
    logConfiguration = local.log_configuration["worker"]
  })])
}

resource "aws_ecs_service" "web" {
  name                   = "web"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.web.arn
  desired_count          = var.web_task_count
  launch_type            = "FARGATE"
  force_delete           = false
  enable_execute_command = false

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.app_security_group_id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]
}

# Reachable only inside the VPC: browsers go through the web app's BFF (ADR-0008).
resource "aws_ecs_service" "api" {
  name                   = "api"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.api.arn
  desired_count          = var.api_task_count
  launch_type            = "FARGATE"
  enable_execute_command = false

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.app_security_group_id]
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    service {
      port_name = "api"

      client_alias {
        dns_name = "api"
        port     = 4000
      }
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_ecs_service" "worker" {
  name                   = "worker"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.worker.arn
  desired_count          = var.worker_task_count
  launch_type            = "FARGATE"
  enable_execute_command = false

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.app_security_group_id]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

output "repository_urls" {
  value = { for service, repository in aws_ecr_repository.service : service => repository.repository_url }
}

output "url" {
  value = "https://${var.domain_name}"
}
