#!/usr/bin/env bash
set -euo pipefail

export AWS_PAGER=""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
TFVARS_FILE="$INFRA_DIR/terraform.tfvars"
SUMMARY_FILE="$INFRA_DIR/bootstrap_summary.json"
PLAN_FILE="$INFRA_DIR/.bootstrap.plan"
APPLY=false
create_ocr_lambda=false

usage() {
  cat <<USAGE
Usage: scripts/bootstrap_infra.sh [--apply]

- Checks AWS for existing resources
- Imports any found resources into Terraform state
- If --apply is passed, runs terraform apply to create missing resources
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --apply)
      APPLY=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd terraform
need_cmd aws
need_cmd sed
need_cmd grep
need_cmd jq
need_cmd python3

if [[ ! -f "$TFVARS_FILE" ]]; then
  echo "Missing $TFVARS_FILE. Copy infra/terraform.tfvars.example first." >&2
  exit 1
fi

check_aws_auth() {
  if aws sts get-caller-identity >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<ERR
AWS credentials are missing or invalid.

Quick setup options:
  1) aws configure --profile personal-finance
     AWS_PROFILE=personal-finance scripts/bootstrap_infra.sh

  2) Export temporary credentials:
     export AWS_ACCESS_KEY_ID=...
     export AWS_SECRET_ACCESS_KEY=...
     export AWS_SESSION_TOKEN=...   # only if provided
     export AWS_REGION=us-east-1

Then verify with:
  aws sts get-caller-identity
ERR
  exit 1
}

get_tfvar_string() {
  local key="$1"
  sed -nE "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*\"([^\"]*)\"[[:space:]]*$/\1/p" "$TFVARS_FILE" | head -n1
}

get_tfvar_bool() {
  local key="$1"
  sed -nE "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*(true|false)[[:space:]]*$/\1/p" "$TFVARS_FILE" | head -n1
}

state_has() {
  local address="$1"
  terraform -chdir="$INFRA_DIR" state list 2>/dev/null | grep -Fx "$address" >/dev/null 2>&1
}

import_if_needed() {
  local address="$1"
  local id="$2"

  if [[ -z "$id" || "$id" == "None" || "$id" == "null" ]]; then
    return 0
  fi

  if state_has "$address"; then
    echo "[skip] $address already in state"
    return 0
  fi

  echo "[import] $address <= $id"
  if terraform -chdir="$INFRA_DIR" import "$address" "$id"; then
    return 0
  fi

  # If import fails because the remote object is missing, continue so apply can create it.
  # We intentionally continue on any import failure to keep bootstrap resilient when
  # partially-created/manual infra doesn't exactly match expected resources.
  echo "[warn] import failed for $address (id: $id). Continuing; terraform apply can create missing resources."
  return 0
}

resource_exists_route53_record() {
  local zone_id="$1"
  local name="$2"
  local type="$3"

  local result
  result=$(aws route53 list-resource-record-sets \
    --hosted-zone-id "$zone_id" \
    --query "length(ResourceRecordSets[?Name=='${name}.' && Type=='${type}'])" \
    --output text 2>/dev/null) || return 1

  [[ "$result" != "0" ]]
}

route53_zone_exists() {
  local zone_id="$1"
  aws route53 get-hosted-zone --id "$zone_id" >/dev/null 2>&1
}

package_lambda_artifacts() {
  echo "[package] backend lambda artifact"
  "$ROOT_DIR/scripts/package_backend_lambda.sh" >/dev/null
  if [[ "$create_ocr_lambda" == "true" ]]; then
    echo "[package] ocr lambda artifact"
    "$ROOT_DIR/scripts/package_ocr_lambda.sh" >/dev/null
  fi
}

