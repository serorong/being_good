export type Role = 'student' | 'teacher'

export type TitleColor = 'gold' | 'blue' | 'green' | 'rose'

export type DailyTaskKey =
  | 'presentation'
  | 'attitude'
  | 'cleaning'
  | 'homework'
  | 'kindWords'
  | 'lunch'
  | 'diary'

export interface AuthState {
  role: Role
  studentId?: string
  teacherName?: string
  teacherEmail?: string           // 교사 구글 로그인 이메일 (서버 검증과 동기)
}

/** 학생 입장 신청 — /join_requests/{email} 문서. 교사 승인 시 매핑이 확정된다. */
export interface JoinRequest {
  email: string                  // 소문자 학교 구글 이메일 (= 문서 ID)
  studentId: string              // 신청한 학생 자리 (예: god01)
  studentName: string            // 신청 시점의 명단 이름 (교사 확인용 snapshot)
  displayName: string            // 구글 계정 표시 이름 (교사 확인용)
  requestedAt: string            // ISO
}

export interface Student {
  id: string
  heroName: string
  realName: string
  avatarSeed: string
  title: string                  // 기본 호칭(아직 호칭 부여 전 표시용)
  titleColor?: TitleColor
  cookies: number                // 기본 쿠키(state에 override 없을 때 사용)
  todayScore: number             // 데모용 표시값
  streak: number
  level: number
  missionsDone: number
}

export interface DailyTaskDef {
  key: DailyTaskKey
  label: string
  description: string
  maxScore: number
  icon: string
}

export interface Notice {
  id: string
  postedAt: string               // ISO
  title: string
  body: string
  author: string
}

export interface Offering {
  id: string
  postedAt: string               // ISO
  title: string
  body: string
  link?: string                  // 유니티 빌드 / 외부 게임 링크
  author: string
}

export interface CustomTitle {
  id: string
  name: string
  description: string
  color: TitleColor
  icon: string
}

export interface ShopItem {
  id: string
  name: string
  price: number
  icon: string                   // emoji
  kind: '머리' | '의상' | '소품' | '배경' | '소모품'
  description?: string
}

export interface MissionRecord {
  date: string                   // YYYY-MM-DD
  scores: Partial<Record<DailyTaskKey, number>>
  redeemed?: boolean
}

export interface SanctuaryPlacement {
  instanceId: string
  itemId: string
  x: number
  y: number
}

export interface DiaryEntry {
  date: string                   // YYYY-MM-DD
  situation: string
  emotion: string                // legacy — 단일 감정 (구버전 호환)
  emotions?: string[]            // 최대 4개 감정
  reason: string
  updatedAt: string              // ISO
  teacherFeedback?: string
  feedbackAt?: string            // ISO
  read?: boolean                 // 교사가 열람(읽음)했는지
  beadKey?: string               // 저장 시 1회 랜덤 선정한 감정 중분류 키 (마음구슬 1개)
}

export interface EmotionGroup {
  name: string                   // 예: '기쁨'
  words: string[]
}

export interface EmotionForest {
  positive: EmotionGroup[]
  negative: EmotionGroup[]
}

export type AgoraVisibility = 'public' | 'teacher'

export interface AgoraTopic {
  id: string
  title: string
  description?: string
  createdAt: string              // ISO
  active: boolean
  padletUrl?: string             // 토픽을 클릭하면 새 탭으로 열릴 Padlet 링크
  visibility?: AgoraVisibility   // 'public' = 모두에게 공개 (기본), 'teacher' = 선생님께만 공개
}

export interface AgoraPost {
  id: string
  topicId: string
  studentId: string
  studentName?: string           // 작성 시점의 학생 이름 snapshot — 명단/코드 바뀌어도 보존
  content: string
  postedAt: string               // ISO
  colorIdx?: number              // 0~4 — 5가지 포스트잇 색상
  imageDataUrl?: string          // 학생이 첨부한 사진 (data URL, 다운스케일됨)
}

export type MissionTier = 'MAIN' | 'SIDE' | 'TRIVIAL'

export interface Mission {
  id: string
  title: string                 // 예: "수학 익힘책 75쪽 풀기"
  description?: string
  rewardCookies?: number
  rewardTitleId?: string
  createdAt: string             // ISO
  active: boolean
  tier?: MissionTier            // 미션 위계 (기본 SIDE) — 'MAIN'은 메인 미션 1개, 'TRIVIAL'은 가벼운 항목
  deadline?: string             // 마감 안내 문구 (예: "오늘 하교 전까지")
  accent?: string               // SIDE 카드 강조 색 (CSS color)
}

export interface MissionCompletion {
  missionId: string
  completedAt: string           // ISO
}

export interface ShopPurchase {
  id: string                                 // 고유 식별자
  itemId: string
  itemName: string
  icon?: string
  cost: number
  purchasedAt: string                        // ISO
}

