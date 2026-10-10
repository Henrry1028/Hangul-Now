import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = 'hangul-now-api-runtime@hnageul-copilot-dev-918.iam.gserviceaccount.com';

const secretMapping = {
  'hn-prod-supabase-db-url': process.env.SUPABASE_DB_URL,
  'hn-prod-supabase-url': process.env.SUPABASE_URL,
  'hn-prod-supabase-secret-key': process.env.SUPABASE_SECRET_KEY,
  'hn-prod-supabase-pub-key': process.env.SUPABASE_PUBLISHABLE_KEY,
  'hn-prod-r2-account-id': process.env.R2_ACCOUNT_ID,
  'hn-prod-r2-bucket-name': process.env.R2_BUCKET_NAME || process.env.R2_BUCKET,
  'hn-prod-r2-access-key-id': process.env.R2_ACCESS_KEY_ID,
  'hn-prod-r2-secret-access-key': process.env.R2_SECRET_ACCESS_KEY
};

for (const [secretName, secretVal] of Object.entries(secretMapping)) {
  if (!secretVal || !secretVal.trim()) {
    console.warn(`[건너뜀] ${secretName}: .env에 값이 없습니다.`);
    continue;
  }

  console.log(`🔐 시크릿 생성/확인 중: ${secretName}...`);
  try {
    execFileSync('gcloud', ['secrets', 'describe', secretName, '--quiet'], { stdio: 'pipe', shell: true });
  } catch {
    console.log(`  ➕ 새 시크릿 생성: ${secretName}`);
    execFileSync('gcloud', ['secrets', 'create', secretName, '--replication-policy=automatic', '--quiet'], { stdio: 'pipe', shell: true });
  }

  console.log(`📝 최신 암호화 버전 등록 중: ${secretName}...`);
  const tempFile = path.join(process.cwd(), `.temp-secret-${Date.now()}`);
  fs.writeFileSync(tempFile, secretVal.trim(), 'utf8');
  try {
    execFileSync('gcloud', ['secrets', 'versions', 'add', secretName, `--data-file=${tempFile}`, '--quiet'], { stdio: 'pipe', shell: true });
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }

  console.log(`🔑 Cloud Run 서비스 계정 접근 권한 부여 중...`);
  try {
    execFileSync('gcloud', [
      'secrets', 'add-iam-policy-binding', secretName,
      `--member=serviceAccount:${serviceAccount}`,
      '--role=roles/secretmanager.secretAccessor',
      '--quiet'
    ], { stdio: 'pipe', shell: true });
  } catch (err) {
    console.warn(`  ⚠️ 권한 부여 경고: ${err.message}`);
  }

  console.log(`✅ ${secretName} 등록 및 암호화 완료!\n`);
}

console.log('🎉 모든 시크릿이 Google Secret Manager에 안전하게 동기화되었습니다.');
