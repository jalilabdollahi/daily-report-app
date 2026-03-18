data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "_%@"
}

resource "random_password" "nextauth_secret" {
  length  = 48
  special = false
}

resource "random_password" "cron_secret" {
  length  = 32
  special = false
}

resource "random_password" "production_admin_password" {
  length           = 24
  special          = true
  override_special = "_%@"
}

resource "random_string" "bucket_suffix" {
  length  = 6
  upper   = false
  special = false
}

locals {
  project_slug       = lower(regexreplace(var.project_name, "[^a-z0-9-]", "-"))
  environment_slug   = lower(regexreplace(var.environment, "[^a-z0-9-]", "-"))
  name_prefix        = "${local.project_slug}-${local.environment_slug}"
  availability_zones = slice(data.aws_availability_zones.available.names, 0, var.availability_zone_count)
  ssm_parameter_path = coalesce(var.ssm_parameter_path, "/${var.project_name}/${var.environment}")
  s3_bucket_name     = coalesce(var.s3_bucket_name, "${local.project_slug}-${local.environment_slug}-${data.aws_caller_identity.current.account_id}-${random_string.bucket_suffix.result}")

  db_password               = coalesce(var.db_password, random_password.db_password.result)
  nextauth_secret           = coalesce(var.nextauth_secret, random_password.nextauth_secret.result)
  cron_secret               = coalesce(var.cron_secret, random_password.cron_secret.result)
  production_admin_password = coalesce(var.production_admin_password, random_password.production_admin_password.result)

  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.tags,
  )
}

resource "aws_vpc" "app" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "app" {
  vpc_id = aws_vpc.app.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  for_each = {
    for index, az in local.availability_zones :
    az => index
  }

  vpc_id                  = aws_vpc.app.id
  availability_zone       = each.key
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, each.value)
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-${regexreplace(lower(each.key), "[^a-z0-9-]", "-")}"
    Tier = "public"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.app.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.app.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db"
  description = "Public PostgreSQL access for ${local.name_prefix}"
  vpc_id      = aws_vpc.app.id

  dynamic "ingress" {
    for_each = var.db_allowed_cidr_blocks

    content {
      description = "PostgreSQL"
      from_port   = var.db_port
      to_port     = var.db_port
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-sg"
  })
}

resource "aws_db_subnet_group" "app" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = [for subnet in aws_subnet.public : subnet.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnets"
  })
}

resource "aws_db_instance" "app" {
  identifier                      = "${local.name_prefix}-postgres"
  engine                          = "postgres"
  engine_version                  = var.db_engine_version
  instance_class                  = var.db_instance_class
  allocated_storage               = var.db_allocated_storage
  max_allocated_storage           = var.db_max_allocated_storage
  storage_type                    = "gp3"
  db_name                         = var.db_name
  username                        = var.db_username
  password                        = local.db_password
  port                            = var.db_port
  publicly_accessible             = true
  multi_az                        = var.db_multi_az
  backup_retention_period         = var.db_backup_retention_period
  backup_window                   = var.db_backup_window
  maintenance_window              = var.db_maintenance_window
  apply_immediately               = var.apply_immediately
  deletion_protection             = var.deletion_protection
  skip_final_snapshot             = var.skip_final_snapshot
  final_snapshot_identifier       = var.skip_final_snapshot ? null : "${local.name_prefix}-final"
  copy_tags_to_snapshot           = true
  auto_minor_version_upgrade      = true
  storage_encrypted               = true
  db_subnet_group_name            = aws_db_subnet_group.app.name
  vpc_security_group_ids          = [aws_security_group.db.id]
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })
}

resource "aws_s3_bucket" "uploads" {
  bucket        = local.s3_bucket_name
  force_destroy = var.s3_force_destroy

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-uploads"
  })
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

locals {
  database_url = format(
    "postgresql://%s:%s@%s:%d/%s",
    urlencode(var.db_username),
    urlencode(local.db_password),
    aws_db_instance.app.address,
    aws_db_instance.app.port,
    var.db_name,
  )

  app_env_values = {
    DATABASE_URL                     = local.database_url
    AUTH_SECRET                      = local.nextauth_secret
    NEXTAUTH_SECRET                  = local.nextauth_secret
    AUTH_URL                         = var.app_url
    NEXTAUTH_URL                     = var.app_url
    AUTH_SESSION_MAX_AGE             = tostring(var.auth_session_max_age)
    PASSWORD_RESET_TOKEN_TTL_MINUTES = tostring(var.password_reset_token_ttl_minutes)
    UPLOAD_PROVIDER                  = "s3"
    UPLOAD_DIR                       = "./public/uploads"
    AWS_REGION                       = var.aws_region
    S3_UPLOAD_BUCKET                 = aws_s3_bucket.uploads.bucket
    S3_UPLOAD_PREFIX                 = var.s3_upload_prefix
    SMTP_HOST                        = var.smtp_host
    SMTP_PORT                        = tostring(var.smtp_port)
    SMTP_USER                        = var.smtp_user
    SMTP_PASS                        = var.smtp_pass
    SMTP_FROM                        = var.smtp_from
    CRON_SECRET                      = local.cron_secret
    PRODUCTION_ADMIN_EMAIL           = var.production_admin_email
    PRODUCTION_ADMIN_PASSWORD        = local.production_admin_password
    APP_SSM_PARAMETER_PATH           = local.ssm_parameter_path
  }

  sensitive_parameter_names = toset([
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "SMTP_PASS",
    "CRON_SECRET",
    "PRODUCTION_ADMIN_PASSWORD",
  ])

  ssm_parameters = {
    for env_name, value in local.app_env_values :
    env_name => {
      name  = "${local.ssm_parameter_path}/${env_name}"
      value = value
      type  = contains(local.sensitive_parameter_names, env_name) ? "SecureString" : "String"
    }
    if value != null
  }
}

resource "aws_ssm_parameter" "app_env" {
  for_each = var.create_ssm_parameters ? local.ssm_parameters : {}

  name  = each.value.name
  type  = each.value.type
  value = each.value.value
  tier  = "Standard"

  tags = local.common_tags
}

data "aws_iam_policy_document" "app_runtime" {
  statement {
    sid    = "ReadAppParameters"
    effect = "Allow"

    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]

    resources = [
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_parameter_path}",
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_parameter_path}/*",
    ]
  }

  statement {
    sid    = "DecryptSsmParameters"
    effect = "Allow"

    actions = ["kms:Decrypt"]

    resources = [data.aws_kms_alias.ssm.target_key_arn]
  }

  statement {
    sid    = "ListUploadsBucket"
    effect = "Allow"

    actions = ["s3:ListBucket"]

    resources = [aws_s3_bucket.uploads.arn]
  }

  statement {
    sid    = "ManageUploadsObjects"
    effect = "Allow"

    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = ["${aws_s3_bucket.uploads.arn}/*"]
  }
}

resource "aws_iam_policy" "app_runtime" {
  name        = "${local.name_prefix}-runtime"
  description = "SSM and S3 access for ${local.name_prefix}"
  policy      = data.aws_iam_policy_document.app_runtime.json

  tags = local.common_tags
}