export interface StudentState {
  cookies?: number                           // 사용 가능 쿠키 (구매로 차감됨)
  lifetimeCookies?: number                   // 누적 쿠키 — 평생 획득 합계 (감소하지 않음)
  purchases?: ShopPurchase[]                 // 상점 구매 이력
  xp?: number                                // 누적 경험치
  ownedItemIds: string[]
  ownedTitleIds: string[]
  displayTitleId?: string                    // legacy — 단일 호칭 (구버전 호환)
  displayTitleIds?: string[]                 // 신전 현황에 노출할 호칭 (최대 3개)
  missions: MissionRecord[]                  // 일일 퀘스트 (구 미션) — 기존 구조 유지
  missionCompletions?: MissionCompletion[]   // 선생님이 부여한 미션 완료 기록
  sanctuary: SanctuaryPlacement[]
  diaries?: DiaryEntry[]
  customAvatar?: string                      // data URL (PNG) — 학생이 그리거나 업로드한 아바타
  statusMessage?: string                     // 학생이 두루마리에서 자유롭게 작성한 한 줄 메시지
  statusMessageAt?: string                   // ISO
  unlockedThemes?: string[]                  // 잠금해제된 신전 테마 id
  currentTheme?: string                      // 현재 선택된 신전 테마 id
  lastOfferingAt?: string                    // YYYY-MM-DD — 매일 1회 제물 송가 사용일
  dailySketch?: DailySketch                   // 우리반 일력 도전 — 학생이 제출한 그림+한줄 (교사가 선정)
  miniRoom?: MiniRoom                         // 미니홈피 미니룸 (방 꾸미기)
}

export interface DailySketch {
  date: string                               // YYYY-MM-DD
  imageDataUrl: string                       // PNG data URL (스케치)
  text: string                               // 한 줄 문구
  submittedAt: string                        // ISO
}

/* ──────────────── 미니룸(미니홈피) ──────────────── */

/** 바닥에 놓는 가구/소품. gc/gr = 8×8 바닥 타일 좌표. */
export interface MiniRoomItem {
  id: string
  key: string                                // sprites.ts 의 스프라이트 key
  gc: number                                 // 0..7
  gr: number                                 // 0..7
  scale?: number                             // 0.6 ~ 1.8
  flip?: boolean
  sketch?: string                            // (액자류) 안에 그린 그림 — 작게 압축한 data URL
  sketchText?: string                        // 그림 제목/한줄
  giftFrom?: string                          // 선물한 친구 이름 (있으면 '선물받은 액자')
  giftFromSid?: string
}

/** 벽에 거는 액자/창문/조명 등. wall = 좌(L)/우(R), col/row = 벽면 슬롯. */
export interface MiniWallItem {
  id: string
  key: string
  wall: 'L' | 'R'
  col: number                                // 0..5
  row: number                                // 0..2
  scale?: number
  flip?: boolean
  sketch?: string                            // (액자류) 안에 그린 그림 — 작게 압축한 data URL
  sketchText?: string
  giftFrom?: string
  giftFromSid?: string
}

export interface MiniRoom {
  wall: number                               // WALLS 인덱스
  floor: number                              // FLOORS 인덱스
  status?: string                            // 말풍선 한마디
  items: MiniRoomItem[]
  wallItems: MiniWallItem[]
  avatarGc?: number                          // 아바타가 선 바닥 타일
  avatarGr?: number
}

/** 교사가 지정하는 모둠. /state/miniroom_groups 에 MiniGroup[] 로 저장. */
export interface MiniGroup {
  id: string
  name: string                               // 모둠 이름 (교사가 지정)
  memberSids: string[]                       // 학생 코드 목록 (2×2 → 최대 4명 권장)
}

/** 친구에게 보내는 선물(그림 액자). /gifts/{id} 컬렉션. */
export interface Gift {
  id: string
  toSid: string                              // 받는 학생 코드
  fromSid: string                            // 보낸 학생 코드
  fromName: string                           // 보낸 사람 이름(표시용 snapshot)
  frameKey: string                           // 어떤 액자 도안인지 (sprites key)
  sketch: string                             // 그림 (작게 압축한 data URL)
  sketchText?: string                        // 그림 제목/한줄
  message?: string                           // 선물 메시지
  createdAt: string                          // ISO
  claimed?: boolean                          // 받는 사람이 방에 걸었는지
}

/** 교사가 선정한 "오늘의 일력 명언" — 홈 일력에 표시 */
export interface DailyFeature {
  date: string                               // YYYY-MM-DD
  text: string                               // 명언/문구
  author: string                             // 학생 이름
  sketchUrl?: string                         // 선정된 학생 일력 그림 (선택)
}

export type StudentStateMap = Record<string, StudentState>