generate_summary_report() {
  echo "[report] generating $SUMMARY_FILE"
  terraform -chdir="$INFRA_DIR" plan -input=false -var-file=terraform.tfvars -out="$(basename "$PLAN_FILE")" >/dev/null
  terraform -chdir="$INFRA_DIR" show -json "$(basename "$PLAN_FILE")" > "$PLAN_FILE.json"
  local existing_json
  existing_json="$(terraform -chdir="$INFRA_DIR" state list | jq -R -s 'split("\n") | map(select(length > 0))')"
  jq -n \
    --arg generated_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --argjson existing "$existing_json" \
    --slurpfile plan "$PLAN_FILE.json" \
    '
    def scalar_paths($v): [$v | paths(scalars)];
    def changed_paths($before; $after):
      (
        (scalar_paths($before) + scalar_paths($after) | unique) as $all
        | [
            $all[]
            | . as $p
            | select(($before | getpath($p) // null) != ($after | getpath($p) // null))
            | $p
            | map(tostring)
            | join(".")
          ]
      );

    {
      generated_at: $generated_at,
      existing_resources: $existing,
      planned_create_resources: (($plan[0].resource_changes // []) | map(select(.change.actions == ["create"]) | .address) | sort),
      planned_replace_resources: (($plan[0].resource_changes // []) | map(select(.change.actions == ["delete","create"] or .change.actions == ["create","delete"]) | .address) | sort),
      planned_update_resources: (($plan[0].resource_changes // []) | map(select(.change.actions == ["update"]) | .address) | sort),
      planned_update_details: (
        ($plan[0].resource_changes // [])
        | map(
            select(.change.actions == ["update"])
            | {
                address,
                actions: .change.actions,
                changed_paths: changed_paths(.change.before; .change.after)
              }
          )
      )
    }' \
    > "$SUMMARY_FILE"
  rm -f "$PLAN_FILE" "$PLAN_FILE.json"
}

cert_status() {
  local arn="$1"
  aws acm describe-certificate \
    --region us-east-1 \
    --certificate-arn "$arn" \
    --query 'Certificate.Status' \
    --output text 2>/dev/null || true
}

is_cert_issued() {
  local arn="$1"
  [[ -n "$arn" ]] || return 1
  [[ "$(cert_status "$arn")" == "ISSUED" ]]
}

get_state_cert_arn() {
  local address="$1"
  terraform -chdir="$INFRA_DIR" state show "$address" 2>/dev/null \
    | sed -nE 's/^[[:space:]]*arn[[:space:]]*=[[:space:]]*"([^"]+)".*$/\1/p' \
    | head -n1
}

all_required_certs_issued() {
  local web_arn=""
  local api_arn=""

  if [[ -n "$cloudfront_acm_certificate_arn" ]]; then
    web_arn="$cloudfront_acm_certificate_arn"
  else
    web_arn="$(get_state_cert_arn 'aws_acm_certificate.web[0]')"
  fi

  if ! is_cert_issued "$web_arn"; then
    return 1
  fi

  if [[ "$create_api_gateway" == "true" ]]; then
    if [[ -n "$api_gateway_acm_certificate_arn" ]]; then
      api_arn="$api_gateway_acm_certificate_arn"
    else
      api_arn="$(get_state_cert_arn 'aws_acm_certificate.api_gateway[0]')"
    fi

    if ! is_cert_issued "$api_arn"; then
      return 1
    fi
  fi

  return 0
}

apply_without_cert_wait() {
  local targets=(
    "-target=aws_s3_bucket.web"
    "-target=aws_s3_bucket_public_access_block.web"
    "-target=aws_s3_bucket_versioning.web"
    "-target=aws_s3_bucket.receipts"
    "-target=aws_s3_bucket_public_access_block.receipts"
    "-target=aws_s3_bucket_versioning.receipts"
    "-target=aws_s3_bucket_policy.web"
    "-target=aws_cloudfront_origin_access_control.web"
    "-target=aws_iam_role.backend_lambda_exec"
    "-target=aws_iam_role_policy_attachment.backend_lambda_basic_exec"
    "-target=aws_iam_role_policy_attachment.backend_lambda_vpc_exec"
    "-target=aws_security_group.backend_lambda"
    "-target=aws_lambda_function.backend"
    "-target=aws_ssm_parameter.frontend_api_base_url"
    "-target=aws_acm_certificate.web[0]"
    "-target=aws_route53_record.web_cert_validation[0]"
  )

  if [[ "$create_rds_postgres" == "true" ]]; then
    targets+=("-target=aws_security_group.db")
    targets+=("-target=aws_db_subnet_group.backend")
    targets+=("-target=aws_db_instance.backend[0]")
  fi

  if [[ "$create_api_gateway" == "true" ]]; then
    targets+=("-target=aws_apigatewayv2_api.backend[0]")
    targets+=("-target=aws_apigatewayv2_integration.backend_lambda[0]")
    targets+=("-target=aws_apigatewayv2_route.backend_root[0]")
    targets+=("-target=aws_apigatewayv2_route.backend_proxy[0]")
    targets+=("-target=aws_apigatewayv2_stage.backend[0]")
    targets+=("-target=aws_lambda_permission.allow_apigw_backend[0]")

    if [[ -z "$api_gateway_acm_certificate_arn" ]]; then
      targets+=("-target=aws_acm_certificate.api_gateway[0]")
      targets+=("-target=aws_route53_record.api_gateway_cert_validation[0]")
    else
      targets+=("-target=aws_apigatewayv2_domain_name.api[0]")
      targets+=("-target=aws_apigatewayv2_api_mapping.api[0]")
      targets+=("-target=aws_route53_record.api_alias[0]")
    fi
  fi

  if [[ "$create_ocr_lambda" == "true" ]]; then
    targets+=("-target=aws_iam_role.ocr_lambda_exec[0]")
    targets+=("-target=aws_iam_role_policy_attachment.ocr_lambda_basic_exec[0]")
    targets+=("-target=aws_iam_role_policy.ocr_textract[0]")
    targets+=("-target=aws_lambda_function.ocr[0]")
  fi

  if [[ "$create_public_hosted_zone" == "true" ]]; then
    targets+=("-target=aws_route53_zone.primary[0]")
  fi

  if [[ -n "$api_dns_target" ]]; then
    targets+=("-target=aws_route53_record.api_cname[0]")
  fi

  echo "[apply] staged apply (creates ACM cert + DNS record, does not wait for validation)"
  terraform -chdir="$INFRA_DIR" apply "${targets[@]}"
  echo "[next] once certificate status is ISSUED, run: terraform -chdir=infra apply"
}

echo "[init] terraform init"
terraform -chdir="$INFRA_DIR" init

echo "[auth] validating AWS credentials"
check_aws_auth

package_lambda_artifacts

aws_region="$(get_tfvar_string aws_region)"
app_name="$(get_tfvar_string app_name)"
environment="$(get_tfvar_string environment)"
domain_name="$(get_tfvar_string domain_name)"
web_subdomain="$(get_tfvar_string web_subdomain)"
api_subdomain="$(get_tfvar_string api_subdomain)"
web_bucket_name="$(get_tfvar_string web_bucket_name)"
receipts_bucket_name="$(get_tfvar_string receipts_bucket_name)"
create_public_hosted_zone="$(get_tfvar_bool create_public_hosted_zone)"
existing_route53_zone_id="$(get_tfvar_string existing_route53_zone_id)"
api_dns_target="$(get_tfvar_string api_dns_target)"
cloudfront_acm_certificate_arn="$(get_tfvar_string cloudfront_acm_certificate_arn)"
api_gateway_acm_certificate_arn="$(get_tfvar_string api_gateway_acm_certificate_arn)"
create_api_gateway="$(get_tfvar_bool create_api_gateway)"
create_ocr_lambda="$(get_tfvar_bool create_ocr_lambda)"
create_rds_postgres="$(get_tfvar_bool create_rds_postgres)"
backend_lambda_name="$(get_tfvar_string backend_lambda_name)"
ocr_lambda_name="$(get_tfvar_string ocr_lambda_name)"

if [[ -z "$aws_region" || -z "$domain_name" || -z "$web_subdomain" || -z "$web_bucket_name" || -z "$receipts_bucket_name" || -z "$app_name" || -z "$environment" ]]; then
  echo "One or more required tfvars are missing in $TFVARS_FILE" >&2
  exit 1
fi

web_domain="${web_subdomain}.${domain_name}"
api_domain="${api_subdomain}.${domain_name}"
oac_name="${app_name}-${environment}-web-oac"

# S3 resources
if aws s3api head-bucket --bucket "$web_bucket_name" >/dev/null 2>&1; then
  import_if_needed aws_s3_bucket.web "$web_bucket_name"
  import_if_needed aws_s3_bucket_public_access_block.web "$web_bucket_name"
  import_if_needed aws_s3_bucket_versioning.web "$web_bucket_name"
  import_if_needed aws_s3_bucket_policy.web "$web_bucket_name"
fi

if aws s3api head-bucket --bucket "$receipts_bucket_name" >/dev/null 2>&1; then
  import_if_needed aws_s3_bucket.receipts "$receipts_bucket_name"
  import_if_needed aws_s3_bucket_public_access_block.receipts "$receipts_bucket_name"
  import_if_needed aws_s3_bucket_versioning.receipts "$receipts_bucket_name"
fi

# Lambda functions
if [[ -n "$backend_lambda_name" ]]; then
  if aws lambda get-function --function-name "$backend_lambda_name" >/dev/null 2>&1; then
    import_if_needed aws_lambda_function.backend "$backend_lambda_name"
  fi
fi

if [[ "$create_ocr_lambda" == "true" && -n "$ocr_lambda_name" ]]; then
  if aws lambda get-function --function-name "$ocr_lambda_name" >/dev/null 2>&1; then
    import_if_needed 'aws_lambda_function.ocr[0]' "$ocr_lambda_name"
  fi
fi

# CloudFront distribution by alias
cf_distribution_id=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items, '${web_domain}')].Id | [0]" \
  --output text)
import_if_needed aws_cloudfront_distribution.web "$cf_distribution_id"

# CloudFront OAC by configured name
oac_id=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${oac_name}'].Id | [0]" \
  --output text)
import_if_needed aws_cloudfront_origin_access_control.web "$oac_id"

# Route53 zone and records
zone_id=""
if [[ "$create_public_hosted_zone" == "true" ]]; then
  zone_id=$(aws route53 list-hosted-zones-by-name \
    --dns-name "$domain_name" \
    --query "HostedZones[?Name=='${domain_name}.'].Id | [0]" \
    --output text)
  zone_id="${zone_id#/hostedzone/}"
  import_if_needed aws_route53_zone.primary "$zone_id"
else
  zone_id="$existing_route53_zone_id"
fi

if [[ -n "$zone_id" && "$zone_id" != "None" ]]; then
  if ! route53_zone_exists "$zone_id"; then
    echo "[warn] Route53 zone '$zone_id' not found. Skipping Route53 imports."
    zone_id=""
  fi
fi

if [[ -n "$zone_id" ]]; then
  if resource_exists_route53_record "$zone_id" "$web_domain" "A"; then
    import_if_needed aws_route53_record.web_alias "${zone_id}_${web_domain}_A"
  fi

  if [[ "$create_api_gateway" == "true" ]]; then
    if resource_exists_route53_record "$zone_id" "$api_domain" "A"; then
      import_if_needed 'aws_route53_record.api_alias[0]' "${zone_id}_${api_domain}_A"
    fi
  elif [[ -n "$api_dns_target" ]]; then
    if resource_exists_route53_record "$zone_id" "$api_domain" "CNAME"; then
      import_if_needed 'aws_route53_record.api_cname[0]' "${zone_id}_${api_domain}_CNAME"
    fi
  fi
fi

if [[ "$APPLY" == "true" ]]; then
  generate_summary_report
  if all_required_certs_issued; then
    echo "[apply] all required certificates are ISSUED; running full apply"
    terraform -chdir="$INFRA_DIR" apply
  elif [[ -z "$cloudfront_acm_certificate_arn" || ( "$create_api_gateway" == "true" && -z "$api_gateway_acm_certificate_arn" ) ]]; then
    apply_without_cert_wait
  else
    echo "[apply] terraform apply"
    terraform -chdir="$INFRA_DIR" apply
  fi
else
  generate_summary_report
  echo "[done] bootstrap/import complete. Run this to create missing resources:"
  echo "terraform -chdir=infra apply"
fi
