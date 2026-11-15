#!/usr/bin/env bash
# Deploys the committed tip of main to production (Cloud Run, Mumbai).
#
#   scripts/deploy.sh            build, deploy a candidate, smoke-test it, then send it all traffic
#   scripts/deploy.sh rollback   list recent revisions and how to send traffic back to one
#
# What is switched on is decided by the three flags below. Secrets live in Secret
# Manager; nothing secret is in this file or printed by it.
set -euo pipefail

PROJECT=fitovela-prod
REGION=asia-south1
SERVICE=fitovela
RUNTIME_SA="fitovela-app@${PROJECT}.iam.gserviceaccount.com"
SITE_URL=https://fitovela.com
# tarot's project, whose 2Factor and SES keys this service is allowed to read.
SHARED=projects/1080479161978/secrets

SMS_ENABLED=1        # login codes by SMS through 2Factor
EMAIL_ENABLED=0      # set to 1 once fitovela.com is a verified sender in Amazon SES
RAZORPAY_ENABLED=0   # set to 1 once razorpay-key-id, razorpay-key-secret and razorpay-webhook-secret exist in Secret Manager

if [[ "${1:-}" == "rollback" ]]; then
  gcloud run revisions list --project "$PROJECT" --region "$REGION" --service "$SERVICE" --limit 8 \
    --format='table(metadata.name,metadata.labels.git-sha,metadata.creationTimestamp,status.conditions[0].status)'
  echo
  echo "To send all traffic to one of these:"
  echo "  gcloud run services update-traffic $SERVICE --project $PROJECT --region $REGION --to-revisions=<name>=100"
  exit 0
fi

[[ -z "$(git status --porcelain)" ]] || { echo "Commit or stash your changes first: only committed code is deployed." >&2; exit 1; }
git fetch --quiet origin main
SHA=$(git rev-parse HEAD)
[[ "$SHA" == "$(git rev-parse origin/main)" ]] || { echo "HEAD is not origin/main. Production is deployed from main only." >&2; exit 1; }

IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/fitovela/app:git-${SHA:0:12}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git archive --format=tar.gz -o "$TMP/source.tgz" HEAD

echo "Building $IMAGE"
gcloud builds submit "$TMP/source.tgz" --project "$PROJECT" --region "$REGION" --tag "$IMAGE" --quiet --suppress-logs

ENV="NODE_ENV=production,STORE_DRIVER=firestore,GOOGLE_CLOUD_PROJECT=${PROJECT},SITE_URL=${SITE_URL},APP_GIT_SHA=${SHA}"
SECRETS="AUTH_SECRET=auth-secret:latest"
if [[ "$SMS_ENABLED" == 1 ]]; then SECRETS+=",TWOFACTOR_API_KEY=${SHARED}/twofactor-api-key:1"; fi
if [[ "$EMAIL_ENABLED" == 1 ]]; then
  ENV+=",EMAIL_PROVIDER=ses,AWS_SES_REGION=ap-south-1"
  SECRETS+=",AWS_SES_ACCESS_KEY_ID=${SHARED}/ses-access-key-id:1,AWS_SES_SECRET_ACCESS_KEY=${SHARED}/ses-secret-access-key:1"
fi
if [[ "$RAZORPAY_ENABLED" == 1 ]]; then
  SECRETS+=",RAZORPAY_KEY_ID=razorpay-key-id:latest,RAZORPAY_KEY_SECRET=razorpay-key-secret:latest,RAZORPAY_WEBHOOK_SECRET=razorpay-webhook-secret:latest"
fi

FIRST=0
gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(metadata.name)' >/dev/null 2>&1 || FIRST=1
TRAFFIC=(--no-traffic --tag candidate)
if [[ "$FIRST" == 1 ]]; then TRAFFIC=(); fi

echo "Deploying"
gcloud run deploy "$SERVICE" --project "$PROJECT" --region "$REGION" --platform managed --quiet \
  --image "$IMAGE" --service-account "$RUNTIME_SA" --allow-unauthenticated \
  --port 8080 --cpu 1 --memory 512Mi --concurrency 80 --timeout 30 --min-instances 0 --max-instances 4 \
  --set-env-vars "$ENV" --set-secrets "$SECRETS" --update-labels "git-sha=${SHA:0:12}" ${TRAFFIC[@]+"${TRAFFIC[@]}"}

if [[ "$FIRST" == 1 ]]; then
  URL=$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')
else
  URL=$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format=json | python3 -c 'import sys,json; print(next(t["url"] for t in json.load(sys.stdin)["status"]["traffic"] if t.get("tag")=="candidate"))')
fi

echo "Checking $URL"
HEALTH=$(curl -fsS --retry 5 --retry-delay 3 "$URL/api/health")
[[ "$HEALTH" == *"\"release\":\"$SHA\""* ]] || { echo "Health check did not report this release: $HEALTH" >&2; exit 1; }
for path in / /terms /privacy /refund /contact /login; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL$path")
  [[ "$CODE" == 200 ]] || { echo "$path returned $CODE; traffic was not moved." >&2; exit 1; }
done
# A new assessment must be storable: this proves the database works on this revision.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"ageBand":"30-39","hook":"a","category":"pcos","ad":{"utm_source":"deploy-check"}}' "$URL/api/session")
[[ "$CODE" == 200 ]] || { echo "Could not start an assessment (HTTP $CODE); traffic was not moved." >&2; exit 1; }

if [[ "$FIRST" != 1 ]]; then
  gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" --to-latest --quiet >/dev/null
fi
echo "Live: release ${SHA:0:12}"
