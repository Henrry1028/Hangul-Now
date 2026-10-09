import { useEffect, useRef, useState, useCallback } from 'react';
import { CLIENT_VERSION, CLIENT_BUILD_TIME } from '../version.js';

const CHECK_INTERVAL_MS = 60 * 1000; // 60초 주기
const DISMISSED_KEY = 'hn_update_dismissed_revision';

export default function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const initialServerInfoRef = useRef(null);
  const checkingRef = useRef(false);

  // 서버 최신 버전 검사 함수
  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      // 캐시 방지 쿼리 파라미터 부착
      const response = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (!response.ok) return;

      const data = await response.json();
      if (!data || data.status !== 'ok') return;

      const serverRevision = String(data.revision || '');
      const serverBootTime = String(data.bootTime || '');

      // 최초 실행 시 서버 기준점 기록
      if (!initialServerInfoRef.current) {
        initialServerInfoRef.current = {
          revision: serverRevision,
          bootTime: serverBootTime
        };

        // 로컬 클라이언트 빌드 타임스탬프와 서버 부트 시각 비교 (새 배포 여부)
        const clientTime = new Date(CLIENT_BUILD_TIME).getTime();
        const serverTime = new Date(serverBootTime).getTime();
        if (serverTime > 0 && clientTime > 0 && (serverTime - clientTime) > 15000) {
          // 서버가 클라이언트 번들 빌드 이후에 새로 시작된 경우
          const lastDismissed = sessionStorage.getItem(DISMISSED_KEY);
          if (lastDismissed !== serverRevision && lastDismissed !== serverBootTime) {
            setVersionInfo(data);
            setUpdateAvailable(true);
          }
        }
        return;
      }

      // 런타임 중 서버가 재배포되었거나 새 리비전으로 갱신된 경우 감지
      const init = initialServerInfoRef.current;
      const revisionChanged = serverRevision && init.revision && serverRevision !== init.revision;
      const bootTimeChanged = serverBootTime && init.bootTime && serverBootTime !== init.bootTime;

      if (revisionChanged || bootTimeChanged) {
        const lastDismissed = sessionStorage.getItem(DISMISSED_KEY);
        const currentKey = serverRevision || serverBootTime;
        if (lastDismissed !== currentKey) {
          setVersionInfo(data);
          setUpdateAvailable(true);
        }
      }
    } catch (err) {
      // 오프라인이거나 네트워크 일시 장애 시 무시
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
    // 1. 마운트 시 최초 즉시 검사
    checkForUpdate();

    // 2. 주기적 백그라운드 폴링
    const timer = setInterval(() => {
      checkForUpdate();
      // Service worker 업데이트도 수동 트리거
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update?.()).catch(() => {});
      }
    }, CHECK_INTERVAL_MS);

    // 3. 앱으로 복귀했을 때 (스마트폰 앱 전환, 탭 활성화 등)
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

  // 사용자가 "지금 업데이트" 클릭 시 동작
  const applyUpdate = useCallback(async () => {
    setIsApplying(true);

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
    } catch (e) {
      // 캐시 정리 실패하더라도 리로드 진행
    }

    // 3. 강력한 캐시 버스팅 리로드
    setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_hn_update', String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    }, 250);
  }, []);

  // 사용자가 "나중에" / 닫기 클릭 시
  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    const key = versionInfo?.revision || versionInfo?.bootTime || 'dismissed';
    try {
      sessionStorage.setItem(DISMISSED_KEY, key);
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
