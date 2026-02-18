# Terraform Infra (PennyPilot)

This folder manages core cloud infrastructure for `dev` in `us-east-1`:

- Frontend S3 bucket (`pennypilot-web-dev-use1`)
- Receipts S3 bucket (`pennypilot-receipts-dev-use1`)
- CloudFront distribution for `app.vinuelax.cl`
- Route53 DNS records in `vinuelax.cl`
- Backend Lambda (+ optional OCR Lambda)
- HTTP API Gateway integrated with backend Lambda
- API Gateway custom domain `api.<domain>` with ACM certificate + Route53 alias
- SSM parameter with frontend API base URL

## Prerequisites

- Terraform >= 1.6
- AWS credentials configured locally
- Route53 hosted zone available for DNS validation (`vinuelax.cl`)
- Python 3 for Lambda packaging scripts

## Quick Start

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
```

## Bootstrap Existing + Create Missing

Use the bootstrap script from repo root to auto-detect already-created AWS resources,
import them into Terraform state, build Lambda artifacts, and then create anything missing.

```bash
# from repo root
scripts/bootstrap_infra.sh

# import existing and apply (create missing)
scripts/bootstrap_infra.sh --apply
```

## Import Existing Resources

Because you already created resources manually, import them before apply.

```bash
cd infra
terraform init

terraform import aws_s3_bucket.web pennypilot-web-dev-use1
terraform import aws_s3_bucket.receipts pennypilot-receipts-dev-use1
terraform import aws_cloudfront_origin_access_control.web <OAC_ID>
terraform import aws_cloudfront_distribution.web <DISTRIBUTION_ID>
terraform import aws_s3_bucket_public_access_block.web pennypilot-web-dev-use1
terraform import aws_s3_bucket_public_access_block.receipts pennypilot-receipts-dev-use1
terraform import aws_s3_bucket_versioning.web pennypilot-web-dev-use1
terraform import aws_s3_bucket_versioning.receipts pennypilot-receipts-dev-use1
```

Route53 import examples:

```bash
terraform import aws_route53_zone.primary Z1234567890ABC
terraform import aws_route53_record.web_alias Z1234567890ABC_app.vinuelax.cl_A
```

## Notes

- `api.vinuelax.cl` is optional in this stack and is created as CNAME when `api_dns_target` is set.
- `create_api_gateway` is `true` by default.
- `create_ocr_lambda` is `false` by default.
- If `cloudfront_acm_certificate_arn` is empty, Terraform creates an ACM cert in `us-east-1` and validates it via Route53.
- Terraform publishes frontend API base URL to SSM: `/<app_name>/<environment>/frontend/api_base_url`.
- Lambda code can still be updated by CI workflows in `.github/workflows/`.
