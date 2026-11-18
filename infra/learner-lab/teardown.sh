#!/usr/bin/env bash
# Removes everything deploy.sh created in the AWS Academy Learner Lab account.
#
# Usage (repo root): bash infra/learner-lab/teardown.sh
set -uo pipefail

REGION="${AWS_REGION:-us-east-1}"
STAGE="${STAGE:-lab}"
AWS="aws --region ${REGION}"

ACCOUNT="$(${AWS} sts get-caller-identity --query Account --output text)" || exit 1
TABLE="flash-${STAGE}"
FUNCTION="flash-${STAGE}-api"
IMAGES_BUCKET="flash-${STAGE}-images-${ACCOUNT}"
WEB_BUCKET="flash-${STAGE}-web-${ACCOUNT}"

step() { printf '\n==> %s\n' "$1"; }

step "Lambda ${FUNCTION}"
${AWS} lambda delete-function-url-config --function-name "${FUNCTION}" 2>/dev/null
${AWS} lambda delete-function --function-name "${FUNCTION}" 2>/dev/null && echo "deleted" || echo "not found"
${AWS} logs delete-log-group --log-group-name "/aws/lambda/${FUNCTION}" 2>/dev/null

for BUCKET in "${WEB_BUCKET}" "${IMAGES_BUCKET}"; do
  step "S3 bucket ${BUCKET}"
  if ${AWS} s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
    ${AWS} s3 rm "s3://${BUCKET}" --recursive --quiet
    ${AWS} s3api delete-bucket --bucket "${BUCKET}" && echo "deleted"
  else
    echo "not found"
  fi
done

step "DynamoDB table ${TABLE}"
if ${AWS} dynamodb delete-table --table-name "${TABLE}" >/dev/null 2>&1; then
  ${AWS} dynamodb wait table-not-exists --table-name "${TABLE}"
  echo "deleted"
else
  echo "not found"
fi

step "Done"
