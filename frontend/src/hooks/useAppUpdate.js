import { useEffect, useRef, useState, useCallback } from 'react';

const CHECK_INTERVAL_MS = 60 * 1000; // 60초 주기
const APPLIED_REVISION_KEY = 'hn_applied_revision';
const DISMISSED_REVISION_KEY = 'hn_dismissed_revision';

export default function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const initialRevisionRef = useRef(null);
  const latestRevisionRef = useRef(null);
  const checkingRef = useRef(false);

  // 마운트 시 URL에 남은 _hn_update 쿼리 정리
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('_hn_update')) {
        url.searchParams.delete('_hn_update');
        window.history.replaceState({}, document.title, url.pathname + (url.search || '') + url.hash);
      }
    } catch {}
  }, []);

  // 서버 최신 버전 검사 함수
  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const response = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (!response.ok) return;

      const data = await response.json();
      if (!data || data.status !== 'ok') return;

      const serverRevision = String(data.revision || data.bootTime || '');
      if (!serverRevision) return;

      latestRevisionRef.current = serverRevision;

      // 1) 최초 실행 시
      if (!initialRevisionRef.current) {
        initialRevisionRef.current = serverRevision;

        const storedApplied = localStorage.getItem(APPLIED_REVISION_KEY);

        // 첫 방문이거나 기존 저장값이 없으면 현재 버전을 최신으로 저장
        if (!storedApplied) {
          localStorage.setItem(APPLIED_REVISION_KEY, serverRevision);
          return;
        }

        // 저장된 버전과 서버의 최신 버전이 다른 경우 (새 배포 존재)
        if (storedApplied !== serverRevision) {
          const dismissedRev = sessionStorage.getItem(DISMISSED_REVISION_KEY);
          if (dismissedRev !== serverRevision) {
            setVersionInfo(data);
            setUpdateAvailable(true);
          }
        }
        return;
      }

      // 2) 런타임 중 서버 리비전이 변경된 경우 감지
      const currentStored = localStorage.getItem(APPLIED_REVISION_KEY) || initialRevisionRef.current;
      if (serverRevision !== currentStored) {
        const dismissedRev = sessionStorage.getItem(DISMISSED_REVISION_KEY);
        if (dismissedRev !== serverRevision) {
          setVersionInfo(data);
          setUpdateAvailable(true);
        }
      }
    } catch {
      // 오프라인이거나 일시적 네트워크 에러 시 무시
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // Service Worker 수명 주기 감지
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 서비스 워커 등록 상태 확인 및 대기 중인 워커 감지
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        setUpdateAvailable(true);
        setVersionInfo((prev) => prev || {
          title: { ko: '새로운 버전이 준비되었습니다!', en: 'A new version is ready!' },
          description: { ko: '지금 업데이트하여 최신 기능과 개선사항을 이용해보세요.', en: 'Update now to experience the latest improvements.' }
        });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            setVersionInfo((prev) => prev || {
              title: { ko: '새로운 버전이 준비되었습니다!', en: 'A new version is ready!' },
              description: { ko: '지금 업데이트하여 최신 기능과 개선사항을 이용해보세요.', en: 'Update now to experience the latest improvements.' }
            });
          }
        });
      });
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // 주기적 폴링 및 사용자 포커스/가시성 전환 시 자동 검사
  useEffect(() => {
    checkForUpdate();

    const timer = setInterval(() => {
      checkForUpdate();
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update?.()).catch(() => {});
      }
    }, CHECK_INTERVAL_MS);

    const handleFocus = () => checkForUpdate();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdate]);

  // 🌟 사용자가 "지금 업데이트" 클릭 시
  const applyUpdate = useCallback(async () => {
    setIsApplying(true);

    const targetRevision = latestRevisionRef.current || versionInfo?.revision || versionInfo?.bootTime;
    if (targetRevision) {
      try {
        // 최신 리비전을 적용된 버전으로 영구 저장 (새로고침 후 배너 재표시 방지)
        localStorage.setItem(APPLIED_REVISION_KEY, targetRevision);
        sessionStorage.setItem(DISMISSED_REVISION_KEY, targetRevision);
      } catch {}
    }

    try {
      // 1. Service Worker 캐시 스토리지 전체 정리
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }

      // 2. 대기 중인 Service Worker에 skipWaiting 전송
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch {
      // 무시하고 리로드 진행
    }

    // 3. 캐시 버스팅 새로고침
    setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_hn_update', String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    }, 250);
  }, [versionInfo]);

  // 사용자가 "나중에" / 닫기(✕) 클릭 시
  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    const key = latestRevisionRef.current || versionInfo?.revision || versionInfo?.bootTime || 'dismissed';
    try {
      sessionStorage.setItem(DISMISSED_REVISION_KEY, key);
    } catch {}
  }, [versionInfo]);

  return {
    updateAvailable: updateAvailable && !dismissed,
    versionInfo,
    isApplying,
    applyUpdate,
    dismissUpdate
  };
}
