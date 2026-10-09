// Hangul Now 빌드 버전 및 타임스탬프 정보
export const CLIENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';
export const CLIENT_BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
