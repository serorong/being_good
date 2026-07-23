import type { AgoraTopic, ClassInfo, ClassTerms, CustomTitle, DailyTaskDef, EmotionForest, MenuConfig, Mission, ShopItem, Student, TitleColor } from './types'

/**
 * 교사 화이트리스트 (구글 로그인 이메일).
 * 여기에 등록된 학교 도메인 이메일로 구글 로그인한 사용자만 교사 모드 사용 가능.
 * Firestore 규칙에서도 동일 화이트리스트로 한 번 더 검증한다.
 */
export const TEACHER_EMAILS = [
  'imogen0716@dajeong.sjedues.kr',
  'hailey@dajeong.sjedues.kr',
  'uyoung98@dajeong.sjedues.kr',
  'unicons89@dajeong.sjedues.kr',
  'njh1312@dajeong.sjedues.kr',
  'jj20223@dajeong.sjedues.kr',
  'imogen0716@gmail.com',
  'uts1368@dajeong.sjedues.kr',
] as const

/** 신의반 전용 교사 여부 (whitelist). divine classId에 접근하는 교사 검증용. */
export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return (TEACHER_EMAILS as readonly string[]).includes(email.toLowerCase())
}

/** 다정초 교사 도메인 여부. 새 반을 개설할 수 있는 모든 교사. */
export function isDajeongTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return lower.endsWith('@dajeong.sjedues.kr') || isTeacherEmail(lower)
}

/* ──────────────── 다반(multi-class) 기본값 ──────────────── */

export const DIVINE_CLASS_ID = 'divine'

export const DEFAULT_CLASS_TERMS: ClassTerms = {
  className: '신의반 신전',
  subtitle: '6학년 우리 반 마음마을',
  studentTitle: '신민',
  cookieName: '쿠키',
}

export const DEFAULT_MENU_CONFIGS: MenuConfig[] = [
  { key: 'notice',    label: '알림장',       enabled: true },
  { key: 'quests',    label: '신탁 두루마리', enabled: true },
  { key: 'missions',  label: '미션',         enabled: true },
  { key: 'shop',      label: '상점',         enabled: true },
  { key: 'offerings', label: '제물',         enabled: true },
  { key: 'shrine',    label: '모둠별 신전',   enabled: true },
  { key: 'library',   label: '모두의 도서관', enabled: false },   // 방학 시즌 — 학급관리에서 열고 닫기
]

export function defaultClassInfo(classId: string, teacherEmail: string): ClassInfo {
  return {
    classId,
    teacherEmail,
    createdAt: new Date().toISOString(),
    terms: { ...DEFAULT_CLASS_TERMS },
    menus: DEFAULT_MENU_CONFIGS.map(m => ({ ...m })),
  }
}

export const DAILY_TASKS: DailyTaskDef[] = [
  { key: 'presentation', label: '발표',     description: '오늘 수업에 손을 들어 의견을 펼쳤는가', maxScore: 3, icon: '🗣️' },
  { key: 'attitude',     label: '수업 태도', description: '신전(교실)에 앉아 집중하였는가',         maxScore: 1, icon: '📜' },
  { key: 'cleaning',     label: '청소',     description: '신전을 깨끗이 정돈하였는가',             maxScore: 1, icon: '🧹' },
  { key: 'homework',     label: '숙제',     description: '신탁(숙제)을 완수하였는가',              maxScore: 1, icon: '📚' },
  { key: 'kindWords',    label: '고운말',   description: '벗에게 따스한 말을 건넸는가',            maxScore: 2, icon: '🌿' },
  { key: 'lunch',        label: '급식',     description: '신의 양식을 감사히 먹었는가',            maxScore: 1, icon: '🍚' },
  { key: 'diary',        label: '감정일기', description: '오늘의 신의 일지를 적었는가',            maxScore: 1, icon: '🪶' },
]

export function maxDailyScore() {
  return DAILY_TASKS.reduce((a, t) => a + t.maxScore, 0)
}

