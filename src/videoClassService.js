// ============================================================
// Hangul Now 1:1 화상 한국어 수업 매칭 플랫폼 백엔드 서비스
// PRD 요구사항 (FR-001 ~ FR-004) 및 기술 명세 준수
// ============================================================

import express from 'express';
import { authenticateUser, authenticateOptionalUser } from './authMiddleware.js';
import { isEffectiveAdmin } from './adminPolicy.js';

// HangulNow Effective Admin 인가 가드 미들웨어
const requireEffectiveAdmin = (req, res, next) => {
  if (!req.user || !isEffectiveAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요한 서비스입니다.'
    });
  }
  next();
};

// HangulNow Booking Tutor 소유권 확인 로컬 헬퍼 함수
// (직접 tutorUid 일치 또는 등록된 튜터 프로필 매핑 기준)
function isBookingTutor(user, booking) {
  if (!user || !booking) return false;

  if (booking.tutorUid && booking.tutorUid === user.uid) {
    return true;
  }

  const tutorProfile = findTutorByUid(user.uid);
  return Boolean(tutorProfile && tutorProfile.id === booking.tutorId);
}

const router = express.Router();

// ------------------------------------------------------------
// 1. 유틸리티 함수: Google Meet 링크 생성 및 검증 규칙
// ------------------------------------------------------------
function generateMeetCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

export function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]{11}/i;
  const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com\/(video\/)?)\d+/i;
  const mp4Regex = /\.(mp4|webm|ogg)(\?.*)?$/i;
  return ytRegex.test(trimmed) || vimeoRegex.test(trimmed) || mp4Regex.test(trimmed);
}

// ------------------------------------------------------------
// 2. 초기 시드 데이터: 한국어 튜터 풀 및 초기 예약 데이터
// ------------------------------------------------------------
const INITIAL_TUTORS = [
  {
    id: 'jiwoo',
    tutorUid: null,
    email: 'jiwoo.kim@hangulnow.com',
    name: '김지우 (Jiwoo Kim)',
    shortIntro: '따뜻하고 편안한 분위기의 일상 한국어 회화 전문 튜터',
    bio: '안녕하세요! 한국어 표준어 원어민 튜터 김지우입니다. 서울에서 태어나 한국어 교육을 전공하였으며, 외국인 학습자들이 실제 한국인들이 친구나 동료와 나누는 자연스러운 한국어 억양과 실용 표현을 쉽고 재미있게 익힐 수 있도록 1:1 맞춤형 화상 수업을 이끌어 드립니다.',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // YouTube 소개 영상 링크
    embedVideoUrl: 'https://www.youtube.com/embed/kJQP7kiw5Fk',
    languages: ['한국어 (Native)', 'English (Fluent)', '日本語 (Basic)'],
    specialties: ['일상 회화', '자연스러운 억양 교정', 'K-드라마 대사 연습', '초중급 맞춤 피드백'],
    rating: 4.96,
    reviewCount: 142,
    lessonsCompleted: 380,
    pricePerSession: { min30: 19000, min50: 29000 },
    availableDays: ['월', '수', '금', '토'],
    timeSlotsKST: ['10:00', '11:00', '14:00', '15:00', '16:00', '19:00', '20:00', '21:00']
  },
  {
    id: 'minho',
    tutorUid: null,
    email: 'minho.park@hangulnow.com',
    name: '박민호 (Minho Park)',
    shortIntro: '비즈니스 한국어 및 직장 문화, 면접 대비 전문 튜터',
    bio: '반갑습니다! 한국 대기업 해외영업팀 7년 경력을 바탕으로 비즈니스 이메일, 회의 표현, 프레젠테이션, 한국 직장 내 존칭어 및 격식체 회화를 체계적으로 지도하는 박민호 튜터입니다. 실전 비즈니스 한국어가 필요한 학습자에게 최적화된 수업을 제공합니다.',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=2vjPBrBU-TM',
    embedVideoUrl: 'https://www.youtube.com/embed/2vjPBrBU-TM',
    languages: ['한국어 (Native)', 'English (Fluent)', '中文 (Business)'],
    specialties: ['비즈니스 한국어', '격식체 및 높임말', '한국 기업 인터뷰', '중고급 회화'],
    rating: 4.92,
    reviewCount: 98,
    lessonsCompleted: 260,
    pricePerSession: { min30: 22000, min50: 34000 },
    availableDays: ['화', '목', '토', '일'],
    timeSlotsKST: ['09:00', '13:00', '18:00', '19:00', '20:00', '22:00']
  },
  {
    id: 'seoyeon',
    tutorUid: null,
    email: 'seoyeon.lee@hangulnow.com',
    name: '이서연 (Seoyeon Lee)',
    shortIntro: 'TOPIK 전문 대비 및 정밀 문법·글쓰기 코칭 튜터',
    bio: '국어국문학 석사 및 한국어교원자격증 1급을 보유한 전문 강사 이서연입니다. TOPIK 1~6급 완벽 대비, 헷갈리기 쉬운 문법 어미 교정, 쓰기 논술 첨삭을 정밀하게 진행합니다. 탄탄한 기본기부터 고급 한국어 구사력까지 단계별로 확실하게 향상시켜 드립니다.',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    embedVideoUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
    languages: ['한국어 (Native)', 'English (Advanced)'],
    specialties: ['TOPIK I · II', '문법 교정', '쓰기 첨삭', '체계적 어휘 확장'],
    rating: 4.98,
    reviewCount: 215,
    lessonsCompleted: 520,
    pricePerSession: { min30: 20000, min50: 31000 },
    availableDays: ['월', '화', '목', '금', '일'],
    timeSlotsKST: ['11:00', '14:00', '16:00', '17:00', '20:00', '21:00']
  }
];

