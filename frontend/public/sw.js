// Hangul Now PWA Service Worker (네트워크 우선 & 즉시 갱신 전략)
const CACHE_VERSION = 'hn-v1.1.0';

self.addEventListener('install', (event) => {
  // 새 서비스 워커 즉시 활성화 대기열 통과
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 이전 버전 캐시 정리 및 즉시 클라이언트 제어
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 클라이언트로부터 SKIP_WAITING 메시지 수신 시 즉시 활성화
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 네트워크 우선(Network First) 페치 핸들러
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 호출 및 웹소켓 등은 캐시하지 않고 무조건 네트워크로 통과
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return;
  }

  // HTML 문서 및 정적 에셋: 네트워크 우선 조회 후 캐시 업데이트
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 오프라인 시 캐시된 응답 반환
        return caches.match(event.request);
      })
  );
});