// 실제 신의반 학생 명단 (구글 시트에서 가져온 21명)
// id = 학생 코드. 학생이 첫 로그인 후 heroName/avatarSeed를 직접 바꿀 수 있음.
const ROSTER: Array<{ id: string; name: string }> = [
  { id: 'god01', name: '강라윤' }, { id: 'god02', name: '김민지' }, { id: 'god03', name: '김유준' },
  { id: 'god04', name: '김지환' }, { id: 'god05', name: '노승유' }, { id: 'god06', name: '노찬영' },
  { id: 'god07', name: '문하윤' }, { id: 'god08', name: '박선율' }, { id: 'god09', name: '손연우' },
  { id: 'god10', name: '신아란' }, { id: 'god11', name: '오연수' }, { id: 'god12', name: '오준후' },
  { id: 'god13', name: '이윤슬' }, { id: 'god14', name: '임규현' }, { id: 'god15', name: '임태건' },
  { id: 'god16', name: '임태규' }, { id: 'god17', name: '정유하' }, { id: 'god18', name: '정현중' },
  { id: 'god19', name: '최준호' }, { id: 'god20', name: '추서연' }, { id: 'god21', name: '홍은빈' },
]

const BASE_TITLE_COLORS: TitleColor[] = ['gold', 'blue', 'green', 'rose']

export const MOCK_STUDENTS: Student[] = ROSTER.map((r, i) => ({
  id: r.id,
  heroName: r.name,                    // 처음엔 실명과 동일. 학생이 두루마리에서 바꿀 수 있음.
  realName: r.name,
  avatarSeed: r.id,                    // 코드 기반으로 캐릭터 다양화
  title: '새내기 견습',
  titleColor: BASE_TITLE_COLORS[i % BASE_TITLE_COLORS.length],
  cookies: 0,
  todayScore: 0,
  streak: 0,
  level: 1,
  missionsDone: 0,
}))