// 메모리 기반 튜터 및 예약 데이터베이스 (운영 중 영속 저장)
let tutors = [...INITIAL_TUTORS];

// 시드 예약 데이터 (수업 완료 상태 1건, 예정된 수업 1건)
const now = Date.now();
let bookings = [
  {
    id: 'booking_sample_01',
    tutorId: 'jiwoo',
    tutorName: '김지우 (Jiwoo Kim)',
    tutorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    studentName: 'Sarah Jenkins',
    studentEmail: 'sarah.j@gmail.com',
    slotTime: new Date(now - 3600000 * 2).toISOString(), // 2시간 전 완료된 수업
    duration: 50,
    clientTimezone: 'America/New_York',
    googleMeetUrl: 'https://meet.google.com/hng-know-live',
    status: 'COMPLETED',
    createdAt: new Date(now - 86400000).toISOString(),
    feedback: {
      tutor: {
        summary: '오늘 수업에서는 서울 홍대 및 연남동 카페에서 사용하는 실전 음료 주문과 디저트 추천 요청 회화를 진행했습니다.',
        keyExpressions: [
          '디카페인 원두로 변경할 수 있나요?',
          '여기서 마시고 갈게요 / 테이크아웃 해 주세요',
          '시그니처 메뉴가 어떤 거예요?',
          '영수증은 버려주세요'
        ],
        corrections: '-아서/어서 연결 어미 앞 과거형 었 사용 교정 (맛있었어서 → 맛있어서)',
        encouragement: 'Sarah님! 발음 억양이 한국인 원어민처럼 아주 부드러워지셨어요. 다음 수업도 파이팅입니다!',
        submittedAt: new Date(now - 3600000 * 1.5).toISOString()
      },
      student: {
        rating: 5,
        comment: '지우 튜터님과의 첫 화상 수업이었는데 긴장도 다 풀어주시고 실제 카페 표현을 콕콕 집어주셔서 정말 유익했어요!',
        recommend: true,
        submittedAt: new Date(now - 3600000).toISOString()
      }
    }
  },
  {
    id: 'booking_sample_02',
    tutorId: 'jiwoo',
    tutorName: '김지우 (Jiwoo Kim)',
    tutorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    studentName: 'Sarah Jenkins',
    studentEmail: 'sarah.j@gmail.com',
    slotTime: new Date(now + 1000 * 60 * 15).toISOString(), // 15분 후 시작 예정인 수업
    duration: 50,
    clientTimezone: 'America/New_York',
    googleMeetUrl: 'https://meet.google.com/hnw-kore-vcs',
    status: 'SCHEDULED',
    createdAt: new Date(now - 3600000 * 5).toISOString(),
    feedback: { tutor: null, student: null }
  }
];

