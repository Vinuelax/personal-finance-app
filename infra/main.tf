locals {
  web_domain                               = "${var.web_subdomain}.${var.domain_name}"
  api_domain                               = "${var.api_subdomain}.${var.domain_name}"
  zone_id                                  = var.create_public_hosted_zone ? aws_route53_zone.primary[0].zone_id : var.existing_route53_zone_id
  cloudfront_certificate_arn               = var.cloudfront_acm_certificate_arn != "" ? var.cloudfront_acm_certificate_arn : aws_acm_certificate_validation.web[0].certificate_arn
  api_gateway_certificate_arn              = var.create_api_gateway ? (var.api_gateway_acm_certificate_arn != "" ? var.api_gateway_acm_certificate_arn : aws_acm_certificate_validation.api_gateway[0].certificate_arn) : ""
  backend_api_base_url                     = "https://${local.api_domain}/api/v1"
  frontend_api_base_url                    = local.backend_api_base_url
  frontend_api_base_url_ssm_parameter_name = var.frontend_api_base_url_ssm_parameter_name != "" ? var.frontend_api_base_url_ssm_parameter_name : "/${var.app_name}/${var.environment}/frontend/api_base_url"
  backend_lambda_zip_path                  = "${path.root}/../dist/backend_lambda.zip"
  ocr_lambda_zip_path                      = "${path.root}/../dist/ocr_lambda.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_s3_bucket" "web" {
  bucket = var.web_bucket_name

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "web" {
  bucket = aws_s3_bucket.web.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "receipts" {
  bucket = var.receipts_bucket_name

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "receipts" {
  bucket = aws_s3_bucket.receipts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "receipts" {
  bucket = aws_s3_bucket.receipts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${var.app_name}-${var.environment}-web-oac"
  description                       = "OAC for ${var.web_bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_iam_role" "backend_lambda_exec" {
  name               = "${var.app_name}-${var.environment}-backend-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "backend_lambda_basic_exec" {
  role       = aws_iam_role.backend_lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "backend_lambda_vpc_exec" {
  role       = aws_iam_role.backend_lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_security_group" "backend_lambda" {
  name        = "${var.app_name}-${var.environment}-backend-lambda-sg"
  description = "Security group for backend Lambda"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_security_group" "db" {
  name        = "${var.app_name}-${var.environment}-db-sg"
  description = "Security group for backend PostgreSQL RDS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend_lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_db_subnet_group" "backend" {
  name       = "${var.app_name}-${var.environment}-db-subnets"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_db_instance" "backend" {
  count = var.create_rds_postgres ? 1 : 0

  identifier              = "${var.app_name}-${var.environment}-postgres"
  engine                  = "postgres"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.backend.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  publicly_accessible     = false
  storage_encrypted       = true
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 0

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_lambda_function" "backend" {
  function_name = var.backend_lambda_name
  role          = aws_iam_role.backend_lambda_exec.arn
  runtime       = var.backend_lambda_runtime
  handler       = "app.main.handler"
  filename      = local.backend_lambda_zip_path

  source_code_hash = filebase64sha256(local.backend_lambda_zip_path)
  timeout          = var.backend_lambda_timeout_seconds
  memory_size      = var.backend_lambda_memory_mb

  environment {
    variables = {
      DB_BACKEND             = var.create_rds_postgres ? "postgres" : "jsonl"
      DB_JSON_PATH           = "/tmp/dummy_db.jsonl"
      DATABASE_URL           = var.create_rds_postgres ? "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.backend[0].address}:5432/${var.db_name}" : ""
      BACKEND_CORS_ORIGINS   = var.backend_cors_origins
      INTERNAL_SERVICE_TOKEN = var.internal_service_token
    }
  }

  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.backend_lambda.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.backend_lambda_basic_exec,
    aws_iam_role_policy_attachment.backend_lambda_vpc_exec
  ]

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_iam_role" "ocr_lambda_exec" {
  count              = var.create_ocr_lambda ? 1 : 0
  name               = "${var.app_name}-${var.environment}-ocr-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ocr_lambda_basic_exec" {
  count      = var.create_ocr_lambda ? 1 : 0
  role       = aws_iam_role.ocr_lambda_exec[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ocr_textract" {
  count = var.create_ocr_lambda ? 1 : 0
  name  = "${var.app_name}-${var.environment}-ocr-textract"
  role  = aws_iam_role.ocr_lambda_exec[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "textract:AnalyzeExpense",
          "textract:DetectDocumentText"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "ocr" {
  count         = var.create_ocr_lambda ? 1 : 0
  function_name = var.ocr_lambda_name
  role          = aws_iam_role.ocr_lambda_exec[0].arn
  runtime       = var.ocr_lambda_runtime
  handler       = "handler.handler"
  filename      = local.ocr_lambda_zip_path

  source_code_hash = filebase64sha256(local.ocr_lambda_zip_path)
  timeout          = var.ocr_lambda_timeout_seconds
  memory_size      = var.ocr_lambda_memory_mb

  environment {
    variables = {
      OCR_PROVIDER           = var.ocr_provider
      OCR_CALLBACK_BASE_URL  = local.backend_api_base_url
      INTERNAL_SERVICE_TOKEN = var.internal_service_token
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.ocr_lambda_basic_exec,
    aws_iam_role_policy.ocr_textract
  ]

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_apigatewayv2_api" "backend" {
  count         = var.create_api_gateway ? 1 : 0
  name          = "${var.app_name}-${var.environment}-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "backend_lambda" {
  count                  = var.create_api_gateway ? 1 : 0
  api_id                 = aws_apigatewayv2_api.backend[0].id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "backend_root" {
  count     = var.create_api_gateway ? 1 : 0
  api_id    = aws_apigatewayv2_api.backend[0].id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.backend_lambda[0].id}"
}

resource "aws_apigatewayv2_route" "backend_proxy" {
  count     = var.create_api_gateway ? 1 : 0
  api_id    = aws_apigatewayv2_api.backend[0].id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend_lambda[0].id}"
}

resource "aws_apigatewayv2_stage" "backend" {
  count       = var.create_api_gateway ? 1 : 0
  api_id      = aws_apigatewayv2_api.backend[0].id
  name        = "$default"
  auto_deploy = true
}

resource "aws_acm_certificate" "api_gateway" {
  count             = var.create_api_gateway && var.api_gateway_acm_certificate_arn == "" ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = local.api_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_route53_record" "api_gateway_cert_validation" {
  count = var.create_api_gateway && var.api_gateway_acm_certificate_arn == "" ? 1 : 0

  allow_overwrite = true
  zone_id         = local.zone_id
  name            = tolist(aws_acm_certificate.api_gateway[0].domain_validation_options)[0].resource_record_name
  type            = tolist(aws_acm_certificate.api_gateway[0].domain_validation_options)[0].resource_record_type
  ttl             = 60
  records         = [tolist(aws_acm_certificate.api_gateway[0].domain_validation_options)[0].resource_record_value]
}

resource "aws_acm_certificate_validation" "api_gateway" {
  count    = var.create_api_gateway && var.api_gateway_acm_certificate_arn == "" ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.api_gateway[0].arn
  validation_record_fqdns = [aws_route53_record.api_gateway_cert_validation[0].fqdn]
}

resource "aws_apigatewayv2_domain_name" "api" {
  count       = var.create_api_gateway ? 1 : 0
  domain_name = local.api_domain

  domain_name_configuration {
    certificate_arn = local.api_gateway_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "api" {
  count       = var.create_api_gateway ? 1 : 0
  api_id      = aws_apigatewayv2_api.backend[0].id
  domain_name = aws_apigatewayv2_domain_name.api[0].domain_name
  stage       = aws_apigatewayv2_stage.backend[0].name
}

resource "aws_lambda_permission" "allow_apigw_backend" {
  count         = var.create_api_gateway ? 1 : 0
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.backend[0].execution_arn}/*/*"
}

resource "aws_ssm_parameter" "frontend_api_base_url" {
  name  = local.frontend_api_base_url_ssm_parameter_name
  type  = "String"
  value = local.frontend_api_base_url

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.app_name} ${var.environment} web"
  default_root_object = "index.html"
  aliases             = [local.web_domain]

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3-${aws_s3_bucket.web.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${aws_s3_bucket.web.id}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    compress = true
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = local.cloudfront_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.web.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.web.arn
          }
        }
      }
    ]
  })
}

resource "aws_route53_zone" "primary" {
  count = var.create_public_hosted_zone ? 1 : 0
  name  = var.domain_name

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_route53_record" "web_alias" {
  zone_id = local.zone_id
  name    = local.web_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_cname" {
  count   = !var.create_api_gateway && var.api_dns_target != "" ? 1 : 0
  zone_id = local.zone_id
  name    = local.api_domain
  type    = "CNAME"
  ttl     = 300
  records = [var.api_dns_target]
}

resource "aws_route53_record" "api_alias" {
  count   = var.create_api_gateway ? 1 : 0
  zone_id = local.zone_id
  name    = local.api_domain
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_acm_certificate" "web" {
  count             = var.cloudfront_acm_certificate_arn == "" ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = local.web_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    App = var.app_name
    Env = var.environment
  }
}

resource "aws_route53_record" "web_cert_validation" {
  count = var.cloudfront_acm_certificate_arn == "" ? 1 : 0

  allow_overwrite = true
  zone_id         = local.zone_id
  name            = tolist(aws_acm_certificate.web[0].domain_validation_options)[0].resource_record_name
  type            = tolist(aws_acm_certificate.web[0].domain_validation_options)[0].resource_record_type
  ttl             = 60
  records         = [tolist(aws_acm_certificate.web[0].domain_validation_options)[0].resource_record_value]
}

resource "aws_acm_certificate_validation" "web" {
  count    = var.cloudfront_acm_certificate_arn == "" ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.web[0].arn
  validation_record_fqdns = [aws_route53_record.web_cert_validation[0].fqdn]
}
