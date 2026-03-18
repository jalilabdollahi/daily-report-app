output "app_runtime_policy_arn" {
  description = "IAM policy ARN that grants the app access to S3 uploads and SSM parameters."
  value       = aws_iam_policy.app_runtime.arn
}

output "database_address" {
  description = "RDS endpoint hostname."
  value       = aws_db_instance.app.address
}

output "database_port" {
  description = "RDS port."
  value       = aws_db_instance.app.port
}

output "database_name" {
  description = "Application database name."
  value       = var.db_name
}

output "database_url_parameter_name" {
  description = "SSM parameter name for DATABASE_URL."
  value       = var.create_ssm_parameters ? aws_ssm_parameter.app_env["DATABASE_URL"].name : "${local.ssm_parameter_path}/DATABASE_URL"
}

output "s3_bucket_name" {
  description = "Uploads bucket name."
  value       = aws_s3_bucket.uploads.bucket
}

output "ssm_parameter_path" {
  description = "Base SSM parameter path for application configuration."
  value       = local.ssm_parameter_path
}

output "ssm_parameter_names" {
  description = "Map of app env var names to the SSM parameter created for each one."
  value = {
    for env_name, parameter in aws_ssm_parameter.app_env :
    env_name => parameter.name
  }
}
