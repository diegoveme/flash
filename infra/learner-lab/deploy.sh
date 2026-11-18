#!/usr/bin/env bash
# Deploys Flash to an AWS Academy Learner Lab account with the AWS CLI.
#
# Learner Lab accounts can not create IAM roles, so this uses the existing LabRole
# and a single Lambda (function URL) that routes to every API handler. See README.md.
#
# Usage (repo root, AWS CLI credentials from "AWS Details" in ~/.aws/credentials):
#   bash infra/learner-lab/deploy.sh
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STAGE="${STAGE:-lab}"
AWS="aws --region ${REGION}"
WORK="infra/dist/learner-lab"
mkdir -p "${WORK}"

ACCOUNT="$(${AWS} sts get-caller-identity --query Account --output text)"
TABLE="flash-${STAGE}"
FUNCTION="flash-${STAGE}-api"
IMAGES_BUCKET="flash-${STAGE}-images-${ACCOUNT}"
WEB_BUCKET="flash-${STAGE}-web-${ACCOUNT}"
WEB_URL="http://${WEB_BUCKET}.s3-website-${REGION}.amazonaws.com"
IMAGES_URL="https://${IMAGES_BUCKET}.s3.${REGION}.amazonaws.com"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/LabRole"

step() { printf '\n==> %s\n' "$1"; }

# --- DynamoDB -----------------------------------------------------------------
step "DynamoDB table ${TABLE}"
if ! ${AWS} dynamodb describe-table --table-name "${TABLE}" >/dev/null 2>&1; then
  ${AWS} dynamodb create-table \
    --table-name "${TABLE}" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
      AttributeName=gsi1pk,AttributeType=S AttributeName=gsi1sk,AttributeType=S \
      AttributeName=gsi2pk,AttributeType=S AttributeName=gsi2sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes \
      "IndexName=GSI1,KeySchema=[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
      "IndexName=GSI2,KeySchema=[{AttributeName=gsi2pk,KeyType=HASH},{AttributeName=gsi2sk,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
    >/dev/null
  ${AWS} dynamodb wait table-exists --table-name "${TABLE}"
  ${AWS} dynamodb update-time-to-live --table-name "${TABLE}" \
    --time-to-live-specification "Enabled=true,AttributeName=ttl" >/dev/null
fi

# --- S3: images (uploads private, published posts readable) --------------------
step "S3 images bucket ${IMAGES_BUCKET}"
${AWS} s3api head-bucket --bucket "${IMAGES_BUCKET}" >/dev/null 2>&1 ||
  ${AWS} s3api create-bucket --bucket "${IMAGES_BUCKET}" >/dev/null
