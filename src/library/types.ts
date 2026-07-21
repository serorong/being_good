/* ──────────────────────────────────────────────────────────────
   방학 시즌 2 — 모두의 도서관 타입.
   컬렉션:
     /library_status/{sid}    좌석·타이머 실시간 상태 (본인만 쓰기)
     /library_records/{id}    책 1권 = 문서 1개 (세션 누적)
     /library_activities/{id} 독후활동 1개 = 문서 1개 (그림 data URL 포함)
   ────────────────────────────────────────────────────────────── */

/** 카카오 책 검색에서 가져오거나 수동 입력한 책 정보 스냅샷 */
export interface LibBook {
  title: string
  authors?: string
  publisher?: string
  thumbnail?: string             // 표지 이미지 URL (카카오 제공)
  totalPages?: number
  isbn?: string
}

/** 좌석·타이머 실시간 상태 — 문서 ID = sid. 시간 계산은 항상 startedAt 기준(서버 기준). */
export interface LibStatus {
  id: string                     // = sid
  sid: string
  seat: number | null            // 좌석 번호 (null = 도서관 밖)
  mode: 'reading' | 'idle'       // '자리 비움'은 heartbeatAt 기준으로 클라이언트가 판정
  book?: LibBook                 // 지금 읽는 책
  recordId?: string              // 연결된 독서 기록 문서
  startedAt?: string             // ISO — 타이머 시작 시각
  targetMinutes?: number         // 목표 시간(분)
  pausedAt?: string              // ISO — 일시정지 중이면 설정
  pausedMs?: number              // 누적 일시정지 시간(ms)
  heartbeatAt: string            // ISO — 1분마다 갱신
  updatedAt: string              // ISO
}

/** 독서 세션 1회 (타이머 종료 시 기록) */
export interface LibSession {
  date: string                   // YYYY-MM-DD
  minutes: number
  endPage?: number               // "몇 쪽까지 읽었어?"
}

/** 책 1권의 독서 기록 — 영구 보존, 포트폴리오의 단위 */
export interface LibRecord {
  id: string
  sid: string
  book: LibBook
  sessions: LibSession[]
  currentPage: number            // 마지막으로 읽은 쪽
  finished?: boolean             // 완독
  createdAt: string
  updatedAt: string
}

export type LibActivityType = 'sentence' | 'sequel' | 'drawing' | 'mindmap' | 'review' | 'letter'

/** 마인드맵 노드 (단순 탭 편집기) */
export interface MindNode {
  id: string
  text: string
  children: MindNode[]
}

/** 독후활동 1개 */
export interface LibActivity {
  id: string
  sid: string
  recordId: string               // 어느 책의 활동인지
  type: LibActivityType
  title?: string
  text?: string                  // 글쓰기형 활동 내용
  imageDataUrl?: string          // 그리기형 활동 (압축 JPEG data URL)
  mindmap?: MindNode             // 마인드맵형 활동
  createdAt: string
}

export const ACTIVITY_TYPES: Array<{ type: LibActivityType; icon: string; label: string; hint: string; kind: 'text' | 'drawing' | 'mindmap' }> = [
  { type: 'sentence', icon: '✒️', label: '좋은 문장 쓰기',     hint: '마음에 남은 문장을 옮겨 적고, 왜 좋았는지 써 봐요', kind: 'text' },
  { type: 'sequel',   icon: '🔮', label: '뒷이야기 상상하기',   hint: '이야기가 끝난 다음엔 무슨 일이 벌어질까요?',        kind: 'text' },
  { type: 'drawing',  icon: '🎨', label: '그림으로 표현하기',   hint: '인상 깊은 장면을 그림으로 그려 봐요',              kind: 'drawing' },
  { type: 'mindmap',  icon: '🕸️', label: '마인드맵',           hint: '책의 내용을 가지로 뻗어 정리해 봐요',              kind: 'mindmap' },
  { type: 'review',   icon: '📝', label: '독후감',             hint: '책을 읽고 느낀 점을 자유롭게 써 봐요',             kind: 'text' },
  { type: 'letter',   icon: '💌', label: '작가·주인공에게 편지', hint: '작가님이나 주인공에게 하고 싶은 말을 전해요',       kind: 'text' },
]

export const activityMeta = (t: LibActivityType) => ACTIVITY_TYPES.find(a => a.type === t) ?? ACTIVITY_TYPES[0]

/** 좌석 수 (6열 × 4줄) */
export const SEAT_COUNT = 24

/** 선생님도 도서관에 참여한다 — 명단에 없는 고정 sid 사용 */
export const TEACHER_SID = 'teacher'
export const TEACHER_NAME = '선생님'

/** heartbeat가 이 시간(ms)보다 오래 끊기면 '자리 비움' */
export const AWAY_MS = 5 * 60 * 1000
/** heartbeat가 이 시간(ms)보다 오래 끊기면 자리 자체를 비운 것으로 간주 */
export const STALE_MS = 12 * 60 * 60 * 1000

export const fmtMinutes = (min: number): string => {
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
