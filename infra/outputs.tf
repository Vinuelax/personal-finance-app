output "web_bucket_name" {
  value = aws_s3_bucket.web.bucket
}

output "receipts_bucket_name" {
  value = aws_s3_bucket.receipts.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.web.domain_name
}

output "web_domain" {
  value = local.web_domain
}

output "api_domain" {
  value = local.api_domain
}

output "api_gateway_custom_domain_target" {
  value = try(aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].target_domain_name, null)
}

output "cloudfront_certificate_arn" {
  value = local.cloudfront_certificate_arn
}

output "api_gateway_id" {
  value = try(aws_apigatewayv2_api.backend[0].id, null)
}

output "api_gateway_default_invoke_url" {
  value = try(aws_apigatewayv2_stage.backend[0].invoke_url, null)
}

output "frontend_api_base_url" {
  value = local.frontend_api_base_url
}

output "frontend_api_base_url_ssm_parameter_name" {
  value = aws_ssm_parameter.frontend_api_base_url.name
}

output "backend_lambda_name" {
  value = aws_lambda_function.backend.function_name
}

output "ocr_lambda_name" {
  value = try(aws_lambda_function.ocr[0].function_name, null)
}

output "db_endpoint" {
  value = try(aws_db_instance.backend[0].address, null)
}

output "db_port" {
  value = try(aws_db_instance.backend[0].port, null)
}