${AWS} s3api put-public-access-block --bucket "${IMAGES_BUCKET}" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
cat > "${WORK}/images-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublishedImagesOnly",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${IMAGES_BUCKET}/posts/*"
  }]
}
EOF
${AWS} s3api put-bucket-policy --bucket "${IMAGES_BUCKET}" --policy "file://${WORK}/images-policy.json"
cat > "${WORK}/images-cors.json" <<EOF
{ "CORSRules": [{ "AllowedOrigins": ["${WEB_URL}"], "AllowedMethods": ["POST", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 600 }] }
EOF
${AWS} s3api put-bucket-cors --bucket "${IMAGES_BUCKET}" --cors-configuration "file://${WORK}/images-cors.json"
cat > "${WORK}/images-lifecycle.json" <<'EOF'
{ "Rules": [{ "ID": "expire-raw-uploads", "Status": "Enabled", "Filter": { "Prefix": "uploads/" }, "Expiration": { "Days": 1 } }] }
EOF
${AWS} s3api put-bucket-lifecycle-configuration --bucket "${IMAGES_BUCKET}" \
  --lifecycle-configuration "file://${WORK}/images-lifecycle.json" >/dev/null

# --- Lambda --------------------------------------------------------------------
step "Lambda ${FUNCTION}"
bun build apps/api/src/interfaces/http/lambdaRouter.js --target=node --format=esm --minify \
  --outdir="${WORK}/function" --entry-naming=index.mjs >/dev/null
rm -f "${WORK}/function.zip"
if command -v zip >/dev/null 2>&1; then
  (cd "${WORK}/function" && zip -q ../function.zip index.mjs)
else
  # Windows: bsdtar writes zip archives when the extension is .zip.
  (cd "${WORK}/function" && /c/Windows/System32/tar.exe -a -c -f ../function.zip index.mjs)
fi

cat > "${WORK}/environment.json" <<EOF
{
  "Variables": {
    "NODE_OPTIONS": "--enable-source-maps",
    "DB_DRIVER": "dynamodb",
    "DYNAMODB_TABLE": "${TABLE}",
    "STORAGE_DRIVER": "s3",
    "S3_BUCKET": "${IMAGES_BUCKET}",
    "IMAGES_BASE_URL": "${IMAGES_URL}",
    "CACHE_DRIVER": "memory",
    "MAIL_DRIVER": "outbox",
    "LOCAL_DATA_DIR": "/tmp/flash",
    "CORS_ORIGIN": "${WEB_URL}",
    "APP_BASE_URL": "${WEB_URL}",
    "BCRYPT_COST": "10"
  }
}
EOF

if ${AWS} lambda get-function --function-name "${FUNCTION}" >/dev/null 2>&1; then
  ${AWS} lambda update-function-code --function-name "${FUNCTION}" \
    --zip-file "fileb://${WORK}/function.zip" >/dev/null
  ${AWS} lambda wait function-updated --function-name "${FUNCTION}"
  ${AWS} lambda update-function-configuration --function-name "${FUNCTION}" \
    --environment "file://${WORK}/environment.json" >/dev/null
else
  ${AWS} lambda create-function --function-name "${FUNCTION}" \
    --runtime nodejs22.x --architectures x86_64 --handler index.handler \
    --role "${ROLE_ARN}" --timeout 20 --memory-size 1024 \
    --zip-file "fileb://${WORK}/function.zip" \
    --environment "file://${WORK}/environment.json" >/dev/null
fi
${AWS} lambda wait function-active --function-name "${FUNCTION}"
${AWS} lambda wait function-updated --function-name "${FUNCTION}"

step "Function URL"
if ! API_URL="$(${AWS} lambda get-function-url-config --function-name "${FUNCTION}" --query FunctionUrl --output text 2>/dev/null)"; then
  API_URL="$(${AWS} lambda create-function-url-config --function-name "${FUNCTION}" \
    --auth-type NONE --query FunctionUrl --output text)"
  ${AWS} lambda add-permission --function-name "${FUNCTION}" --statement-id public-url \
    --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE >/dev/null
  ${AWS} lambda add-permission --function-name "${FUNCTION}" --statement-id public-url-invoke \
    --action lambda:InvokeFunction --principal '*' --invoked-via-function-url >/dev/null 2>&1 || true
fi
API_URL="${API_URL%/}"

# --- Web app (S3 static website) ----------------------------------------------
step "Web app on ${WEB_URL}"
${AWS} s3api head-bucket --bucket "${WEB_BUCKET}" >/dev/null 2>&1 ||
  ${AWS} s3api create-bucket --bucket "${WEB_BUCKET}" >/dev/null
${AWS} s3api put-public-access-block --bucket "${WEB_BUCKET}" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
cat > "${WORK}/web-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{ "Sid": "PublicSite", "Effect": "Allow", "Principal": "*", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::${WEB_BUCKET}/*" }]
}
EOF
${AWS} s3api put-bucket-policy --bucket "${WEB_BUCKET}" --policy "file://${WORK}/web-policy.json"
# The error document is index.html too, so app routes like /posts/<id> load the SPA.
${AWS} s3 website "s3://${WEB_BUCKET}" --index-document index.html --error-document index.html

VITE_API_URL="${API_URL}" bun run --filter '@flash/web' build >/dev/null
${AWS} s3 sync apps/web/dist "s3://${WEB_BUCKET}" --delete >/dev/null

step "Done"
echo "Web app: ${WEB_URL}"
echo "API:     ${API_URL}"
