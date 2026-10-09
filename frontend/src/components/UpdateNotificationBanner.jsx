import React from 'react';
import '../styles/updateBanner.css';

export default function UpdateNotificationBanner({
  lang = 'ko',
  versionInfo = null,
  isApplying = false,
  onApply,
  onDismiss
}) {
  const isKo = lang === 'ko';

  const title = (isKo ? versionInfo?.title?.ko : versionInfo?.title?.en) ||
    (isKo ? '새로운 업데이트가 배포되었습니다!' : 'A new update is available!');

  const desc = (isKo ? versionInfo?.description?.ko : versionInfo?.description?.en) ||
    (isKo ? '최신 기능과 성능 개선이 적용되었습니다.' : 'Latest features and performance improvements are ready.');

  const btnText = isApplying
    ? (isKo ? '적용 중…' : 'Updating…')
    : (isKo ? '지금 업데이트' : 'Update Now');

  return (
    <div className="hn-update-banner-wrapper" role="alert" aria-live="polite">
      <div className="hn-update-banner">
        <div className="hn-update-content">
          <div className="hn-update-icon-box">
            <span>✨</span>
            <span className="hn-update-pulse-ring" />
          </div>

          <div className="hn-update-text-col">
            <div className="hn-update-badge-row">
              <span className="hn-update-badge">
                {isKo ? '새 버전' : 'UPDATE'}
              </span>
              <span className="hn-update-title">{title}</span>
            </div>
            <span className="hn-update-desc">{desc}</span>
          </div>
        </div>

        <div className="hn-update-actions">
          <button
            type="button"
            className="hn-update-btn-refresh"
            onClick={onApply}
            disabled={isApplying}
            title={isKo ? '최신 버전으로 새로고침' : 'Refresh to the latest version'}
          >
            {isApplying ? <span className="hn-update-spinner" /> : <span>↻</span>}
            <span>{btnText}</span>
          </button>

          {!isApplying && (
            <button
              type="button"
              className="hn-update-btn-close"
              onClick={onDismiss}
              aria-label={isKo ? '닫기' : 'Close'}
              title={isKo ? '나중에 하기' : 'Dismiss'}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
