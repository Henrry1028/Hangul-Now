// ============================================================
// Hangul Now 파일 저장소 계층 (Cloudflare R2 / Firebase Storage)
// - R2 환경변수 네 개가 모두 있으면 R2, 없으면 기존 Firebase Storage로 동작한다.
// - 호출부는 put / signedReadUrl 두 동작만 쓰고 백엔드를 알 필요가 없다.
// ============================================================

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2(S3 SigV4) 서명 URL의 최대 유효 기간
export const R2_MAX_SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;
// 목록 조회 때 새로 발급하는 링크의 유효 기간
const REFRESHED_URL_MS = 60 * 60 * 1000;

const clean = (value) => String(value || "").trim();

// S3 메타데이터는 HTTP 헤더로 전송되어 한글 등 비ASCII 문자를 실을 수 없으므로 퍼센트 인코딩한다
const encodeMetadata = (metadata) => metadata
  && Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, encodeURIComponent(String(value ?? ""))]));

export function readR2Config(env = process.env) {
  const accountId = clean(env.R2_ACCOUNT_ID);
  const accessKeyId = clean(env.R2_ACCESS_KEY_ID);
  const secretAccessKey = clean(env.R2_SECRET_ACCESS_KEY);
  // Cloudflare 안내 문서의 관례인 R2_BUCKET_NAME도 받는다
  const bucket = clean(env.R2_BUCKET) || clean(env.R2_BUCKET_NAME);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint: `https://${accountId}.r2.cloudflarestorage.com` };
}

export function createR2Store(config, { client, now = Date.now } = {}) {
  const s3 = client || new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // R2는 SDK가 기본으로 붙이는 체크섬 헤더를 요구하지 않는다 (Cloudflare 권장 설정)
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
  });

  return {
    backend: "r2",
    async put(key, body, { contentType, cacheControl, metadata } = {}) {
      await s3.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
        Metadata: encodeMetadata(metadata)
      }));
    },
    // expiresAt이 7일보다 멀면 R2 한도인 7일로 줄인다
    async signedReadUrl(key, { expiresAt }) {
      const requested = Math.ceil((Number(expiresAt) - now()) / 1000);
      const expiresIn = Math.max(1, Math.min(requested, R2_MAX_SIGNED_URL_SECONDS));
      return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
        expiresIn,
        signingDate: new Date(now())
      });
    }
  };
}

export function createFirebaseStore(storage) {
  return {
    backend: "firebase-storage",
    async put(key, body, { contentType, cacheControl, metadata } = {}) {
      const fileMetadata = {};
      if (cacheControl) fileMetadata.cacheControl = cacheControl;
      if (metadata) fileMetadata.metadata = metadata;
      await storage.bucket().file(key).save(body, { contentType, metadata: fileMetadata });
    },
    async signedReadUrl(key, { expiresAt }) {
      const [url] = await storage.bucket().file(key).getSignedUrl({ action: "read", expires: expiresAt });
      return url;
    }
  };
}

export function createObjectStore({ env = process.env, firebaseStorage = null } = {}) {
  const r2 = readR2Config(env);
  if (r2) return createR2Store(r2);
  if (firebaseStorage) return createFirebaseStore(firebaseStorage);
  return null;
}

// R2에 보관된 파일은 저장된 링크가 최대 7일이면 만료되므로, 내려줄 때마다 새 링크를 발급한다.
// Firebase에 보관된 기존 문서(pdfStorage 없음)는 저장된 장기 링크를 그대로 쓴다.
export async function refreshFileUrls(store, session, { now = Date.now } = {}) {
  if (store?.backend !== "r2" || session?.pdfStorage !== "r2" || !session.pdfPath) return session;
  return { ...session, pdfUrl: await store.signedReadUrl(session.pdfPath, { expiresAt: now() + REFRESHED_URL_MS }) };
}