// 픽셀 아바타 (DiceBear pixel-art — 배경 없이 투명, 쯔꾸르 스프라이트 느낌으로 표시)
export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&radius=0`
}

// 감정단어의 숲 — 「감정단어의 숲 - Sheet1.pdf」 기반으로 의미별 그룹화.
// 긍정(욕구가 충족되었을 때) / 부정(욕구가 충족되지 않았을 때)
export const EMOTION_FOREST: EmotionForest = {
  positive: [
    { name: '기쁨과 즐거움', words: ['행복한', '기쁜', '신나는', '재미있는', '쾌활한', '즐거운', '황홀한', '열광적인', '짜릿한'] },
    { name: '희망과 기대',   words: ['희망찬', '기대되는', '고무된', '들뜬'] },
    { name: '감격과 충만',   words: ['충만한', '경이로운', '감동한', '뭉클한', '영광스러운'] },
    { name: '자랑과 뿌듯함', words: ['자랑스런', '뿌듯한', '흐뭇한', '만족스런', '흡족한', '의기양양한', '긍지있는', '희열있는'] },
    { name: '사랑과 감사',   words: ['감사하는', '기꺼운', '고마운', '사랑스러운', '애틋한', '끌리는', '따뜻한', '연민의'] },
    { name: '평화와 안정',   words: ['평화로운', '안도하는', '가벼운', '홀가분한'] },
    { name: '흥미와 집중',   words: ['호기심있는', '흥미로운', '힘이 솟는', '몰입하는', '집중하는'] },
  ],
  negative: [
    { name: '두려움과 불안', words: ['두려운', '놀란', '걱정하는', '초조한', '공포의', '충격적인', '경악하는'] },
    { name: '혐오와 불쾌',   words: ['혐오하는', '불편한', '불쾌한', '역겨운'] },
    { name: '슬픔과 우울',   words: ['슬픈', '괴로운', '낙담한', '불행한', '우울한', '절망적인', '비통한', '속상한', '비관적인', '시무룩한'] },
    { name: '무관심과 무기력', words: ['무관심의', '답답한', '지루한', '냉담한', '회의적인', '싸늘한', '심드렁한', '무기력한'] },
    { name: '분노',           words: ['화난', '짜증난', '불만스런', '흥분한', '섭섭한', '억울한', '격분한', '미운'] },
    { name: '부끄러움',       words: ['부끄러운', '수줍은', '민망한', '수치스러운'] },
    { name: '혼란',           words: ['혼란스런', '난처한', '의아한', '당황한', '멘붕의'] },
    { name: '후회와 실망',   words: ['후회하는', '아쉬운', '미안한', '실망스런'] },
    { name: '부러움과 외로움', words: ['질투하는', '부러운', '외로운', '쓸쓸한', '그리운', '고독한'] },
  ],
}

/* ──────────────── 감정 중분류 (마음 구슬 12색) ────────────────
 * 새 디자인의 12개 중분류 구슬. 기존 「감정단어의 숲」 그룹/단어를 여기에 연결한다.
 * 이미지: public/assets/beads/<file>.png  (감정구슬 모음)
 */
export type EmotionCatKey =
  | 'joy' | 'pride' | 'grateful' | 'curious' | 'calm' | 'anxious'
  | 'sad' | 'anger' | 'shy' | 'regret' | 'lonely' | 'jealous'

export const EMOTION_CATEGORIES: { key: EmotionCatKey; label: string; file: string; color: string }[] = [
  { key: 'joy',      label: '기쁨·활력',     file: '01_기쁨_활력',     color: '#FFD75E' },
  { key: 'pride',    label: '성취·자부심',   file: '02_성취_자부심',   color: '#F5A261' },
  { key: 'grateful', label: '감사·따뜻함',   file: '03_감사_따뜻함',   color: '#FFB7A5' },
  { key: 'curious',  label: '호기심·몰입',   file: '04_호기심_몰입',   color: '#9AD95D' },
  { key: 'calm',     label: '평온·안도',     file: '05_평온_안도',     color: '#8EDCC8' },
  { key: 'anxious',  label: '불안·두려움',   file: '06_불안_두려움',   color: '#8FA8FF' },
  { key: 'sad',      label: '슬픔·낙담',     file: '07_슬픔_낙담',     color: '#6DB5F5' },
  { key: 'anger',    label: '분노·불쾌',     file: '08_분노_불쾌',     color: '#FF7A6B' },
  { key: 'shy',      label: '부끄러움·혼란', file: '09_부끄러움_혼란', color: '#C7A1F2' },
  { key: 'regret',   label: '후회·아쉬움',   file: '10_후회_아쉬움',   color: '#B7BEC9' },
  { key: 'lonely',   label: '외로움·그리움', file: '11_외로움_그리움', color: '#5E7BC7' },
  { key: 'jealous',  label: '질투·부러움',   file: '12_질투_부러움',   color: '#A7C96D' },
]

// 「감정단어의 숲」 그룹명 → 중분류
const GROUP_TO_CATEGORY: Record<string, EmotionCatKey> = {
  '기쁨과 즐거움': 'joy',
  '희망과 기대':   'joy',
  '감격과 충만':   'grateful',
  '자랑과 뿌듯함': 'pride',
  '사랑과 감사':   'grateful',
  '평화와 안정':   'calm',
  '흥미와 집중':   'curious',
  '두려움과 불안': 'anxious',
  '혐오와 불쾌':   'anger',
  '슬픔과 우울':   'sad',
  '무관심과 무기력': 'sad',
  '분노':          'anger',
  '부끄러움':      'shy',
  '혼란':          'shy',
  '후회와 실망':   'regret',
  '부러움과 외로움': 'jealous',
}

// 한 그룹 안에서 단어별로 갈리는 예외 (외로움 계열 → lonely)
const WORD_TO_CATEGORY: Record<string, EmotionCatKey> = {
  '외로운': 'lonely', '쓸쓸한': 'lonely', '그리운': 'lonely', '고독한': 'lonely',
}

/** 감정 단어 → 중분류 키. 매칭 실패 시 null. */
export function emotionCategoryOf(word: string): EmotionCatKey | null {
  if (WORD_TO_CATEGORY[word]) return WORD_TO_CATEGORY[word]
  for (const g of [...EMOTION_FOREST.positive, ...EMOTION_FOREST.negative]) {
    if (g.words.includes(word)) return GROUP_TO_CATEGORY[g.name] ?? null
  }
  return null
}

export function emotionCategory(key: EmotionCatKey) {
  return EMOTION_CATEGORIES.find(c => c.key === key)!
}

/** 중분류 구슬 이미지 경로. */
export function beadSrc(key: EmotionCatKey): string {
  return `/assets/beads/${encodeURIComponent(emotionCategory(key).file)}.png`
}

// 호환용 (이전에 사용했던 평면 배열)
export const EMOTIONS: string[] = [
  ...EMOTION_FOREST.positive.flatMap(g => g.words),
  ...EMOTION_FOREST.negative.flatMap(g => g.words),
]

// 아고라 — 기본 주제 시드
export const DEFAULT_AGORA_TOPICS: AgoraTopic[] = [
  { id: 'a_intro', title: '나를 한 단어로 표현한다면?', description: '오늘의 나를 가장 잘 나타내는 단어 하나를 골라 적어보세요.', createdAt: '2026-05-12T00:00:00.000Z', active: true },
  { id: 'a_book',  title: '5월의 책 한 구절',           description: '이번 달 인상 깊었던 책 속 한 줄을 공유해 봅시다.',         createdAt: '2026-05-11T00:00:00.000Z', active: true },
  { id: 'a_orcl',  title: '내가 만든 신탁',              description: '동무들에게 들려주고 싶은 신비로운 한 마디를 적어보세요.', createdAt: '2026-05-10T00:00:00.000Z', active: true },
]

export const POSTIT_COLORS = [
  '#ffd6e3', // 분홍 pink
  '#cfe9ff', // 하늘 sky
  '#fff5b8', // 연노랑 yellow
  '#c5f4d2', // 연두 mint
  '#e2d4f4', // 보라 lavender
]

export const DEFAULT_CUSTOM_TITLES: CustomTitle[] = [
  { id: 't_speaker',  name: '발표의 신탁자', description: '발표 3점을 7일 누적',     color: 'gold',  icon: '🗣️' },
  { id: 't_kind',     name: '고운말 수호자', description: '고운말 2점을 10일 누적',  color: 'green', icon: '🌿' },
  { id: 't_clean',    name: '신성한 청소부', description: '청소 1점을 14일 누적',    color: 'blue',  icon: '🧹' },
  { id: 't_reader',   name: '책의 순례자',   description: '독서 기록 5권 완성',      color: 'gold',  icon: '📚' },
  { id: 't_dawnstar', name: '새벽별의 학생', description: '7일 연속 출석',           color: 'blue',  icon: '⭐' },
  { id: 't_mathmage', name: '셈의 마도사',   description: '수학 미션 5회 완수',      color: 'rose',  icon: '🔢' },
]

export const DEFAULT_MISSIONS: Mission[] = [
  { id: 'm_math1',   title: '시 한 편을 외워서 친구에게 들려주기', description: '마음에 드는 시 한 편을 골라 외우세요. 친구 한 명을 정해 들려주고 짧은 감상까지 받으면 완수.',
    rewardCookies: 5, rewardTitleId: 't_reader', createdAt: '2026-05-12T00:00:00.000Z', active: true,
    tier: 'MAIN', deadline: '오늘 하교 전까지' },
  { id: 'm_read1',   title: '감정 일기 한 줄 적기',    description: '딱 한 줄이면 충분. 오늘 어떤 마음이었는지만 적어보세요.',
    rewardCookies: 2, createdAt: '2026-05-11T00:00:00.000Z', active: true, tier: 'SIDE' },
  { id: 'm_clean1',  title: '친구 칭찬 한 마디',       description: '복도에서 마주친 친구에게 진심 한 줄. 짧을수록 좋아요.',
    rewardCookies: 2, createdAt: '2026-05-11T00:00:00.000Z', active: true, tier: 'SIDE', accent: '#7ab87a' },
  { id: 'm_obs1',    title: '식물 관찰일지 1편 작성',  description: '잎의 모양/색을 자세히 적어보세요.',
    rewardCookies: 2, createdAt: '2026-05-10T00:00:00.000Z', active: true, tier: 'TRIVIAL' },
]

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'wreath',     name: '월계관',         price: 30,  icon: '🌿', kind: '머리',  description: '신전의 견습에게 어울리는 푸른 잎' },
  { id: 'crown',      name: '황금 왕관',      price: 60,  icon: '👑', kind: '머리',  description: '신탁자만이 두를 수 있는 광휘' },
  { id: 'scroll',     name: '신성한 두루마리', price: 25,  icon: '📜', kind: '소품',  description: '신탁이 적힌 양피지' },
  { id: 'feather',    name: '황금 깃펜',      price: 45,  icon: '🪶', kind: '소품',  description: '신탁을 받아 적기 위한 깃펜' },
  { id: 'cloak',      name: '신탁자의 망토',  price: 80,  icon: '🧥', kind: '의상',  description: '별빛이 수놓인 망토' },
  { id: 'lantern',    name: '신전 등불',      price: 50,  icon: '🏮', kind: '소품',  description: '어둠을 밝히는 작은 빛' },
  { id: 'star',       name: '별빛 조각',      price: 35,  icon: '⭐', kind: '소품',  description: '하늘에서 떨어진 별의 파편' },
  { id: 'cookieset',  name: '특별 쿠키 세트', price: 20,  icon: '🍪', kind: '소모품', description: '달콤한 별빛 쿠키' },
  { id: 'cat',        name: '신전 고양이',    price: 100, icon: '🐈', kind: '소품',  description: '신전을 지키는 고양이' },
  { id: 'olive',      name: '올리브 가지',    price: 18,  icon: '🌱', kind: '소품',  description: '평화의 상징' },
  { id: 'harp',       name: '신탁자의 하프',  price: 70,  icon: '🎵', kind: '소품',  description: '맑은 음을 자아내는 하프' },
  { id: 'amphora',    name: '암포라',         price: 28,  icon: '🏺', kind: '소품',  description: '신성한 기름을 담는 그릇' },
]

/* ============================================================
   레벨링 + 자신의 신전 테마/소품 잠금해제 + 매일 제물 송가
   ============================================================ */

export function xpForNextLevel(level: number): number {
  return 50 + level * 30
}

export function levelFromXp(xp: number): { level: number; into: number; need: number; cumStart: number } {
  let lvl = 1
  let cum = 0
  while (lvl < 99) {
    const need = xpForNextLevel(lvl)
    if (xp < cum + need) return { level: lvl, into: xp - cum, need, cumStart: cum }
    cum += need
    lvl++
  }
  return { level: 99, into: 0, need: 0, cumStart: cum }
}

export interface SanctuaryTheme {
  id: string
  name: string
  minLevel: number
  description: string
  background: string
  ground: string
  accent: string
}

export const SANCTUARY_THEMES: SanctuaryTheme[] = [
  { id: 'paper',   name: '양피지 신전',     minLevel: 1,
    description: '모스 그린과 따스한 양피지의 기본 신전',
    background: 'linear-gradient(180deg, #f7f1de 0%, #f0ead2 60%, #d4e8c6 100%)',
    ground: '#d4e8c6', accent: '#3f8a55' },
  { id: 'forest',  name: '사이프러스 숲',   minLevel: 3,
    description: '짙은 초록과 잎이 흩날리는 숲',
    background: 'linear-gradient(180deg, #aedcae 0%, #7ab87a 55%, #2d5a3d 100%)',
    ground: '#3f8a55', accent: '#fff3b8' },
  { id: 'dawn',    name: '새벽 신전',       minLevel: 6,
    description: '푸른 안개가 흐르는 차분한 새벽',
    background: 'linear-gradient(180deg, #8fc8d0 0%, #4a8ea0 60%, #2a5a6a 100%)',
    ground: '#4a8ea0', accent: '#fff3b8' },
  { id: 'starlit', name: '별빛 신전',       minLevel: 9,
    description: '짙은 보라 하늘과 반딧불이의 무리',
    background: 'linear-gradient(180deg, #2a1d4a 0%, #4a2f7a 60%, #1a0f3a 100%)',
    ground: '#4a2f7a', accent: '#f7d56b' },
  { id: 'golden',  name: '황금 신전',       minLevel: 12,
    description: '황금 빛이 가득한 신탁의 최고 경지',
    background: 'linear-gradient(180deg, #fff8e1 0%, #f7d56b 60%, #b8862a 100%)',
    ground: '#d4b870', accent: '#5a3a22' },
]

export const LEVEL_ITEM_UNLOCKS: Array<{ level: number; itemIds: string[] }> = [
  { level: 2,  itemIds: ['wreath', 'olive'] },
  { level: 3,  itemIds: ['scroll', 'amphora'] },
  { level: 5,  itemIds: ['lantern', 'feather'] },
  { level: 7,  itemIds: ['star', 'cloak'] },
  { level: 10, itemIds: ['harp', 'crown'] },
  { level: 13, itemIds: ['cat'] },
]

export function itemsUnlockedAt(level: number): string[] {
  const out = new Set<string>()
  for (const u of LEVEL_ITEM_UNLOCKS) {
    if (level >= u.level) u.itemIds.forEach(id => out.add(id))
  }
  return [...out]
}

export function themesUnlockedAt(level: number): string[] {
  return SANCTUARY_THEMES.filter(t => level >= t.minLevel).map(t => t.id)
}

export const DAILY_OFFERING_POOL: Array<{ itemId: string; weight: number }> = [
  { itemId: 'olive',   weight: 40 },
  { itemId: 'scroll',  weight: 40 },
  { itemId: 'amphora', weight: 35 },
  { itemId: 'wreath',  weight: 30 },
  { itemId: 'feather', weight: 25 },
  { itemId: 'lantern', weight: 22 },
  { itemId: 'star',    weight: 15 },
  { itemId: 'harp',    weight: 10 },
  { itemId: 'cloak',   weight: 6 },
  { itemId: 'crown',   weight: 5 },
  { itemId: 'cat',     weight: 4 },
]

export function rollDailyOffering(): string {
  const total = DAILY_OFFERING_POOL.reduce((a, b) => a + b.weight, 0)
  let r = Math.random() * total
  for (const o of DAILY_OFFERING_POOL) {
    r -= o.weight
    if (r <= 0) return o.itemId
  }
  return DAILY_OFFERING_POOL[0].itemId
}

/* ============================================================
   상점 아이템 — 실제 쿠키로 교환하는 4가지 보상
   ============================================================ */
export interface RealShopItem {
  id: string
  name: string
  icon: string
  description: string
  cost: number
}

export const SHOP_REAL_ITEMS: RealShopItem[] = [
  { id: 'boardgame', name: '선생님과 보드게임 5분',
    icon: '🎲', cost: 200,
    description: '선생님과 단둘이 보드게임 5분! 어떤 게임을 할지는 선생님과 정해요.' },
  { id: 'lunch1st',  name: '급식 줄 1등 서기',
    icon: '🍱', cost: 200,
    description: '오늘 점심, 급식 줄 가장 앞자리에 서기.' },
  { id: 'drink',     name: '선생님이 타준 음료 마시기',
    icon: '🥤', cost: 200,
    description: '선생님이 직접 타준 음료 한 잔을 받아요.' },
  { id: 'nohw',      name: '숙제 면제권',
    icon: '📜', cost: 200,
    description: '이번 주 숙제 한 번 면제. 어떤 숙제에 쓸지는 선생님과 상의해요.' },
]

export const ORACLES = [
  '오늘의 신탁: 작은 친절 한 알이 신전을 따스히 비추리라.',
  '오늘의 신탁: 발표하는 자의 목소리는 곧 별빛이 되리라.',
  '오늘의 신탁: 손을 모아 청소하는 자에게 황금 쿠키가 깃들리라.',
  '오늘의 신탁: 고운말은 가장 단단한 갑옷이 될 것이다.',
  '오늘의 신탁: 오늘의 한 줄 일기가 내일의 용기가 되리라.',
  '오늘의 신탁: 책을 펼치는 자, 그 길에 등불이 켜지리라.',
]

export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function lastNDays(n: number) {
  const out: Date[] = []
  const base = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    d.setHours(0, 0, 0, 0)
    out.push(d)
  }
  return out
}
