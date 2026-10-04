// 로그인 상태면 Firebase ID 토큰을 Authorization 헤더로 붙인다.
// 서버는 이 토큰으로만 사용자를 식별한다 (body/query의 userId는 신뢰하지 않음).
// 비로그인이거나 토큰을 얻지 못하면 빈 객체를 돌려 게스트 요청으로 처리된다.
export async function authHeaders() {
  try {
    const firebase = window.firebase;
    const user = firebase && firebase.auth ? firebase.auth().currentUser : null;
    if (!user) return {};
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
