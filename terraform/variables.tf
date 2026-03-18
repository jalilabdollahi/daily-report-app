variable "project_name" {
  description = "Project name used in tags, naming, and SSM paths."
  type        = string
  default     = "daily-report-app"
}

variable "environment" {
  description = "Environment name such as dev, staging, or production."
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for all infrastructure resources."
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Additional tags to apply to provisioned resources."
  type        = map(string)
  default     = {}
}

variable "availability_zone_count" {
  description = "Number of AZs to use for the VPC and DB subnet group."
  type        = number
  default     = 2
}

variable "vpc_cidr" {
  description = "CIDR range for the dedicated application VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "daily_reports"
}

variable "db_username" {
  description = "Master PostgreSQL username."
  type        = string
  default     = "dailyreport"
}

variable "db_password" {
  description = "Optional master PostgreSQL password. Leave null to generate one."
  type        = string
  default     = null
  sensitive   = true
}

variable "db_port" {
  description = "PostgreSQL listener port."
  type        = number
  default     = 5432
}

variable "db_engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16.4"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum autoscaled RDS storage in GiB."
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Whether to run the database in Multi-AZ mode."
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Number of backup days retained by RDS."
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Preferred backup window for the RDS instance."
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window for the RDS instance."
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach the public RDS instance. Amplify Hosting commonly requires 0.0.0.0/0 unless you move to a VPC-connected runtime."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "apply_immediately" {
  description = "Whether RDS changes should be applied immediately."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Whether to enable RDS deletion protection."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Whether to skip the final snapshot when destroying the RDS instance."
  type        = bool
  default     = false
}

variable "s3_bucket_name" {
  description = "Optional S3 uploads bucket name. Leave null to generate one."
  type        = string
  default     = null
}

variable "s3_force_destroy" {
  description = "Whether Terraform may delete non-empty upload buckets."
  type        = bool
  default     = false
}

variable "s3_upload_prefix" {
  description = "Prefix inside the S3 bucket used by the app for uploaded files."
  type        = string
  default     = "production"
}

variable "ssm_parameter_path" {
  description = "Optional base SSM path. Leave null to use /<project>/<environment>."
  type        = string
  default     = null
}

variable "create_ssm_parameters" {
  description = "Whether to create SSM parameters for application configuration."
  type        = bool
  default     = true
}

variable "app_url" {
  description = "Public HTTPS URL for the deployed application."
  type        = string
}

variable "auth_session_max_age" {
  description = "Session max age in seconds."
  type        = number
  default     = 604800
}

variable "password_reset_token_ttl_minutes" {
  description = "Password reset token lifetime in minutes."
  type        = number
  default     = 60
}

variable "nextauth_secret" {
  description = "Optional NEXTAUTH/AUTH secret. Leave null to generate one."
  type        = string
  default     = null
  sensitive   = true
}

variable "cron_secret" {
  description = "Optional secret for the reminder cron endpoint. Leave null to generate one."
  type        = string
  default     = null
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host for reminder and password reset emails."
  type        = string
  default     = null
}

variable "smtp_port" {
  description = "SMTP port."
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username."
  type        = string
  default     = null
}

variable "smtp_pass" {
  description = "SMTP password."
  type        = string
  default     = null
  sensitive   = true
}

variable "smtp_from" {
  description = "Default sender email for outbound notifications."
  type        = string
  default     = "noreply@dailyreports.app"
}

variable "production_admin_email" {
  description = "Email for the initial production admin account."
  type        = string
  default     = "admin@example.com"
}

variable "production_admin_password" {
  description = "Optional initial production admin password. Leave null to generate one."
  type        = string
  default     = null
  sensitive   = true
}
