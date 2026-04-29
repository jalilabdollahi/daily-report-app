# Terraform

This folder provisions the AWS infrastructure needed to run `daily-report-app`
with Amplify Hosting:

- PostgreSQL on Amazon RDS
- A private S3 bucket for file uploads
- SSM Parameter Store entries for app configuration
- An IAM policy that allows the app runtime to read SSM parameters and manage
  S3 objects

## Important Caveat

AWS Amplify Hosting SSR is not attached to your VPC. That means the PostgreSQL
database created here must be publicly reachable unless you move the app to a
VPC-connected compute platform. The default `db_allowed_cidr_blocks` value is
therefore broad so the app can connect, but it is not ideal from a security
perspective.

If you want private database networking, use a runtime such as ECS, App Runner
with VPC connector, Lambda in a VPC, or another platform that can reach private
subnets.

## Usage

1. Copy the example variables:

```bash
cp terraform.tfvars.example terraform.tfvars
```

2. Update `terraform.tfvars` with your real domain, SMTP settings, and any
   sizing changes.

3. Initialize and apply:

```bash
terraform init
terraform plan
terraform apply
```

4. Note the outputs:

- `ssm_parameter_path`
- `database_url_parameter_name`
- `s3_bucket_name`
- `app_runtime_policy_arn`

## SSM Layout

Terraform writes app settings to SSM under:

```text
/<project_name>/<environment>/ENV_VAR_NAME
```

Example:

```text
/daily-report-app/production/DATABASE_URL
/daily-report-app/production/NEXTAUTH_SECRET
/daily-report-app/production/S3_UPLOAD_BUCKET
```

You can export those values into dotenv format with:

```bash
AWS_REGION=us-east-1 npm run env:ssm:export -- /daily-report-app/production
```

## Amplify Notes

- `UPLOAD_PROVIDER` is set to `s3` by this stack.
- The app stores upload objects in the bucket created here and serves them
  through authenticated `/api/files/...` routes.
- The generated IAM policy should be attached to the runtime identity that will
  access S3 and SSM.
- [amplify.yml](../amplify.yml)
  can optionally read values from SSM into `.env.production.local` during the
  build when `APP_SSM_PARAMETER_PATH` and AWS credentials are available.
