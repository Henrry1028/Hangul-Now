import { useCallback, useMemo, useRef, useState } from 'react';
import { authClient } from '../data/authClient.js';

// Legacy 1:1 Video Class controller (preview/index.html 4216-4636). Admin-only preview:
// `isAdminFlag` is the server-verified admin status (GET /api/admin/status) for the signed-in
// user, so general users can never reach it. All data endpoints are still server-protected.
const todayIso = () => new Date().toISOString().split('T')[0];

const createInitialState = () => ({
  vcTab: 'tutors',
  vcTutors: [],
  vcBookings: [],
  vcLoading: false,
  vcEffectiveAdmin: false,
  vcSelectedTutor: null,
  vcArrangeModalOpen: false,
  vcVideoModalOpen: false,
  vcPlayingVideoUrl: '',
  vcPlayingVideoTitle: '',
  vcSelectedDuration: 50,
  vcSelectedDate: todayIso(),
  vcSelectedSlot: null,
  vcTutorSlots: [],
  vcSlotsLoading: false,
  vcStudentName: 'Sarah Jenkins',
  vcStudentEmail: 'sarah.j@gmail.com',
  vcTimezone: (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Seoul',
  vcBookingNote: '',
  vcActiveFeedbackBooking: null,
  vcFeedbackTutorModalOpen: false,
  vcFeedbackStudentModalOpen: false,
  vcFeedbackViewModalOpen: false,
  vcTutorFbSummary: '',
  vcTutorFbKeyExp1: '',
  vcTutorFbKeyExp2: '',
  vcTutorFbKeyExp3: '',
  vcTutorFbCorrections: '',
  vcTutorFbEncouragement: '',
  vcStudentFbRating: 5,
  vcStudentFbComment: '',
  vcStudentFbRecommend: true,
  vcAdminTutorName: '',
  vcAdminTutorShort: '',
  vcAdminTutorBio: '',
  vcAdminTutorVideo: '',
  vcAdminTutorUid: '',
  vcAdminTutorSpecialties: '일상 회화, 발음 교정, K-드라마',
  vcAdminTutorLanguages: '한국어 (Native), English (Fluent)'
});

// 로그인한 사용자(토큰을 꺼낼 수 있는 객체) 또는 null — 로그인 방식(Firebase/Supabase)과 무관하다
const firebaseUser = () => authClient.currentUser();

export default function useVideoClass({ isAdminFlag, currentUser }) {
  const [state, setState] = useState(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const update = useCallback((patch) => setState((prev) => ({ ...prev, ...patch })), []);

  const access = Boolean(isAdminFlag && currentUser?.uid);

  const controller = useMemo(() => {
    const loadVideoClassData = async () => {
      update({ vcLoading: true });
      try {
        let token = '';
        const authUser = firebaseUser();
        if (authUser) {
          token = await authUser.getIdToken();
          if (!token) {
            console.warn('[VideoClass] Failed to retrieve ID token for authenticated user. Aborting booking request.');
            update({ vcLoading: false });
            return;
          }
        }
        let isEffectiveAdmin = false;
        const fetchBookings = async () => {
          if (!token) return { success: false, bookings: [] };
          const headers = { Authorization: `Bearer ${token}` };
          const res = await fetch('/api/v1/bookings', { headers }).catch(() => null);
          if (res && res.status === 200) {
            isEffectiveAdmin = true;
            return res.json().catch(() => null);
          }
          if (res && res.status === 403) {
            isEffectiveAdmin = false;
            const fallbackRes = await fetch('/api/v1/my-bookings', { headers }).catch(() => null);
            return fallbackRes ? fallbackRes.json().catch(() => null) : null;
          }
          return res ? res.json().catch(() => null) : null;
        };
        const [tutorsRes, bookingsRes] = await Promise.all([
          fetch('/api/v1/tutors').then((r) => r.json()).catch(() => null),
          fetchBookings()
        ]);
        const patch = { vcLoading: false, vcEffectiveAdmin: isEffectiveAdmin };
        if (tutorsRes && tutorsRes.success) patch.vcTutors = tutorsRes.tutors;
        if (bookingsRes && bookingsRes.success) patch.vcBookings = bookingsRes.bookings;
        update(patch);
      } catch (err) {
        console.warn('[VideoClass] load error:', err);
        update({ vcLoading: false });
      }
    };

    const loadTutorSlots = async (tutorId, dateStr) => {
      update({ vcSlotsLoading: true });
      try {
        const tz = stateRef.current.vcTimezone || 'Asia/Seoul';
        const res = await fetch(`/api/v1/tutors/${tutorId}/slots?date=${dateStr}&timezone=${encodeURIComponent(tz)}`);
        const data = await res.json();
        if (data && data.success) update({ vcTutorSlots: data.slots || [], vcSlotsLoading: false });
        else update({ vcSlotsLoading: false });
      } catch {
        update({ vcSlotsLoading: false });
      }
    };

    const openVideoModal = (tutor) => update({
      vcVideoModalOpen: true,
      vcPlayingVideoUrl: tutor.embedVideoUrl || tutor.videoUrl,
      vcPlayingVideoTitle: tutor.name
    });

    const openArrangeModal = (tutor) => {
      const todayStr = todayIso();
      update({ vcSelectedTutor: tutor, vcArrangeModalOpen: true, vcSelectedSlot: null, vcSelectedDate: todayStr, vcSlotsLoading: true });
      loadTutorSlots(tutor.id, todayStr);
    };

    const tokenOrAlert = async (user, message) => {
      try {
        return await user.getIdToken();
      } catch (tokenErr) {
        console.error(message, tokenErr);
        return null;
      }
    };

    const submitBooking = async () => {
      const s = stateRef.current;
      if (!s.vcSelectedTutor || !s.vcSelectedSlot) {
        window.alert('예약하실 시간 슬롯을 선택해 주세요.');
        return;
      }
      try {
        const headers = { 'Content-Type': 'application/json' };
        const user = firebaseUser();
        if (user) {
          const token = await tokenOrAlert(user, '[VideoClass] Failed to retrieve auth token:');
          if (!token) {
            window.alert('로그인 인증 토큰을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            return;
          }
          headers.Authorization = `Bearer ${token}`;
        }
        const appUser = userRef.current;
        const res = await fetch('/api/v1/bookings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tutorId: s.vcSelectedTutor.id,
            slotTime: s.vcSelectedSlot.slotTime,
            duration: s.vcSelectedDuration,
            studentName: (appUser && appUser.displayName) || s.vcStudentName || 'Sarah Jenkins',
            studentEmail: (appUser && appUser.email) || s.vcStudentEmail || 'sarah.j@gmail.com',
            timezone: s.vcTimezone,
            note: s.vcBookingNote
          })
        });
        const data = await res.json();
        if (data && data.success) {
          window.alert('🎉 1:1 화상 수업 예약이 완료되었습니다!\nGoogle Meet 링크가 자동 발급되었습니다.');
          update({ vcArrangeModalOpen: false, vcTab: 'mySessions' });
          loadVideoClassData();
        } else {
          window.alert(data.error || '예약 처리에 실패했습니다.');
        }
      } catch {
        window.alert('서버 통신 오류가 발생했습니다.');
      }
    };

    const simulateBookingStatus = async (bookingId, nextStatus) => {
      try {
        const user = firebaseUser();
        if (!user) {
          window.alert('수업 상태를 변경하려면 로그인이 필요합니다.');
          return;
        }
        const token = await tokenOrAlert(user, '[VideoClass] Failed to retrieve auth token:');
        if (!token) {
          window.alert('인증 토큰을 가져오지 못했습니다. 다시 시도해 주세요.');
          return;
        }
        const res = await fetch(`/api/v1/bookings/${bookingId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: nextStatus })
        });
        const data = await res.json();
        if (data && data.success) loadVideoClassData();
        else window.alert(data.error || '상태 변경에 실패했습니다.');
      } catch (e) {
        console.warn('Status simulation error:', e);
        window.alert('서버 통신 오류가 발생했습니다.');
      }
    };

    const openFeedbackModal = (booking, type) => {
      if (type === 'tutor') {
        update({
          vcActiveFeedbackBooking: booking,
          vcFeedbackTutorModalOpen: true,
          vcTutorFbSummary: booking.feedback?.tutor?.summary || '',
          vcTutorFbKeyExp1: booking.feedback?.tutor?.keyExpressions?.[0] || '',
          vcTutorFbKeyExp2: booking.feedback?.tutor?.keyExpressions?.[1] || '',
          vcTutorFbKeyExp3: booking.feedback?.tutor?.keyExpressions?.[2] || '',
          vcTutorFbCorrections: booking.feedback?.tutor?.corrections || '',
          vcTutorFbEncouragement: booking.feedback?.tutor?.encouragement || ''
        });
      } else if (type === 'student') {
        update({
          vcActiveFeedbackBooking: booking,
          vcFeedbackStudentModalOpen: true,
          vcStudentFbRating: booking.feedback?.student?.rating || 5,
          vcStudentFbComment: booking.feedback?.student?.comment || '',
          vcStudentFbRecommend: booking.feedback?.student?.recommend ?? true
        });
      } else if (type === 'view') {
        update({ vcActiveFeedbackBooking: booking, vcFeedbackViewModalOpen: true });
      }
    };

    const submitTutorFeedback = async () => {
      const s = stateRef.current;
      if (!s.vcActiveFeedbackBooking) return;
      if (!s.vcTutorFbSummary || !s.vcTutorFbCorrections) {
        window.alert('수업 요약과 교정 노트를 작성해 주세요.');
        return;
      }
      const user = firebaseUser();
      if (!user) {
        window.alert('튜터 학습 리포트를 등록하려면 로그인이 필요합니다.');
        return;
      }
      const token = await tokenOrAlert(user, '[VideoClass] Failed to retrieve auth token for tutor feedback:');
      if (!token) {
        window.alert('인증 토큰을 가져오지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      const keyExpressions = [s.vcTutorFbKeyExp1, s.vcTutorFbKeyExp2, s.vcTutorFbKeyExp3].filter(Boolean);
      try {
        const res = await fetch(`/api/v1/bookings/${s.vcActiveFeedbackBooking.id}/feedback/tutor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ summary: s.vcTutorFbSummary, keyExpressions, corrections: s.vcTutorFbCorrections, encouragement: s.vcTutorFbEncouragement })
        });
        const data = await res.json();
        if (data && data.success) {
          window.alert('튜터 학습 리포트가 성공적으로 등록되었습니다.');
          update({ vcFeedbackTutorModalOpen: false });
          loadVideoClassData();
        } else {
          window.alert(data.error || '리포트 등록 실패');
        }
      } catch {
        window.alert('서버 통신 오류');
      }
    };

    const submitStudentFeedback = async () => {
      const s = stateRef.current;
      if (!s.vcActiveFeedbackBooking) return;
      const user = firebaseUser();
      if (!user) {
        window.alert('수업 리뷰를 등록하려면 로그인이 필요합니다.');
        return;
      }
      const token = await tokenOrAlert(user, '[VideoClass] Failed to retrieve auth token for student feedback:');
      if (!token) {
        window.alert('인증 토큰을 가져오지 못했습니다. 다시 시도해 주세요.');
        return;
      }
      try {
        const res = await fetch(`/api/v1/bookings/${s.vcActiveFeedbackBooking.id}/feedback/student`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ rating: s.vcStudentFbRating, comment: s.vcStudentFbComment, recommend: s.vcStudentFbRecommend })
        });
        const data = await res.json();
        if (data && data.success) {
          window.alert('수업 리뷰가 등록되었습니다. 감사합니다!');
          update({ vcFeedbackStudentModalOpen: false });
          loadVideoClassData();
        } else {
          window.alert(data.error || '리뷰 등록 실패');
        }
      } catch {
        window.alert('서버 통신 오류');
      }
    };

    const submitTutorProfile = async () => {
      const s = stateRef.current;
      if (!s.vcAdminTutorBio || s.vcAdminTutorBio.trim().length < 50) {
        window.alert(`소개 텍스트는 최소 50자 이상이어야 합니다 (현재 ${s.vcAdminTutorBio ? s.vcAdminTutorBio.trim().length : 0}자)`);
        return;
      }
      try {
        let token = '';
        const user = firebaseUser();
        if (user) token = await user.getIdToken();
        const res = await fetch('/api/v1/tutors/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            name: s.vcAdminTutorName || '새 튜터',
            shortIntro: s.vcAdminTutorShort,
            bio: s.vcAdminTutorBio,
            videoUrl: s.vcAdminTutorVideo,
            specialties: s.vcAdminTutorSpecialties.split(',').map((x) => x.trim()).filter(Boolean),
            languages: s.vcAdminTutorLanguages.split(',').map((x) => x.trim()).filter(Boolean),
            ...(s.vcAdminTutorUid && s.vcAdminTutorUid.trim() ? { tutorUid: s.vcAdminTutorUid.trim() } : {})
          })
        });
        const data = await res.json();
        if (data && data.success) {
          window.alert('튜터 프로필이 성공적으로 저장되었습니다!');
          update({ vcAdminTutorName: '', vcAdminTutorShort: '', vcAdminTutorBio: '', vcAdminTutorVideo: '', vcAdminTutorUid: '', vcTab: 'tutors' });
          loadVideoClassData();
        } else {
          window.alert(data.error || '프로필 저장 실패');
        }
      } catch {
        window.alert('서버 통신 오류');
      }
    };

    return {
      update,
      loadVideoClassData,
      loadTutorSlots,
      openVideoModal,
      closeVideoModal: () => update({ vcVideoModalOpen: false, vcPlayingVideoUrl: '' }),
      openArrangeModal,
      closeArrangeModal: () => update({ vcArrangeModalOpen: false, vcSelectedTutor: null, vcSelectedSlot: null }),
      submitBooking,
      simulateBookingStatus,
      openFeedbackModal,
      submitTutorFeedback,
      submitStudentFeedback,
      submitTutorProfile,
      setTab: (tab) => { update({ vcTab: tab }); loadVideoClassData(); }
    };
  }, [update]);

  return { state, access, ...controller };
}
