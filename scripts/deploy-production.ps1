# ============================================================
# Hangul Now Cloud Run 프로덕션 전자동 배포 스크립트
# 모바일 PWA 및 웹 운영 서버에 즉시 반영합니다.
# ============================================================
$ErrorActionPreference = "Stop"

$PROJECT_ID = "hnageul-copilot-dev-918"
$REGION = "us-east4"
$SERVICE_NAME = "hangul-now-api"
$SERVICE_ACCOUNT = "hangul-now-api-runtime@hnageul-copilot-dev-918.iam.gserviceaccount.com"

Write-Host "🔨 [1/6] Node 20으로 프론트엔드(frontend/dist) 최신 빌드..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "build-frontend-node20.ps1")

Write-Host "🚀 [2/6] Git 상태 확인 및 원격 푸시..." -ForegroundColor Cyan
$sha = (git rev-parse --short HEAD)
$branch = (git branch --show-current)
git push origin $branch

Write-Host "📦 [3/6] Git Archive 패키징 (hn-$sha.tgz)..." -ForegroundColor Cyan
$archiveFile = "hn-$sha.tgz"
git -c core.autocrlf=false archive --format=tar.gz -o $archiveFile HEAD

try {
    Write-Host "🔨 [4/7] Google Cloud Build 컨테이너 이미지 빌드..." -ForegroundColor Cyan
    $imageTag = "$REGION-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME`:$sha"
    gcloud builds submit $archiveFile --region $REGION --tag $imageTag

    Write-Host "🚢 [5/7] Cloud Run 프로덕션 배포 및 트래픽 100% 즉시 전환..." -ForegroundColor Cyan
    $secretsList = @(
        "GEMINI_API_KEY=hn-staging-gemini-api-key:latest",
        "FIREBASE_SERVICE_ACCOUNT_KEY=hn-staging-firebase-sa-key:latest",
        "ADMIN_EMAILS=hn-staging-admin-emails:latest",
        "SUPABASE_DB_URL=hn-prod-supabase-db-url:latest",
        "SUPABASE_URL=hn-prod-supabase-url:latest",
        "SUPABASE_SECRET_KEY=hn-prod-supabase-secret-key:latest",
        "SUPABASE_PUBLISHABLE_KEY=hn-prod-supabase-pub-key:latest",
        "R2_ACCOUNT_ID=hn-prod-r2-account-id:latest",
        "R2_BUCKET_NAME=hn-prod-r2-bucket-name:latest",
        "R2_ACCESS_KEY_ID=hn-prod-r2-access-key-id:latest",
        "R2_SECRET_ACCESS_KEY=hn-prod-r2-secret-access-key:latest"
    )
    $secrets = $secretsList -join ","
    gcloud run deploy $SERVICE_NAME `
        --image $imageTag `
        --region $REGION `
        --service-account $SERVICE_ACCOUNT `
        --timeout 3600 `
        --max-instances 1 `
        --allow-unauthenticated `
        --tag "rc-$sha" `
        --set-secrets $secrets

    Write-Host "🔄 최신 리비전 트래픽 100% 전환..." -ForegroundColor Cyan
    gcloud run services update-traffic $SERVICE_NAME --region $REGION --to-latest

    Write-Host "🌐 [6/7] Firebase Hosting 정적 사이트 동시 배포..." -ForegroundColor Cyan
    npx firebase-tools deploy --only hosting --project $PROJECT_ID --non-interactive

    Write-Host "🩺 [7/7] 서비스 헬스체크 검증..." -ForegroundColor Cyan
    $serviceUrl = (gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)")
    $health = Invoke-RestMethod -Uri "$serviceUrl/api/health"
    if ($health.status -eq "ok") {
        Write-Host "✅ 배포 성공! Cloud Run 및 Firebase Hosting 모두 최신 배포 완료: $serviceUrl" -ForegroundColor Green
    } else {
        Write-Warning "⚠️ 헬스체크 응답 이상: $health"
    }

}
finally {
    if (Test-Path $archiveFile) {
        Remove-Item -Path $archiveFile -Force -ErrorAction SilentlyContinue
    }
}