// ------------------------------------------------------------
// 3. API 엔드포인트 구현 (PRD 5.2 API 명세 준수)
// ------------------------------------------------------------

// GET /api/v1/tutors: 튜터 목록 조회 (필터: 언어, 요일, 평점, 검색어)
router.get('/tutors', (req, res) => {
  try {
    const { language, day, minRating, q } = req.query;
    let list = [...tutors];

    if (language) {
      list = list.filter(t => t.languages.some(lang => lang.toLowerCase().includes(language.toLowerCase())));
    }
    if (day) {
      list = list.filter(t => t.availableDays.includes(day));
    }
    if (minRating) {
      const min = parseFloat(minRating);
      if (!isNaN(min)) list = list.filter(t => t.rating >= min);
    }
    if (q) {
      const query = q.toLowerCase();
      list = list.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.shortIntro.toLowerCase().includes(query) ||
        t.specialties.some(s => s.toLowerCase().includes(query))
      );
    }

    res.json({
      success: true,
      count: list.length,
      tutors: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/tutors/profile: 튜터 프로필 및 소개 영상 등록/수정
router.post('/tutors/profile', (req, res) => {
  try {
    const {
      id,
      tutorUid,
      email,
      name,
      shortIntro,
      bio,
      videoUrl,
      specialties,
      languages,
      pricePerSession,
      availableDays,
      timeSlotsKST
    } = req.body;

    // 검증 규칙 1: 소개 텍스트는 최소 50자 이상 필수
    if (!bio || bio.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '소개 텍스트는 영문/한국어 지원 및 신뢰도 확보를 위해 최소 50자 이상 입력해야 합니다.'
      });
    }

    // 검증 규칙 2: 영상 URL 등록 시 Embed 지원 도메인 형식 검증
    if (videoUrl && !isValidVideoUrl(videoUrl)) {
      return res.status(400).json({
        success: false,
        error: '유효한 YouTube, Vimeo 또는 MP4 영상 링크 형식을 입력해 주세요.'
      });
    }

    // Embed URL 변환
    let embedVideoUrl = videoUrl;
    if (videoUrl && videoUrl.includes('youtube.com/watch?v=')) {
      const videoId = videoUrl.split('watch?v=')[1]?.split('&')[0];
      embedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl && videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      embedVideoUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    const tutorId = id || `tutor_${Date.now()}`;
    const existingIndex = tutors.findIndex(t => t.id === tutorId);

    // Tutor Identity Trust Boundary:
    // 관리자(req.adminUser)가 프로필을 등록/수정하더라도 관리자의 Firebase UID를 튜터 UID로 자동 fallback하지 않음.
    // 명시적으로 전달된 candidate UID가 있는 경우에만 수용하며, 기존 튜터의 경우 기존 tutorUid를 안전하게 보존함.
    let resolvedTutorUid = null;
    if (typeof tutorUid === 'string' && tutorUid.trim().length > 0) {
      resolvedTutorUid = tutorUid.trim();
    } else if (existingIndex >= 0 && tutors[existingIndex].tutorUid) {
      resolvedTutorUid = tutors[existingIndex].tutorUid;
    }

    let resolvedEmail = null;
    if (typeof email === 'string' && email.trim().length > 0) {
      resolvedEmail = email.trim();
    } else if (existingIndex >= 0 && tutors[existingIndex].email) {
      resolvedEmail = tutors[existingIndex].email;
    }

    const tutorObj = {
      id: tutorId,
      tutorUid: resolvedTutorUid,
      email: resolvedEmail,
      name: name || '새 한국어 튜터',
      shortIntro: shortIntro || '1:1 맞춤형 한국어 화상 수업 전문 튜터',
      bio: bio.trim(),
      photoURL: req.body.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      videoUrl: videoUrl || 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      embedVideoUrl: embedVideoUrl || 'https://www.youtube.com/embed/kJQP7kiw5Fk',
      languages: Array.isArray(languages) && languages.length > 0 ? languages : ['한국어 (Native)', 'English'],
      specialties: Array.isArray(specialties) && specialties.length > 0 ? specialties : ['일상 회화', '발음 교정'],
      rating: 5.0,
      reviewCount: 0,
      lessonsCompleted: 0,
      pricePerSession: pricePerSession || { min30: 20000, min50: 30000 },
      availableDays: Array.isArray(availableDays) && availableDays.length > 0 ? availableDays : ['월', '수', '금'],
      timeSlotsKST: Array.isArray(timeSlotsKST) && timeSlotsKST.length > 0 ? timeSlotsKST : ['10:00', '14:00', '19:00', '20:00']
    };

    if (existingIndex >= 0) {
      tutors[existingIndex] = { ...tutors[existingIndex], ...tutorObj };
    } else {
      tutors.unshift(tutorObj);
    }

    res.json({
      success: true,
      message: '튜터 프로필이 성공적으로 저장되었습니다.',
      tutor: tutorObj
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/tutors/:id/slots: 튜터별 예약 가능 시간 슬롯 조회 (타임존 적용)
router.get('/tutors/:id/slots', (req, res) => {
  try {
    const { id } = req.params;
    const { date, timezone = 'Asia/Seoul' } = req.query;

    const tutor = tutors.find(t => t.id === id);
    if (!tutor) {
      return res.status(404).json({ success: false, error: '튜터를 찾을 수 없습니다.' });
    }

    // 대상 날짜 (기본: 오늘 또는 내일)
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // 해당 날짜의 튜터 슬롯 생성
    const slots = tutor.timeSlotsKST.map(kstTime => {
      const slotIso = `${dateStr}T${kstTime}:00+09:00`;
      const slotUtc = new Date(slotIso);

      // 이미 예약된 슬롯인지 확인 (이중 예약 잠금 체크)
      const isBooked = bookings.some(b => 
        b.tutorId === id && 
        b.status !== 'CANCELLED' && 
        new Date(b.slotTime).getTime() === slotUtc.getTime()
      );

      // 클라이언트 타임존 표기 변환
      let clientFormattedTime = kstTime;
      try {
        clientFormattedTime = new Intl.DateTimeFormat('ko-KR', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(slotUtc);
      } catch (e) {
        clientFormattedTime = kstTime;
      }

      return {
        kstTime,
        clientFormattedTime,
        slotTime: slotUtc.toISOString(),
        isBooked,
        available: !isBooked
      };
    });

    res.json({
      success: true,
      tutorId: id,
      tutorName: tutor.name,
      targetDate: dateStr,
      clientTimezone: timezone,
      slots
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/bookings: 수업 예약 신청 및 Google Meet 세션 생성 트리거
router.post('/bookings', authenticateOptionalUser, (req, res) => {
  try {
    const { tutorId, slotTime, duration = 50, studentName, studentEmail, timezone = 'Asia/Seoul', note = '' } = req.body;

    if (!tutorId || !slotTime) {
      return res.status(400).json({ success: false, error: '튜터 ID와 예약 시간(slotTime)은 필수입니다.' });
    }

    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) {
      return res.status(404).json({ success: false, error: '선택한 튜터를 찾을 수 없습니다.' });
    }

    const requestTimeMs = new Date(slotTime).getTime();

    // 검증 규칙 2: 동일 시간 슬롯에 대해 이중 예약(Double-booking) 방지 잠금(Locking)
    const isAlreadyBooked = bookings.some(b => 
      b.tutorId === tutorId && 
      b.status !== 'CANCELLED' && 
      new Date(b.slotTime).getTime() === requestTimeMs
    );

    if (isAlreadyBooked) {
      return res.status(409).json({
        success: false,
        error: '선택하신 시간 슬롯은 이미 예약이 완료되었습니다. 다른 시간을 선택해 주세요.'
      });
    }

    // Google Calendar API 연동 모의 -> Google Meet 회의 링크 자동 발급
    const meetCode = generateMeetCode();
    const googleMeetUrl = `https://meet.google.com/${meetCode}`;

    const newBooking = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tutorId,
      tutorUid: tutor.tutorUid || null,
      tutorName: tutor.name,
      tutorPhoto: tutor.photoURL,
      studentName: studentName || '학습자 (Learner)',
      studentEmail: studentEmail || 'learner@hangulnow.com',
      // Note: Firebase ID token 인증이 확인된 경우 req.user.uid를 사용하며, Guest 예약의 경우 null 설정 (임의의 body.studentUid는 신뢰하지 않음)
      studentUid: req.user?.uid || null,
      slotTime: new Date(slotTime).toISOString(),
      duration: Number(duration) || 50,
      clientTimezone: timezone,
      googleMeetUrl,
      note,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
      feedback: {
        tutor: null,
        student: null
      }
    };

    bookings.unshift(newBooking);

    res.status(201).json({
      success: true,
      message: '1:1 화상 수업이 성공적으로 예약되었으며 Google Meet 링크가 자동 발급되었습니다.',
      booking: newBooking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/bookings: 수업 예약 목록 조회 (Effective Admin 전용)
router.get('/bookings', authenticateUser, requireEffectiveAdmin, (req, res) => {
  try {
    const { studentEmail, tutorId, status } = req.query;
    let list = [...bookings];

    if (studentEmail) list = list.filter(b => b.studentEmail === studentEmail);
    if (tutorId) list = list.filter(b => b.tutorId === tutorId);
    if (status) list = list.filter(b => b.status === status);

    res.json({
      success: true,
      count: list.length,
      bookings: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/bookings/:id: 예약 상세 정보 및 Meet 링크 조회 (Participant or Admin 전용)
router.get('/bookings/:id', authenticateUser, (req, res) => {
  try {
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    // 1. 관리자 권한 확인 (Single source: isEffectiveAdmin)
    const isAdmin = isEffectiveAdmin(req.user);

    // 2. 예약 학생 소유권 확인 (verified studentUid 기준)
    const isStudent = Boolean(booking.studentUid) && booking.studentUid === req.user.uid;

    // 3. 예약 튜터 소유권 확인 (로컬 헬퍼 함수 isBookingTutor 활용)
    const isTutor = isBookingTutor(req.user, booking);

    // 권한이 없는 경우 리소스 존재 여부 노출을 방지하기 위해 404 Not Found 반환
    if (!isAdmin && !isStudent && !isTutor) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/bookings/:id/status: 수업 세션 상태 변경 (Tutor or Admin 전용, State Machine 적용)
router.post('/bookings/:id/status', authenticateUser, (req, res) => {
  try {
    const { status } = req.body;
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    // 1. 관리자 및 담당 튜터 인가 검증 (Student, Guest, 비참여자는 404 은닉 차단)
    const isAdmin = isEffectiveAdmin(req.user);
    const isTutor = isBookingTutor(req.user, booking);

    if (!isAdmin && !isTutor) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    // 2. 요청 상태값 Enum 검증
    if (!['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 상태값입니다.' });
    }

    // 3. 동일 상태 전이 (Idempotent 200 반환)
    if (booking.status === status) {
      return res.json({
        success: true,
        message: `수업 상태가 ${status}(으)로 유지되었습니다.`,
        booking
      });
    }

    // 4. State Machine 상태 전이 유효성 검증
    const VALID_STATUS_TRANSITIONS = {
      SCHEDULED: new Set(['LIVE', 'CANCELLED']),
      LIVE: new Set(['COMPLETED', 'CANCELLED']),
      COMPLETED: new Set(),
      CANCELLED: new Set()
    };

    if (!VALID_STATUS_TRANSITIONS[booking.status] || !VALID_STATUS_TRANSITIONS[booking.status].has(status)) {
      return res.status(400).json({
        success: false,
        error: '현재 상태에서는 요청하신 상태로 변경할 수 없습니다.'
      });
    }

    booking.status = status;
    res.json({ success: true, message: `수업 상태가 ${status}(으)로 변경되었습니다.`, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/bookings/:id/feedback/tutor: 튜터 전용 학습 리포트 피드백 등록 (Tutor or Admin 전용)
router.post('/bookings/:id/feedback/tutor', authenticateUser, (req, res) => {
  try {
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    // 1. 관리자 및 담당 튜터 인가 검증 (Student, Guest, 비참여자는 404 은닉 차단)
    const isAdmin = isEffectiveAdmin(req.user);
    const isTutor = isBookingTutor(req.user, booking);

    if (!isAdmin && !isTutor) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    // 2. 수업 종료 상태(COMPLETED) 세션에 대해서만 피드백 등록/수정 가능
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: '수업이 종료(COMPLETED)된 이후에만 학습 리포트를 등록할 수 있습니다.'
      });
    }

    // 3. Payload 필드별 타입 검증 및 무결성 보장 (Mass Assignment 방지)
    const { summary, keyExpressions, corrections, encouragement } = req.body;

    if (typeof summary !== 'string' || summary.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '수업 요약은 필수 입력 항목입니다.'
      });
    }

    if (typeof corrections !== 'string' || corrections.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '발음/문법 교정 노트는 필수 입력 항목입니다.'
      });
    }

    let resolvedKeyExpressions = [];
    if (keyExpressions !== undefined && keyExpressions !== null) {
      if (Array.isArray(keyExpressions)) {
        for (const item of keyExpressions) {
          if (typeof item !== 'string') {
            return res.status(400).json({
              success: false,
              error: '주요 표현 목록의 항목은 문자열이어야 합니다.'
            });
          }
        }
        resolvedKeyExpressions = keyExpressions
          .map(item => item.trim())
          .filter(item => item.length > 0);
      } else if (typeof keyExpressions === 'string') {
        const trimmed = keyExpressions.trim();
        resolvedKeyExpressions = trimmed.length > 0 ? [trimmed] : [];
      } else {
        return res.status(400).json({
          success: false,
          error: '주요 표현 항목은 문자열 또는 문자열 배열이어야 합니다.'
        });
      }
    }

    let resolvedEncouragement = '수고 많으셨습니다!';
    if (encouragement !== undefined && encouragement !== null) {
      if (typeof encouragement !== 'string') {
        return res.status(400).json({
          success: false,
          error: '격려의 한마디는 문자열이어야 합니다.'
        });
      }
      const trimmedEnc = encouragement.trim();
      if (trimmedEnc.length > 0) {
        resolvedEncouragement = trimmedEnc;
      }
    }

    // 4. Feedback 구조 초기화 및 튜터 리포트 저장/갱신
    if (!booking.feedback) {
      booking.feedback = { tutor: null, student: null };
    }

    booking.feedback.tutor = {
      summary: summary.trim(),
      keyExpressions: resolvedKeyExpressions,
      corrections: corrections.trim(),
      encouragement: resolvedEncouragement,
      submittedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '튜터 전용 학습 리포트가 성공적으로 등록되었습니다.',
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/bookings/:id/feedback/student: 학생 전용 튜터 리뷰/별점 등록
router.post('/bookings/:id/feedback/student', (req, res) => {
  try {
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: '예약 내역을 찾을 수 없습니다.' });
    }

    // 검증 규칙 3: 수업 종료 상태(COMPLETED) 세션에 대해서만 리뷰 등록 가능
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: '수업이 종료(COMPLETED)된 이후에만 리뷰를 작성할 수 있습니다.'
      });
    }

    const { rating, comment, recommend = true } = req.body;
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        error: '별점은 1점부터 5점 사이로 선택해야 합니다.'
      });
    }

    booking.feedback.student = {
      rating: numRating,
      comment: comment ? comment.trim() : '',
      recommend: !!recommend,
      submittedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '수업 리뷰가 성공적으로 등록되었습니다.',
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------------------------
// 4. 튜터 식별 및 소유권 확인 헬퍼 함수
// (주의: 메모리에 등록된 tutorUid 일치 여부를 조회하는 헬퍼이며,
//  Firebase Auth 상의 실제 계정 유효성 검증은 호출 측 토큰 검증 단계에 의존함)
// ------------------------------------------------------------
export function findTutorByUid(uid) {
  if (!uid) return null;
  return tutors.find(t => t.tutorUid === uid) || null;
}

export function findTutorById(id) {
  if (!id) return null;
  return tutors.find(t => t.id === id) || null;
}

export default router;
