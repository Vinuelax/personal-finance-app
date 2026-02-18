variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name prefix"
  type        = string
  default     = "pennypilot"
}

variable "domain_name" {
  description = "Public root domain"
  type        = string
  default     = "vinuelax.cl"
}

variable "web_subdomain" {
  description = "Web app subdomain"
  type        = string
  default     = "app"
}

variable "api_subdomain" {
  description = "API subdomain"
  type        = string
  default     = "api"
}

variable "web_bucket_name" {
  description = "S3 bucket for frontend static site"
  type        = string
  default     = "pennypilot-web-dev-use1"
}

variable "receipts_bucket_name" {
  description = "S3 bucket for receipt images"
  type        = string
  default     = "pennypilot-receipts-dev-use1"
}

variable "cloudfront_acm_certificate_arn" {
  description = "Existing ACM certificate ARN in us-east-1 for app domain. Leave empty to let Terraform create/validate one in Route53."
  type        = string
  default     = ""
}

variable "api_gateway_acm_certificate_arn" {
  description = "Existing ACM certificate ARN in us-east-1 for api domain. Leave empty to let Terraform create/validate one in Route53."
  type        = string
  default     = ""
}

variable "create_public_hosted_zone" {
  description = "Whether Terraform should create Route53 public hosted zone"
  type        = bool
  default     = false
}

variable "existing_route53_zone_id" {
  description = "Existing Route53 zone id (required when create_public_hosted_zone=false)"
  type        = string
  default     = ""
}

variable "api_dns_target" {
  description = "DNS target for API subdomain (for example custom API Gateway domain target)"
  type        = string
  default     = ""
}

variable "backend_lambda_name" {
  description = "Backend Lambda function name"
  type        = string
  default     = "pennypilot-api-dev-use1"
}

variable "create_api_gateway" {
  description = "Whether Terraform should create API Gateway integration for backend Lambda"
  type        = bool
  default     = true
}

variable "frontend_api_base_url_ssm_parameter_name" {
  description = "SSM parameter name to publish frontend API base URL"
  type        = string
  default     = ""
}

variable "ocr_lambda_name" {
  description = "OCR worker Lambda function name"
  type        = string
  default     = "pennypilot-receipt-processor-dev-use1"
}

variable "create_ocr_lambda" {
  description = "Whether Terraform should create OCR Lambda resources"
  type        = bool
  default     = false
}

variable "backend_lambda_runtime" {
  description = "Backend Lambda runtime"
  type        = string
  default     = "python3.12"
}

variable "ocr_lambda_runtime" {
  description = "OCR Lambda runtime"
  type        = string
  default     = "python3.12"
}

variable "backend_lambda_timeout_seconds" {
  description = "Backend Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "ocr_lambda_timeout_seconds" {
  description = "OCR Lambda timeout in seconds"
  type        = number
  default     = 120
}

variable "backend_lambda_memory_mb" {
  description = "Backend Lambda memory in MB"
  type        = number
  default     = 512
}

variable "ocr_lambda_memory_mb" {
  description = "OCR Lambda memory in MB"
  type        = number
  default     = 512
}

variable "internal_service_token" {
  description = "Shared internal token for OCR callback endpoint auth"
  type        = string
  default     = "dev-internal-token"
  sensitive   = true
}

variable "backend_cors_origins" {
  description = "Comma-separated origins for backend CORS"
  type        = string
  default     = "*"
}

variable "ocr_provider" {
  description = "OCR provider for OCR Lambda (mock or textract)"
  type        = string
  default     = "mock"
}

variable "create_rds_postgres" {
  description = "Whether Terraform should create a PostgreSQL RDS instance for backend"
  type        = bool
  default     = true
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "pfa"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "pfa_admin"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GiB)"
  type        = number
  default     = 20
}
