import { useEffect, useMemo, useState } from 'react'
import { avatarUrl, todayStr } from '../data'
import { approveJoinRequest, effectiveCookies, rejectJoinRequest, setDailyFeature, setDailyTasks, setShopItems, useAgoraPosts, useAgoraTopics, useCustomTitles, useDailyFeature, useDailyTasks, useJoinRequests, useMissions, useNotices, useOfferings, useRoster, useShopItems, useStudentEmailMap, useStudentStateMap, setRoster } from '../state'
import type { AgoraTopic, AgoraVisibility, ClassTerms, CustomShopItem, CustomTitle, DailyTaskDef, DiaryEntry, JoinRequest, MenuConfig, Mission, Notice, Offering, TitleColor } from '../types'
import { useClassInfo } from '../ClassContext'
import { Link } from 'react-router-dom'
import { liveness, useLibActivities, useLibRecords, useLibStatuses } from '../library/store'
import { fmtMinutes as fmtLibMinutes } from '../library/types'

const COLORS: TitleColor[] = ['gold', 'blue', 'green', 'rose']
const COLOR_LABEL: Record<TitleColor, string> = { gold: '황금', blue: '하늘', green: '월계', rose: '장미' }

type AdminMenuKey =
  | 'classSettings' | 'approvals' | 'daily' | 'notices' | 'offerings' | 'roster' | 'missions'
  | 'agora'         | 'diaries'   | 'titles' | 'cookies' | 'shop'      | 'cleanup'
  | 'questConfig'   | 'shopConfig' | 'library'

const MENU: Array<{ key: AdminMenuKey; icon: string; label: string; desc: string }> = [
  { key: 'classSettings', icon: '⚙️', label: '반 설정',           desc: '반 이름·용어·메뉴 표시 설정' },
  { key: 'approvals',     icon: '🗝️', label: '입장 승인',         desc: '학생이 신청한 구글 계정 연결을 승인' },
  { key: 'daily',         icon: '📅', label: '일력 선정',         desc: '오늘 홈에 보일 명언/일력을 정해요' },
  { key: 'notices',       icon: '📋', label: '알림장',           desc: '학생 「신전 현황」 상단에 표시되는 공지' },
  { key: 'offerings',     icon: '📜', label: '제물 게시판',       desc: '미니게임/활동 자료 등 학생 「제물」 탭' },
  { key: 'roster',        icon: '🧝', label: '학생 명단',         desc: '코드/이름 추가·삭제·CSV 업로드' },
  { key: 'missions',      icon: '🎯', label: '미션 관리',         desc: '오늘의 미션을 만들고 위계를 정해요' },
  { key: 'questConfig',   icon: '📜', label: '일일 퀘스트 설정', desc: '퀘스트 항목·이름·점수·설명을 커스텀' },
  { key: 'shopConfig',    icon: '🛍️', label: '상점 설정',         desc: '상점 아이템 추가·수정·삭제' },
  { key: 'library',       icon: '📚', label: '모두의 도서관',     desc: '도서관 열고 닫기·독서 현황·포트폴리오 인쇄' },
  { key: 'diaries',       icon: '🪶', label: '감정일기',          desc: '학생이 쓴 일지를 보고 피드백을 남겨요' },
  { key: 'titles',        icon: '🎖️', label: '호칭 관리',         desc: '새 호칭을 만들고 학생에게 부여' },
  { key: 'cookies',       icon: '🍪', label: '쿠키 조정',         desc: '학생별 쿠키를 직접 조정' },
  { key: 'shop',          icon: '🛒', label: '상점',              desc: '학생들이 상점에서 구매한 내역을 확인' },
  { key: 'cleanup',       icon: '🧹', label: '데이터 정리',       desc: 'Firebase 무료 한도 안전 유지' },
]

export default function AdminPage() {
  const [active, setActive] = useState<AdminMenuKey>('notices')
  const current = MENU.find(m => m.key === active)!
  const pendingRequests = useJoinRequests()
  const pendingCount = Object.keys(pendingRequests).length

  return (
    <div className="space-y-6">
      <section className="card-temple p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🗝️</div>
          <div>
            <h1 className="font-display text-2xl font-bold gold-text">학급관리</h1>
            <p className="text-sm text-ink-500">왼쪽 메뉴에서 항목을 고르면 옆 화면에 펼쳐집니다.</p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-[260px_1fr] gap-5 items-start">
        {/* 사이드바 */}
        <nav className="card-temple p-3 md:sticky md:top-32 self-start">
          <div className="font-display text-xs tracking-widest text-moss-deep px-2 py-2 border-b border-moss-darkest/15 mb-1.5">
            메뉴
          </div>
          <ul className="space-y-1">
            {MENU.map(m => (
              <li key={m.key}>
                <button
                  onClick={() => setActive(m.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition
                    ${active === m.key
                      ? 'bg-gold-100 border-2 border-moss-darkest font-bold'
                      : 'border border-transparent hover:bg-moss-mist/60'}`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-display text-sm text-moss-darkest block">{m.label}</span>
                    <span className="text-[11px] text-moss-deep/70 block leading-tight line-clamp-1">{m.desc}</span>
                  </span>
                  {m.key === 'approvals' && pendingCount > 0 && (
                    <span className="ml-1 shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose2-400 text-white text-[11px] font-bold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* 콘텐츠 패널 — 사이드바 옆 인라인 */}
        <section>
          <div className="card-temple overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b-2 border-moss-darkest/15 bg-moss-paper">
              <h2 className="font-display text-lg sm:text-xl font-bold text-moss-darkest flex items-center gap-2">
                <span className="text-xl">{current.icon}</span> {current.label}
              </h2>
              <span className="text-xs text-moss-deep/70 hidden sm:block">{current.desc}</span>
            </div>
            <div className="p-4 sm:p-5">
              {active === 'classSettings' && <ClassSettingsSection />}
              {active === 'approvals' && <ApprovalsSection />}
              {active === 'daily'     && <DailyFeatureSection />}
              {active === 'notices'   && <NoticesSection />}
              {active === 'offerings' && <OfferingsAdminSection />}
              {active === 'roster'    && <RosterSection />}
              {active === 'missions'    && <MissionsAdminSection />}
              {active === 'questConfig' && <QuestConfigSection />}
              {active === 'shopConfig'  && <ShopConfigSection />}
              {active === 'library'     && <LibraryAdminSection />}
              {active === 'diaries'     && <DiariesSection />}
              {active === 'titles'    && <TitlesSection />}
              {active === 'cookies'   && <CookiesSection />}
              {active === 'shop'      && <ShopPurchasesSection />}
              {active === 'cleanup'   && <CleanupSection />}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ------------------ 알림장 ------------------ */
function NoticesSection() {
  const [notices, setNotices] = useNotices()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const reset = () => { setTitle(''); setBody(''); setEditingId(null) }

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.')
      return
    }
    if (editingId) {
      setNotices(prev => prev.map(n => n.id === editingId
        ? { ...n, title: title.trim(), body: body.trim() }
        : n))
      reset()
      return
    }
    const n: Notice = {
      id: `n${Date.now()}`,
      postedAt: new Date().toISOString(),
      title: title.trim(),
      body: body.trim(),
      author: '신탁자 선생님',
    }
    setNotices(prev => [...prev, n])
    reset()
  }

  const startEdit = (n: Notice) => {
    setEditingId(n.id)
    setTitle(n.title)
    setBody(n.body)
  }

  const remove = (id: string) => {
    if (!confirm('이 알림장을 삭제할까요?')) return
    setNotices(prev => prev.filter(n => n.id !== id))
    if (editingId === id) reset()
  }

  const sorted = [...notices].sort((a, b) => b.postedAt.localeCompare(a.postedAt))

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">📋 알림장</h2>
          <p className="text-sm text-ink-500">학생들의 「신전 현황」 페이지 상단에 가장 최근 알림장 2개가 표시됩니다.</p>
        </div>
        <span className="chip">{sorted.length}개</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          {editingId && (
            <div className="text-xs text-gold-500 font-display flex items-center gap-2">
              ✎ 수정 모드 — 「{notices.find(n => n.id === editingId)?.title ?? '...'}」
              <button onClick={reset} className="text-ink-500 underline">취소</button>
            </div>
          )}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="알림장 제목"
            className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="알림장 내용 (학생들에게 전하고 싶은 말씀)"
            rows={5}
            className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white resize-y"
          />
          <div className="flex justify-end gap-2">
            {editingId && <button onClick={reset} className="btn-ghost text-sm">취소</button>}
            <button onClick={submit} className="btn-gold text-sm">
              {editingId ? '✦ 수정 저장' : '+ 알림장 게시'}
            </button>
          </div>
        </div>

        <div className="bg-cream-100/60 border border-gold-200/40 rounded-2xl p-3 max-h-72 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="text-sm text-ink-500 py-6 text-center">아직 작성된 알림장이 없습니다.</div>
          ) : (
            <ul className="space-y-2">
              {sorted.map((n, i) => (
                <li
                  key={n.id}
                  className={`bg-white rounded-xl border-2 p-3 ${
                    editingId === n.id ? 'border-gold-400 ring-2 ring-gold-300/50' :
                    i === 0 ? 'border-moss-darkest/60' : 'border-gold-200/50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div className="font-display font-bold text-ink-900 flex items-center gap-2">
                      {n.title}
                      {i === 0 && <span className="chip chip-green text-[10px]">학생에게 노출 중</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => startEdit(n)}
                        className="w-8 h-8 grid place-items-center rounded-md border border-moss-darkest/30 hover:bg-moss-mist text-sm"
                        title="수정"
                        aria-label="알림장 수정"
                      >✏️</button>
                      <button
                        onClick={() => remove(n.id)}
                        className="w-8 h-8 grid place-items-center rounded-md border border-rose2-300 hover:bg-rose2-100 text-sm"
                        title="삭제"
                        aria-label="알림장 삭제"
                      >🗑️</button>
                    </div>
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5">
                    {new Date(n.postedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <p className="text-sm text-ink-700 mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------ 제물 게시판 ------------------ */
function OfferingsAdminSection() {
  const [offerings, setOfferings] = useOfferings()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const resetForm = () => { setTitle(''); setBody(''); setLink(''); setEditingId(null) }

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.')
      return
    }
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      alert('링크는 http(s)://로 시작해야 합니다.')
      return
    }
    if (editingId) {
      setOfferings(prev => prev.map(o => o.id === editingId
        ? { ...o, title: title.trim(), body: body.trim(), link: link.trim() || undefined }
        : o
      ))
    } else {
      const o: Offering = {
        id: `o${Date.now()}`,
        postedAt: new Date().toISOString(),
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || undefined,
        author: '신탁자 선생님',
      }
      setOfferings(prev => [...prev, o])
    }
    resetForm()
  }

  const startEdit = (o: Offering) => {
    setEditingId(o.id)
    setTitle(o.title)
    setBody(o.body)
    setLink(o.link ?? '')
  }

  const remove = (id: string) => {
    if (!confirm('이 제물을 삭제할까요?')) return
    setOfferings(prev => prev.filter(o => o.id !== id))
    if (editingId === id) resetForm()
  }

  const sorted = [...offerings].sort((a, b) => b.postedAt.localeCompare(a.postedAt))

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">📜 제물 게시판</h2>
          <p className="text-sm text-ink-500">학생들의 「제물」 탭에 표시됩니다. 유니티 게임 링크도 함께 올릴 수 있어요.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목 (예: 신탁의 미로 — 미니게임)"
            className="pixel-input w-full"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="설명 / 활동 안내 / 규칙"
            rows={5}
            className="pixel-input w-full resize-y"
          />
          <input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="유니티 빌드 / 외부 게임 링크 (선택, https://…)"
            className="pixel-input w-full"
          />
          <div className="flex gap-2">
            <button onClick={submit} className="btn-gold text-sm">
              {editingId ? '✏ 수정 저장' : '🪔 제물 올리기'}
            </button>
            {editingId && (
              <button onClick={resetForm} className="btn-ghost text-sm">취소</button>
            )}
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-sm text-ink-500">아직 올린 제물이 없습니다.</div>
          ) : (
            sorted.map(o => (
              <div key={o.id} className="card-soft p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-sm text-ink-900 truncate">{o.title}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">
                      {new Date(o.postedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {o.link && ' · 🔗 링크'}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(o)} className="btn-ghost text-[11px] px-2 py-1">수정</button>
                    <button onClick={() => remove(o.id)} className="btn-ghost text-[11px] px-2 py-1">삭제</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------ 입장 승인 ------------------ */
function ApprovalsSection() {
  const requests = useJoinRequests()
  const roster = useRoster()
  const [emailMap] = useStudentEmailMap()
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  // 현재 어떤 자리(sid)를 어떤 이메일이 쓰고 있는지 (재지정 경고용)
  const sidToEmail: Record<string, string> = {}
  for (const [em, sid] of Object.entries(emailMap)) sidToEmail[sid] = em

  const list = Object.values(requests).sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))

  const nameOf = (sid: string) => roster.find(s => s.id === sid)?.realName

  const approve = async (req: JoinRequest) => {
    const occupant = sidToEmail[req.studentId]
    const inRoster = roster.some(s => s.id === req.studentId)
    if (!inRoster) {
      alert(`「${req.studentId}」 자리가 현재 명단에 없어요. 먼저 「학생 명단」에서 확인해 주세요.`)
      return
    }
    if (occupant && occupant !== req.email) {
      if (!confirm(
        `「${nameOf(req.studentId) ?? req.studentId}」 자리는 이미 다른 계정에 연결돼 있어요.\n` +
        `  기존: ${occupant}\n  변경: ${req.email}\n\n` +
        `연결을 새 계정으로 옮길까요?\n(그 자리의 활동 기록은 그대로 보존됩니다)`
      )) return
    }
    setBusyEmail(req.email)
    try {
      await approveJoinRequest(req)
    } catch (e) {
      alert(`승인 중 오류가 났어요: ${(e as Error)?.message ?? '알 수 없음'}`)
    } finally {
      setBusyEmail(null)
    }
  }

  const reject = async (req: JoinRequest) => {
    if (!confirm(`「${req.displayName || req.email}」 님의 신청을 거절(삭제)할까요?`)) return
    setBusyEmail(req.email)
    try {
      await rejectJoinRequest(req.email)
    } catch (e) {
      alert(`거절 중 오류가 났어요: ${(e as Error)?.message ?? '알 수 없음'}`)
    } finally {
      setBusyEmail(null)
    }
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">🗝️ 입장 승인</h2>
          <p className="text-sm text-ink-500">학생이 구글 계정으로 신청한 자리를 확인하고 승인하세요. 승인하면 그 학생은 다음부터 자동 입장합니다.</p>
        </div>
        <span className="chip">{list.length}건 대기</span>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gold-200/40 p-8 text-center text-ink-500">
          <div className="text-3xl mb-2">🌿</div>
          대기 중인 입장 신청이 없어요.
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map(req => {
            const occupant = sidToEmail[req.studentId]
            const reassigning = occupant && occupant !== req.email
            const inRoster = roster.some(s => s.id === req.studentId)
            const busy = busyEmail === req.email
            return (
              <li key={req.email} className="bg-white rounded-2xl border border-gold-200/40 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold text-ink-900 flex items-center gap-2 flex-wrap">
                      {nameOf(req.studentId) ?? req.studentName}
                      <span className="chip text-[11px]">{req.studentId}</span>
                      {!inRoster && (
                        <span className="text-[11px] text-rose2-400 font-bold">⚠ 명단에 없는 자리</span>
                      )}
                      {reassigning && (
                        <span className="text-[11px] text-amber-700 font-bold">↔ 연결 이전</span>
                      )}
                    </div>
                    <div className="text-sm text-ink-600 mt-1 break-all">
                      {req.displayName ? <b>{req.displayName}</b> : null} {req.email}
                    </div>
                    {reassigning && (
                      <div className="text-[12px] text-amber-800 mt-1 leading-relaxed">
                        기존 연결: {occupant} → 승인 시 새 계정으로 이전 (기록은 보존)
                      </div>
                    )}
                    <div className="text-[11px] text-ink-400 mt-1">
                      신청 {new Date(req.requestedAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => approve(req)}
                      disabled={busy}
                      className="btn-gold px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {busy ? '처리 중…' : '승인'}
                    </button>
                    <button
                      onClick={() => reject(req)}
                      disabled={busy}
                      className="btn-ghost px-3 py-2 text-sm disabled:opacity-60"
                    >
                      거절
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <BulkLinkPanel />
    </section>
  )
}

/* ── 시트 붙여넣기로 계정 일괄 연결 ──
   "이름,이메일" 줄들을 붙여넣으면 명단과 이름을 대조해 student_email_map에 한 번에 등록.
   학생들이 입장 신청 없이 첫 로그인부터 자기 데이터로 연결된다. */
function BulkLinkPanel() {
  const roster = useRoster()
  const [emailMap, setEmailMap] = useStudentEmailMap()
  const [text, setText] = useState('')
  const [done, setDone] = useState('')

  const parsed = text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split(/[,\t]+/).map(p => p.trim()).filter(Boolean)
    const email = parts.find(p => p.includes('@'))?.toLowerCase()
    const name = parts.find(p => !p.includes('@')) ?? ''
    const student = roster.find(s => s.realName === name || s.heroName === name)
    return { name, email, sid: student?.id }
  }).filter(r => r.name || r.email)

  const matched = parsed.filter(r => r.sid && r.email)
  const unmatched = parsed.filter(r => !r.sid || !r.email)
  const changed = matched.filter(r => emailMap[r.email!] !== r.sid)

  const apply = () => {
    if (!matched.length) return
    if (!confirm(`${matched.length}명의 계정을 명단과 연결할까요?\n(기존에 연결된 다른 계정은 끊지 않고 추가돼요 — 한 학생이 두 계정 모두로 들어올 수 있어요)`)) return
    setEmailMap(prev => {
      // 같은 자리(sid)의 기존 계정은 그대로 두고 추가한다 — 스페어 계정 허용.
      // 붙여넣은 이메일이 이미 다른 자리를 가리키고 있었다면 새 자리로 옮겨진다.
      const next: Record<string, string> = { ...prev }
      for (const r of matched) next[r.email!] = r.sid!
      return next
    })
    setDone(`✓ ${matched.length}명 연결 완료! 이제 해당 계정으로 로그인하면 바로 자기 자리로 들어가요.`)
    setText('')
  }

  return (
    <div className="mt-6 pt-5 border-t border-moss-darkest/10">
      <h3 className="font-display font-bold text-moss-darkest">📋 시트로 계정 일괄 연결</h3>
      <p className="text-xs text-ink-400 mt-1 mb-2 leading-relaxed">
        구글 시트에서 <b>이름·이메일 두 열을 복사해 붙여넣으면</b>(줄마다 「이름, 이메일」) 명단과 이름을 대조해 한 번에 연결해요.
        연결된 학생은 입장 신청 없이 첫 로그인부터 자동 입장합니다. 비밀번호 열은 붙여넣지 마세요.
        같은 학생에게 계정을 여러 번 연결하면 <b>기존 연결은 끊기지 않고 추가</b>돼요 — 스페어 계정도 같은 자리로 들어옵니다.
      </p>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setDone('') }}
        rows={5}
        placeholder={'강라윤, s21067@dajeong.sjedues.kr\n김민지, s21068@dajeong.sjedues.kr\n…'}
        className="pixel-input w-full font-mono text-xs leading-relaxed"
      />
      {parsed.length > 0 && (
        <div className="text-xs mt-2 space-y-1">
          <div className="text-moss-deep font-bold">
            ✅ 명단과 매칭 {matched.length}명 {changed.length !== matched.length && `(이 중 ${changed.length}명이 새로 연결/변경)`}
          </div>
          {unmatched.length > 0 && (
            <div className="text-rose2-400 font-bold">
              ⚠ 매칭 안 됨 {unmatched.length}명: {unmatched.map(r => r.name || r.email).join(', ')}
              <span className="font-normal text-ink-400"> — 이름이 「학생 명단」과 다르거나 명단에 없는 학생이에요</span>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button onClick={apply} disabled={!matched.length} className="btn-gold text-sm disabled:opacity-50">
          {matched.length ? `${matched.length}명 연결하기` : '연결하기'}
        </button>
        {done && <span className="text-sm text-moss-deep font-bold">{done}</span>}
      </div>
    </div>
  )
}

/* ------------------ 일력 선정 ------------------ */
function DailyFeatureSection() {
  const roster = useRoster()
  const { map } = useStudentStateMap()
  const feature = useDailyFeature()
  const today = todayStr()
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')

  // 오늘 제출한 학생 일력
  const submissions = roster
    .map(s => ({ s, sk: map[s.id]?.dailySketch }))
    .filter(x => x.sk && x.sk.date === today)

  const pickStudent = (heroName: string, sk: { text: string; imageDataUrl: string }) => {
    setDailyFeature({ date: today, text: sk.text || '오늘의 한마디', author: heroName, sketchUrl: sk.imageDataUrl })
    alert(`✦ ${heroName} 학생의 일력을 오늘의 홈 일력으로 선정했어요.`)
  }
  const saveManual = () => {
    if (!text.trim()) { alert('명언/문구를 입력해 주세요.'); return }
    setDailyFeature({ date: today, text: text.trim(), author: author.trim() })
    alert('✦ 오늘의 명언을 저장했어요.')
  }
  const clear = () => {
    if (!confirm('오늘의 일력 선정을 해제할까요? (홈은 기본 문구로 돌아갑니다)')) return
    setDailyFeature(null)
  }

  return (
    <section className="card-temple p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900">📅 일력 선정</h2>
        <p className="text-sm text-ink-500">학생들 홈 화면의 「오늘의 일력」에 보일 명언과 그림을 정해요.</p>
      </div>

      {/* 현재 선정 */}
      <div className="rounded-2xl border-2 border-gold-300 bg-gold-50/40 p-4">
        <div className="font-display font-bold text-ink-900 mb-1">현재 선정</div>
        {feature ? (
          <div className="flex items-center gap-3 flex-wrap">
            {feature.sketchUrl && <img src={feature.sketchUrl} alt="" style={{ width: 120, borderRadius: 10, border: '2px solid var(--border)' }} />}
            <div className="flex-1 min-w-0">
              <div className="text-ink-900">“{feature.text}”</div>
              {feature.author && <div className="text-sm text-ink-500 mt-1">— {feature.author}</div>}
              <div className="text-xs text-ink-400 mt-1">{feature.date}</div>
            </div>
            <button onClick={clear} className="btn-ghost text-xs">선정 해제</button>
          </div>
        ) : (
          <div className="text-sm text-ink-500">아직 선정 안 함 — 홈은 기본 문구로 표시돼요.</div>
        )}
      </div>

      {/* 직접 입력 */}
      <div className="rounded-2xl border-2 border-water/40 bg-water-light/20 p-4 space-y-2">
        <div className="font-display font-bold text-ink-900">직접 입력</div>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="명언/문구 (예: 점수가 중요한 게 아니야, 그냥 즐기면 돼!)" className="pixel-input w-full" />
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="이름 (예: 김태희 어린이)" className="pixel-input w-full" />
        <div className="flex justify-end">
          <button onClick={saveManual} className="btn-gold text-sm">이 문구로 선정</button>
        </div>
      </div>

      {/* 오늘 제출된 학생 일력 */}
      <div>
        <div className="font-display font-bold text-ink-900 mb-2">오늘 제출된 학생 일력 ({submissions.length})</div>
        {submissions.length === 0 ? (
          <div className="card-soft p-4 text-sm text-ink-500">오늘 「신탁 두루마리 → 일력 도전」에서 제출한 학생이 아직 없어요.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {submissions.map(({ s, sk }) => (
              <div key={s.id} className="card-soft p-3">
                <img src={sk!.imageDataUrl} alt="" style={{ width: '100%', borderRadius: 10, border: '2px solid var(--border)', display: 'block' }} />
                <div className="font-display text-sm text-ink-900 mt-2">{s.heroName}</div>
                {sk!.text && <div className="text-xs text-ink-500 mt-0.5 line-clamp-2">“{sk!.text}”</div>}
                <button onClick={() => pickStudent(s.heroName, sk!)} className="btn-gold text-xs w-full mt-2">이 학생 선정</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------ 학생 명단 관리 ------------------ */
const BASE_TITLE_COLORS: TitleColor[] = ['gold', 'blue', 'green', 'rose']

function blankStudentFor(id: string, name: string, idx: number) {
  return {
    id,
    heroName: name,
    realName: name,
    avatarSeed: id,
    title: '새내기 견습',
    titleColor: BASE_TITLE_COLORS[idx % BASE_TITLE_COLORS.length],
    cookies: 0,
    todayScore: 0,
    streak: 0,
    level: 1,
    missionsDone: 0,
  }
}

function parseRosterCsv(text: string): {
  rows: Array<{ id: string; name: string; email?: string }>
  errors: string[]
} {
  const rows: Array<{ id: string; name: string; email?: string }> = []
  const errors: string[] = []
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  for (const line of lines) {
    // 헤더 줄 건너뛰기
    if (/^(code|코드|id)\b/i.test(line) && /(name|이름)/i.test(line)) continue
    const parts = line.split(/[,\t]/).map(p => p.trim())
    const nonEmpty = parts.filter(Boolean)
    if (nonEmpty.length < 2) { errors.push(`형식 오류: "${line}"`); continue }
    const id = nonEmpty[0]
    const name = nonEmpty[1]
    const emailRaw = nonEmpty[2]
    if (!/^[A-Za-z0-9_-]+$/.test(id)) { errors.push(`코드 형식 오류: ${id}`); continue }
    let email: string | undefined
    if (emailRaw) {
      const e = emailRaw.toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        errors.push(`이메일 형식 오류 (${id}): ${emailRaw}`)
      } else {
        email = e
      }
    }
    rows.push({ id, name, email })
  }
  return { rows, errors }
}

function RosterSection() {
  const roster = useRoster()
  const { setMap } = useStudentStateMap()
  const [, setEmailMap] = useStudentEmailMap()
  const [paste, setPaste] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('append')
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')

  const applyPaste = () => {
    const { rows, errors } = parseRosterCsv(paste)
    if (rows.length === 0) {
      alert(errors.length ? `읽을 수 있는 행이 없습니다.\n${errors.slice(0, 5).join('\n')}` : '내용이 비어 있어요.')
      return
    }
    if (errors.length > 0 && !confirm(`주의: ${errors.length}개의 줄을 건너뜁니다.\n${errors.slice(0, 5).join('\n')}\n\n계속할까요?`)) return

    const emailsInCsv = rows.filter(r => r.email).length

    if (mode === 'replace') {
      if (!confirm(`현재 ${roster.length}명을 새 ${rows.length}명으로 교체합니다.${emailsInCsv ? `\n구글 매핑 ${emailsInCsv}개도 함께 새로 적용됩니다(기존 매핑은 모두 사라집니다).` : ''}\n계속할까요?`)) return
      const next = rows.map((r, i) => blankStudentFor(r.id, r.name, i))
      setRoster(next)
      // replace 모드: 매핑도 시트 기반으로 통째 교체
      const newMap: Record<string, string> = {}
      for (const r of rows) {
        if (r.email) newMap[r.email] = r.id
      }
      setEmailMap(newMap)
    } else {
      // 기존 + 추가 (중복 코드 무시)
      const existing = new Set(roster.map(s => s.id))
      const added = rows.filter(r => !existing.has(r.id))
      if (added.length === 0 && emailsInCsv === 0) {
        alert('새로 추가할 학생도, 이메일 매핑도 없습니다.')
        return
      }
      if (added.length > 0) {
        const next = [...roster, ...added.map((r, i) => blankStudentFor(r.id, r.name, roster.length + i))]
        setRoster(next)
      }
      // append 모드: 이메일이 있는 행만 매핑에 추가/덮어쓰기 (시트 기준 우선)
      if (emailsInCsv > 0) {
        setEmailMap(prev => {
          const next = { ...prev }
          for (const r of rows) {
            if (r.email) next[r.email] = r.id
          }
          return next
        })
      }
    }
    setPaste('')
    alert(`✦ 명단을 갱신했습니다.${emailsInCsv ? ` (구글 매핑 ${emailsInCsv}개 포함)` : ''}`)
  }

  const addOne = () => {
    if (!newCode.trim() || !newName.trim()) { alert('코드와 이름을 입력해 주세요.'); return }
    if (roster.find(s => s.id === newCode.trim())) { alert('이미 존재하는 코드입니다.'); return }
    setRoster([...roster, blankStudentFor(newCode.trim(), newName.trim(), roster.length)])
    setNewCode(''); setNewName('')
  }

  const remove = (id: string) => {
    if (!confirm(`${id} 학생을 명단에서 제거할까요? (그 학생의 활동 기록은 남아 있습니다)`)) return
    setRoster(roster.filter(s => s.id !== id))
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id); setEditName(name); setEditCode(id)
  }
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditCode('') }
  const saveEdit = () => {
    if (!editingId) return
    const trimmedName = editName.trim()
    const trimmedCode = editCode.trim()
    if (!trimmedName) { alert('이름을 입력해 주세요.'); return }
    if (!trimmedCode) { alert('코드를 입력해 주세요.'); return }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
      alert('코드는 영문/숫자/_/- 만 사용할 수 있어요.')
      return
    }
    // 코드가 바뀌었으면 중복 체크 + 그 학생의 활동 기록(state)을 새 코드로 이전
    if (trimmedCode !== editingId) {
      if (roster.find(s => s.id === trimmedCode)) {
        alert('이미 존재하는 코드입니다.')
        return
      }
      if (!confirm(`코드를 「${editingId}」 → 「${trimmedCode}」 로 바꿉니다.\n그 학생의 활동 기록(쿠키·일기·미션 등)과 구글 매핑은 새 코드로 함께 이동돼요.\n계속할까요?`)) return
      // 학생 state 키 이동
      setMap(prev => {
        if (!prev[editingId]) return prev
        const { [editingId]: moved, ...rest } = prev
        return { ...rest, [trimmedCode]: moved }
      })
      // 구글 매핑의 값도 새 코드로 이동
      setEmailMap(prev => {
        let changed = false
        const next: Record<string, string> = {}
        for (const [em, sid] of Object.entries(prev)) {
          if (sid === editingId) { next[em] = trimmedCode; changed = true }
          else next[em] = sid
        }
        return changed ? next : prev
      })
    }
    setRoster(roster.map(s => s.id === editingId
      ? { ...s, id: trimmedCode, heroName: trimmedName, realName: trimmedName }
      : s))
    cancelEdit()
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">📋 학생 명단</h2>
          <p className="text-sm text-ink-500">CSV 붙여넣기 또는 직접 추가/수정으로 명단을 관리합니다.</p>
        </div>
        <span className="chip">{roster.length}명</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 입력 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gold-200/40 p-4 space-y-2">
            <div className="font-display text-base font-bold text-ink-900">+ 한 명 추가</div>
            <div className="flex gap-2">
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="코드 (예: god22)"
                className="flex-1 px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="이름"
                className="flex-1 px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
              />
              <button onClick={addOne} className="btn-gold text-sm whitespace-nowrap">+ 추가</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gold-200/40 p-4 space-y-2">
            <div className="font-display text-base font-bold text-ink-900">📥 CSV / 텍스트 붙여넣기</div>
            <p className="text-xs text-ink-500 leading-relaxed">
              형식: <code>코드,이름</code> 또는 <code>코드,이름,이메일</code> 한 줄에 한 명 (헤더 행은 자동 무시)<br />
              <b>이메일</b>을 함께 넣으면 학생 구글 매핑이 자동으로 등록돼서, 학생이 첫 로그인 시 코드 입력 없이 바로 입장됩니다.
            </p>
            <textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              placeholder={'god01,강라윤,raun@dajeong.sjedues.kr\ngod02,김민지,minji@dajeong.sjedues.kr\n...'}
              rows={6}
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white font-mono text-sm resize-y"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-full bg-cream-200/60 border border-gold-200/40">
                <button
                  onClick={() => setMode('append')}
                  className={`px-3 py-1.5 rounded-full text-xs font-display ${mode === 'append' ? 'bg-white shadow-temple text-ink-900' : 'text-ink-500'}`}
                >추가</button>
                <button
                  onClick={() => setMode('replace')}
                  className={`px-3 py-1.5 rounded-full text-xs font-display ${mode === 'replace' ? 'bg-white shadow-temple text-ink-900' : 'text-ink-500'}`}
                >전체 교체</button>
              </div>
              <button onClick={applyPaste} disabled={!paste.trim()} className="btn-gold text-sm disabled:opacity-50">
                📥 적용
              </button>
            </div>
          </div>
        </div>

        {/* 목록 */}
        <div className="bg-white rounded-2xl border border-gold-200/40 p-2 max-h-[560px] overflow-y-auto">
          {roster.length === 0 ? (
            <div className="text-sm text-ink-500 py-6 text-center">아직 명단이 비어 있습니다.</div>
          ) : roster.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-3 border-b border-gold-200/30 last:border-b-0">
              <img src={avatarUrl(s.avatarSeed)} className="w-11 h-11 rounded-md bg-cream-100 border border-gold-200/30 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
              <div className="flex-1 min-w-0">
                {editingId === s.id ? (
                  <div className="space-y-1.5">
                    <div>
                      <div className="text-[10px] text-ink-500 mb-0.5">코드</div>
                      <input
                        value={editCode}
                        onChange={e => setEditCode(e.target.value)}
                        placeholder="예: god01"
                        className="w-full px-2 py-1 rounded-md border-2 border-gold-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-500 mb-0.5">이름</div>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                        placeholder="예: 강라윤"
                        className="w-full px-2 py-1 rounded-md border-2 border-gold-300 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-ink-500 font-mono">{s.id}</div>
                    <div className="font-display text-base font-bold text-ink-900 truncate">{s.heroName}</div>
                  </>
                )}
              </div>
              {editingId === s.id ? (
                <div className="flex gap-1.5 flex-shrink-0 flex-col sm:flex-row">
                  <button
                    onClick={saveEdit}
                    className="px-3 py-2 rounded-lg bg-gold-100 border-2 border-moss-darkest font-display text-xs hover:bg-gold-200"
                  >✓ 저장</button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-2 rounded-lg bg-white border-2 border-moss-darkest/40 font-display text-xs hover:bg-moss-mist"
                  >✕ 취소</button>
                </div>
              ) : (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => startEdit(s.id, s.heroName)}
                    title="이름 수정"
                    aria-label={`${s.heroName} 이름 수정`}
                    className="w-10 h-10 grid place-items-center rounded-lg bg-white border-2 border-moss-darkest/40 text-lg hover:bg-moss-mist hover:border-moss-darkest active:translate-y-px"
                  >✏️</button>
                  <button
                    onClick={() => remove(s.id)}
                    title="명단에서 삭제"
                    aria-label={`${s.heroName} 명단에서 삭제`}
                    className="w-10 h-10 grid place-items-center rounded-lg bg-white border-2 border-rose2-300 text-lg hover:bg-rose2-100 hover:border-rose2-400 active:translate-y-px"
                  >🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <EmailMappingManager />
    </section>
  )
}

/* ──────────────── 학생 구글 계정 ↔ 학생 코드 매핑 관리 ──────────────── */
function EmailMappingManager() {
  const [map, setMap] = useStudentEmailMap()
  const roster = useRoster()
  const rosterById = useMemo(() => new Map(roster.map(s => [s.id, s])), [roster])
  const entries = Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]))

  const unlink = (email: string) => {
    const sid = map[email]
    const student = rosterById.get(sid)
    if (!confirm(`매핑을 풀까요?\n\n  ${email}  →  ${student?.heroName ?? sid}\n\n다음 번 이 구글 계정으로 로그인할 때 학생 코드를 다시 입력하게 됩니다.`)) return
    const { [email]: _removed, ...rest } = map
    setMap(rest)
  }

  const clearAll = () => {
    if (entries.length === 0) return
    if (!confirm(`전체 매핑 ${entries.length}개를 모두 풀까요? (학년/학기 초기화용)\n학생들은 다음 로그인 시 코드를 다시 입력해야 합니다.`)) return
    setMap({})
  }

  return (
    <div className="mt-5 border-2 border-water/40 rounded-2xl p-4 bg-water-light/20">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <h3 className="font-display text-base font-bold text-ink-900">🔑 학생 구글 계정 매핑</h3>
          <p className="text-xs text-ink-500 leading-relaxed">
            학생이 처음 구글 로그인할 때 자기 학생 코드를 입력하면 여기에 자동으로 기록돼요.
            계정을 바꾸거나 학년이 바뀌면 매핑을 풀어주세요.
          </p>
        </div>
        {entries.length > 0 && (
          <button onClick={clearAll} className="btn-ghost text-xs text-rose2-500">전체 매핑 풀기</button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-xs text-ink-500 py-3">아직 등록된 매핑이 없습니다. 학생이 처음 구글 로그인할 때 만들어집니다.</div>
      ) : (
        <div className="space-y-1.5 mt-2">
          {entries.map(([email, sid]) => {
            const student = rosterById.get(sid)
            const orphan = !student
            return (
              <div key={email}
                   className={`flex items-center gap-2 flex-wrap rounded-lg px-3 py-2 text-sm border ${orphan ? 'border-rose2-300 bg-rose2-100/30' : 'border-gold-200/40 bg-white'}`}>
                <span className="font-mono text-xs flex-shrink-0">{sid}</span>
                <span className="font-display font-bold text-ink-900 flex-shrink-0">
                  {student ? student.heroName : '(명단에 없음)'}
                </span>
                <span className="text-xs text-ink-500 truncate flex-1 min-w-0">{email}</span>
                <button onClick={() => unlink(email)}
                        className="text-xs text-rose2-500 hover:text-rose2-600 flex-shrink-0">풀기</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ──────────────── (deprecated) 고아 아고라 포스트 재할당 ──────────────── */
function _OrphanPostsReassign_unused() {
  const roster = useRoster()
  const [posts, setPosts] = useAgoraPosts()
  const [{ }, setMapDummy] = useState({})   // re-render trigger after assignments
  const [assign, setAssign] = useState<Record<string, string>>({})  // 옛코드 → 새 학생 sid

  const rosterIds = useMemo(() => new Set(roster.map(s => s.id)), [roster])
  const groups = useMemo(() => {
    const out: Record<string, { count: number; samples: typeof posts; lastName?: string }> = {}
    posts.forEach(p => {
      if (rosterIds.has(p.studentId)) return
      const g = out[p.studentId] ?? (out[p.studentId] = { count: 0, samples: [], lastName: undefined })
      g.count++
      if (g.samples.length < 2) g.samples.push(p)
      if (p.studentName && !g.lastName) g.lastName = p.studentName
    })
    return out
  }, [posts, rosterIds])

  const orphanCodes = Object.keys(groups).sort()
  if (orphanCodes.length === 0) return null

  const apply = (oldCode: string) => {
    const newSid = assign[oldCode]
    if (!newSid) { alert('이전할 학생을 골라주세요.'); return }
    const newStudent = roster.find(s => s.id === newSid)
    if (!newStudent) return
    if (!confirm(`옛 코드 「${oldCode}」 로 적힌 ${groups[oldCode].count}개의 글을\n→ 「${newStudent.heroName} (${newSid})」 학생에게 이전합니다.\n계속할까요?`)) return
    setPosts(prev => prev.map(p =>
      p.studentId === oldCode
        ? { ...p, studentId: newSid, studentName: newStudent.heroName }
        : p
    ))
    setMapDummy({})
    alert(`✦ ${groups[oldCode].count}개의 글을 ${newStudent.heroName} 학생에게 이전했어요.`)
  }

  const applyAll = () => {
    const ready = orphanCodes.filter(c => assign[c])
    if (ready.length === 0) { alert('이전할 학생을 하나라도 골라주세요.'); return }
    const summary = ready.map(c => {
      const newStudent = roster.find(s => s.id === assign[c])
      return `「${c}」 (${groups[c].count}장) → ${newStudent?.heroName ?? '?'}`
    }).join('\n')
    if (!confirm(`아래 매핑대로 일괄 이전합니다:\n\n${summary}\n\n계속할까요?`)) return
    setPosts(prev => prev.map(p => {
      const newSid = assign[p.studentId]
      if (!newSid) return p
      const newStudent = roster.find(s => s.id === newSid)
      return newStudent
        ? { ...p, studentId: newSid, studentName: newStudent.heroName }
        : p
    }))
    setMapDummy({})
    alert(`✦ ${ready.length}개의 옛 코드를 일괄 이전했어요.`)
  }

  return (
    <div className="mt-5 border-2 border-rose2-300 rounded-2xl p-4 bg-rose2-100/30">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <h3 className="font-display text-base font-bold text-ink-900">🪶 옛 코드의 활동 기록 재할당</h3>
          <p className="text-xs text-ink-500">
            현재 명단에 없는 옛 학생 코드로 작성된 아고라 글이 <b>{Object.values(groups).reduce((a,g)=>a+g.count,0)}개</b> 있어요.
            각 옛 코드를 어느 현재 학생의 글로 합칠지 골라 이전해 주세요.
          </p>
        </div>
        <button onClick={applyAll} className="btn-gold text-xs">✦ 매핑된 것 모두 이전</button>
      </div>

      <div className="space-y-2 mt-3">
        {orphanCodes.map(code => {
          const g = groups[code]
          return (
            <div key={code} className="bg-white rounded-xl border border-rose2-200 p-3">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="chip">옛 코드 <b className="ml-1 font-mono">{code}</b></span>
                <span className="chip chip-rose">{g.count}장</span>
                {g.lastName && <span className="chip chip-blue">snapshot: {g.lastName}</span>}
              </div>
              <div className="text-xs text-ink-700 space-y-1 mb-2">
                {g.samples.map(s => (
                  <div key={s.id} className="line-clamp-1">
                    · "{(s.content || '(이미지)').slice(0, 60)}"
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={assign[code] ?? ''}
                  onChange={e => setAssign(prev => ({ ...prev, [code]: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg border-2 border-moss-darkest/30 bg-white text-sm font-display"
                >
                  <option value="">— 학생 선택 —</option>
                  {roster.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.heroName} ({s.id})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => apply(code)}
                  disabled={!assign[code]}
                  className="btn-gold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >이 코드 이전</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------ 미션 관리 ------------------ */
function MissionsAdminSection() {
  const [missions, setMissions] = useMissions()
  const [titles] = useCustomTitles()
  const { map, update } = useStudentStateMap()
  const roster = useRoster()

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [reward, setReward] = useState<number | ''>('')
  const [rewardTitleId, setRewardTitleId] = useState<string>('')
  const [tier, setTier] = useState<'MAIN' | 'SIDE' | 'TRIVIAL'>('SIDE')
  const [deadline, setDeadline] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const reset = () => {
    setTitle(''); setDesc(''); setReward(''); setRewardTitleId('')
    setTier('SIDE'); setDeadline(''); setEditingId(null)
  }

  const submit = () => {
    if (!title.trim()) { alert('미션 이름을 입력해 주세요.'); return }
    if (editingId) {
      setMissions(prev => prev.map(m => m.id === editingId
        ? { ...m, title: title.trim(), description: desc.trim() || undefined,
            rewardCookies: typeof reward === 'number' ? reward : undefined,
            rewardTitleId: rewardTitleId || undefined,
            tier, deadline: deadline.trim() || undefined }
        : m))
      reset()
      return
    }
    const m: Mission = {
      id: `m${Date.now()}`,
      title: title.trim(),
      description: desc.trim() || undefined,
      rewardCookies: typeof reward === 'number' ? reward : undefined,
      rewardTitleId: rewardTitleId || undefined,
      tier,
      deadline: deadline.trim() || undefined,
      createdAt: new Date().toISOString(),
      active: true,
    }
    setMissions(prev => [...prev, m])
    reset()
  }

  const edit = (m: Mission) => {
    setEditingId(m.id)
    setTitle(m.title)
    setDesc(m.description ?? '')
    setReward(m.rewardCookies ?? '')
    setRewardTitleId(m.rewardTitleId ?? '')
    setTier(m.tier ?? 'SIDE')
    setDeadline(m.deadline ?? '')
  }

  const remove = (id: string) => {
    if (!confirm('이 미션을 삭제할까요? (학생들의 완료 기록은 남아 있지만 더는 표시되지 않습니다)')) return
    setMissions(prev => prev.filter(m => m.id !== id))
    if (editingId === id) reset()
  }

  const toggleActive = (id: string) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  // 학생별 완료 수 집계
  const completionCount = useMemo(() => {
    const out: Record<string, number> = {}
    missions.forEach(m => out[m.id] = 0)
    Object.values(map).forEach(s => {
      (s.missionCompletions ?? []).forEach(c => { if (out[c.missionId] !== undefined) out[c.missionId]++ })
    })
    return out
  }, [missions, map])

  // 특정 미션을 완료한 학생 목록 (명단 순서 보존)
  const completersOf = (missionId: string) => {
    const out: Array<{ sid: string; heroName: string; completedAt: string }> = []
    for (const s of roster) {
      const c = (map[s.id]?.missionCompletions ?? []).find(x => x.missionId === missionId)
      if (c) out.push({ sid: s.id, heroName: s.heroName, completedAt: c.completedAt })
    }
    return out.sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  }

  const undoCompletion = (sid: string, missionId: string, heroName: string) => {
    if (!confirm(`${heroName} 학생의 이 미션 완료 기록을 풀까요?\n(이미 지급된 쿠키는 자동 회수되지 않아요 — 필요 시 쿠키 조정에서 수동으로 차감하세요.)`)) return
    update(sid, s => ({
      ...s,
      missionCompletions: (s.missionCompletions ?? []).filter(c => c.missionId !== missionId),
    }))
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">🎯 미션 관리</h2>
          <p className="text-sm text-ink-500">학생들에게 부여할 과제를 만듭니다. 완료 시 쿠키나 호칭을 보상으로 줄 수 있어요.</p>
        </div>
        <span className="chip">{missions.filter(m => m.active).length}개 활성</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 생성/편집 폼 */}
        <div className="bg-white rounded-2xl border border-gold-200/40 p-4 space-y-3">
          <div className="font-display text-base font-bold text-ink-900">{editingId ? '✎ 미션 수정' : '+ 새 미션 만들기'}</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="미션 이름 (예: 수학 익힘책 75쪽 풀기)"
            className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="설명 (선택) — 학생들에게 안내할 추가 정보"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white resize-y"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-ink-500 block">
              <span className="block mb-1">위계 (tier)</span>
              <select
                value={tier}
                onChange={e => setTier(e.target.value as 'MAIN' | 'SIDE' | 'TRIVIAL')}
                className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
              >
                <option value="MAIN">★ MAIN — 오늘의 미션 (큰 배너 1개)</option>
                <option value="SIDE">◆ SIDE — 곁들의 미션 (카드)</option>
                <option value="TRIVIAL">· TRIVIAL — 가벼운 항목 (칩)</option>
              </select>
            </label>
            <label className="text-xs text-ink-500 block">
              <span className="block mb-1">마감 안내 (선택)</span>
              <input
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                placeholder="예: 오늘 하교 전까지"
                className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
              />
            </label>
            <label className="text-xs text-ink-500 block">
              <span className="block mb-1">쿠키 보상</span>
              <input
                type="number"
                min={0}
                value={reward}
                onChange={e => setReward(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                placeholder="예: 3"
                className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
              />
            </label>
            <label className="text-xs text-ink-500 block">
              <span className="block mb-1">호칭 보상 (선택)</span>
              <select
                value={rewardTitleId}
                onChange={e => setRewardTitleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
              >
                <option value="">— 없음 —</option>
                {titles.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            {editingId && <button onClick={reset} className="btn-ghost text-xs">취소</button>}
            <button onClick={submit} className="btn-gold text-sm">{editingId ? '✦ 수정 저장' : '+ 미션 추가'}</button>
          </div>
        </div>

        {/* 목록 */}
        <div className="space-y-2">
          {missions.length === 0 ? (
            <div className="text-sm text-ink-500 py-4">아직 등록된 미션이 없습니다.</div>
          ) : missions.map(m => {
            const rewardTitle = m.rewardTitleId ? titles.find(t => t.id === m.rewardTitleId) : null
            const expanded = expandedId === m.id
            const doneCount = completionCount[m.id] ?? 0
            return (
              <div key={m.id} className={`bg-white rounded-2xl border border-gold-200/40 p-3 ${!m.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(prev => prev === m.id ? null : m.id)}
                    className="flex-1 min-w-0 text-left rounded-lg hover:bg-cream-200/40 -m-1 p-1 transition"
                    title="클릭하면 완료한 학생 명단이 펼쳐져요"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-400 text-xs flex-shrink-0">{expanded ? '▾' : '▸'}</span>
                      <span className="font-display font-bold text-ink-900 text-sm">{m.title}</span>
                    </div>
                    {m.description && <div className="text-xs text-ink-500 mt-0.5 ml-5">{m.description}</div>}
                    <div className="mt-1 ml-5 flex flex-wrap gap-1.5 text-[11px]">
                      {m.rewardCookies ? <span className="chip text-[10px]">🍪 +{m.rewardCookies}</span> : null}
                      {rewardTitle && <span className="chip text-[10px]">{rewardTitle.icon} {rewardTitle.name}</span>}
                      <span className={`chip text-[10px] ${doneCount > 0 ? 'chip-green' : ''}`}>완료 {doneCount}명 / {roster.length}명</span>
                      {!m.active && <span className="chip chip-rose text-[10px]">비활성</span>}
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => edit(m)} className="text-xs text-ink-500 hover:text-ink-900">✎ 수정</button>
                    <button onClick={() => toggleActive(m.id)} className="text-xs text-ink-500 hover:text-ink-900">
                      {m.active ? '⊘ 비활성' : '✓ 활성'}
                    </button>
                    <button onClick={() => remove(m.id)} className="text-xs text-rose2-400 hover:text-rose2-500">🗑 삭제</button>
                  </div>
                </div>

                {expanded && (() => {
                  const completers = completersOf(m.id)
                  const doneSet = new Set(completers.map(c => c.sid))
                  const undone = roster.filter(s => !doneSet.has(s.id))
                  return (
                    <div className="mt-3 pt-3 border-t border-gold-200/40 space-y-3">
                      <div>
                        <div className="text-xs font-display font-bold text-moss-darkest mb-1.5">
                          ✓ 완료한 학생 ({completers.length}명)
                        </div>
                        {completers.length === 0 ? (
                          <div className="text-xs text-ink-500 italic">아직 아무도 완수하지 않았어요.</div>
                        ) : (
                          <ul className="space-y-1">
                            {completers.map(c => (
                              <li key={c.sid} className="flex items-center gap-2 text-xs bg-moss-mist/30 rounded-lg px-2.5 py-1.5">
                                <span className="font-mono text-[10px] text-ink-500">{c.sid}</span>
                                <span className="font-display font-bold text-ink-900">{c.heroName}</span>
                                <span className="text-[10px] text-ink-500 flex-1">
                                  · {new Date(c.completedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                  onClick={() => undoCompletion(c.sid, m.id, c.heroName)}
                                  className="text-[10px] text-rose2-500 hover:text-rose2-600 flex-shrink-0"
                                  title="이 학생의 완료 기록을 풀어요"
                                >
                                  ↺ 풀기
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {undone.length > 0 && (
                        <div>
                          <div className="text-xs font-display font-bold text-ink-500 mb-1.5">
                            · 아직 안 한 학생 ({undone.length}명)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {undone.map(s => (
                              <span key={s.id} className="text-[11px] bg-white border border-ink-500/15 rounded-full px-2 py-0.5">
                                {s.heroName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------ 아고라 주제 관리 ------------------ */
function AgoraTopicsSection() {
  const [topics, setTopics] = useAgoraTopics()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [padletUrl, setPadletUrl] = useState('')
  const [visibility, setVisibility] = useState<AgoraVisibility>('public')
  const [editingId, setEditingId] = useState<string | null>(null)

  const reset = () => {
    setTitle(''); setDesc(''); setPadletUrl(''); setVisibility('public'); setEditingId(null)
  }

  const submit = () => {
    if (!title.trim()) { alert('주제 제목을 입력해 주세요.'); return }
    const url = padletUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      alert('링크는 http:// 또는 https:// 로 시작해야 해요.')
      return
    }
    if (editingId) {
      setTopics(prev => prev.map(t => t.id === editingId
        ? {
            ...t, title: title.trim(), description: desc.trim() || undefined,
            padletUrl: url || undefined, visibility,
          }
        : t))
      reset()
      return
    }
    const t: AgoraTopic = {
      id: `a${Date.now()}`,
      title: title.trim(),
      description: desc.trim() || undefined,
      createdAt: new Date().toISOString(),
      active: true,
      padletUrl: url || undefined,
      visibility,
    }
    setTopics(prev => [...prev, t])
    reset()
  }

  const edit = (t: AgoraTopic) => {
    setEditingId(t.id)
    setTitle(t.title)
    setDesc(t.description ?? '')
    setPadletUrl(t.padletUrl ?? '')
    setVisibility(t.visibility ?? 'public')
  }

  const remove = (id: string) => {
    if (!confirm('이 주제를 삭제할까요? (Padlet 링크 연결만 사라지며, Padlet 보드 자체는 그대로 남습니다)')) return
    setTopics(prev => prev.filter(t => t.id !== id))
    if (editingId === id) reset()
  }

  const toggleActive = (id: string) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">💬 아고라 주제 관리</h2>
          <p className="text-sm text-ink-500">학생들이 답할 주제를 만듭니다. 클릭하면 새 탭으로 Padlet 보드가 열려요.</p>
        </div>
        <span className="chip">{topics.filter(t => t.active).length}개 활성</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gold-200/40 p-4 space-y-3">
          <div className="font-display text-base font-bold text-ink-900">{editingId ? '✎ 주제 수정' : '+ 새 주제 만들기'}</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="주제 제목 (예: 나를 한 단어로 표현한다면?)"
            className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white"
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="설명/안내 (선택)"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white resize-y"
          />
          <div>
            <label className="block">
              <div className="text-xs text-ink-500 mb-1.5 font-bold">🔗 Padlet 링크 (필수)</div>
              <input
                value={padletUrl}
                onChange={e => setPadletUrl(e.target.value)}
                placeholder="https://padlet.com/..."
                className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white text-sm"
              />
              <div className="text-[11px] text-ink-500 mt-1">학생이 토픽을 클릭하면 이 링크가 새 탭으로 열립니다.</div>
            </label>
          </div>
          <div>
            <div className="text-xs text-ink-500 mb-1.5">공개 범위 표시</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setVisibility('public')}
                className={`px-3 py-2 rounded-xl border-2 text-left transition ${
                  visibility === 'public'
                    ? 'bg-gold-100 border-moss-darkest font-bold'
                    : 'bg-white border-moss-darkest/20 hover:border-moss-darkest/50'
                }`}
              >
                <div className="font-display text-sm">🌍 모두에게 공개</div>
                <div className="text-[11px] text-ink-500 mt-0.5">아고라 카드에 「모두에게」로 표시</div>
              </button>
              <button
                onClick={() => setVisibility('teacher')}
                className={`px-3 py-2 rounded-xl border-2 text-left transition ${
                  visibility === 'teacher'
                    ? 'bg-gold-100 border-moss-darkest font-bold'
                    : 'bg-white border-moss-darkest/20 hover:border-moss-darkest/50'
                }`}
              >
                <div className="font-display text-sm">🔒 선생님께만 공개</div>
                <div className="text-[11px] text-ink-500 mt-0.5">「선생님께만」 표시 (Padlet 권한도 별도 설정)</div>
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {editingId && <button onClick={reset} className="btn-ghost text-xs">취소</button>}
            <button onClick={submit} className="btn-gold text-sm">{editingId ? '✦ 수정 저장' : '+ 주제 추가'}</button>
          </div>
        </div>

        <div className="space-y-2">
          {topics.length === 0 ? (
            <div className="text-sm text-ink-500 py-4">아직 등록된 주제가 없습니다.</div>
          ) : topics.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl border border-gold-200/40 p-3 ${!t.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-ink-900 text-sm">{t.title}</div>
                  {t.description && <div className="text-xs text-ink-500 mt-0.5 line-clamp-2">{t.description}</div>}
                  {t.padletUrl && (
                    <a href={t.padletUrl} target="_blank" rel="noopener noreferrer"
                       className="text-[11px] text-water-deep underline break-all line-clamp-1 block mt-1">
                      🔗 {t.padletUrl}
                    </a>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    {t.padletUrl
                      ? <span className="chip chip-blue text-[10px]">🔗 링크 연결됨</span>
                      : <span className="chip chip-rose text-[10px]">⚠ 링크 없음</span>}
                    {(t.visibility ?? 'public') === 'teacher'
                      ? <span className="chip chip-rose text-[10px]">🔒 선생님께만</span>
                      : <span className="chip chip-green text-[10px]">🌍 모두에게</span>}
                    {!t.active && <span className="chip chip-rose text-[10px]">비활성</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => edit(t)} className="text-xs text-ink-500 hover:text-ink-900">✎ 수정</button>
                  <button onClick={() => toggleActive(t.id)} className="text-xs text-ink-500 hover:text-ink-900">
                    {t.active ? '⊘ 비활성' : '✓ 활성'}
                  </button>
                  <button onClick={() => remove(t.id)} className="text-xs text-rose2-400 hover:text-rose2-500">🗑 삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------ 감정일기 열람·피드백 ------------------ */
function DiariesSection() {
  const { map, get, update } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()
  const [selectedSid, setSelectedSid] = useState<string | null>(null)
  const [openDate, setOpenDate] = useState<string | null>(null)
  // key = `${studentId}:${date}` — 학생별/날짜별로 분리해서 보관해야 다른 학생에게 흘러가지 않음
  const [draft, setDraft] = useState<Record<string, string>>({})

  const draftKey = (sid: string, date: string) => `${sid}:${date}`

  const studentsWithCounts = useMemo(() =>
    MOCK_STUDENTS.map(s => {
      const ds = map[s.id]?.diaries ?? []
      const newCount = ds.filter(d => !d.read && !d.teacherFeedback?.trim()).length
      return { s, total: ds.length, newCount, latest: [...ds].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date }
    })
  , [map, MOCK_STUDENTS])

  const selected = selectedSid ? MOCK_STUDENTS.find(s => s.id === selectedSid)! : null
  const diaries = selectedSid
    ? [...(get(selectedSid).diaries ?? [])].sort((a, b) => b.date.localeCompare(a.date))
    : []

  const saveFeedback = (date: string) => {
    if (!selectedSid) return
    const k = draftKey(selectedSid, date)
    const text = (draft[k] ?? '').trim()
    update(
      selectedSid,
      s => ({
        ...s,
        diaries: (s.diaries ?? []).map(d =>
          d.date === date
            ? { ...d, teacherFeedback: text, feedbackAt: new Date().toISOString() }
            : d
        ),
      }),
      (err) => alert(`⚠ 답장 저장 중 문제가 생겼어요. 새로고침 후 다시 시도해 주세요.\n\n${String(err)}`)
    )
    alert(`✦ ${selected?.heroName ?? ''} 학생에게 답장이 저장되었습니다.`)
  }

  // 교사가 일기를 펼치면(열람) 자동 읽음 표시
  const markRead = (date: string) => {
    if (!selectedSid) return
    update(selectedSid, s => ({
      ...s,
      diaries: (s.diaries ?? []).map(d => (d.date === date && !d.read ? { ...d, read: true } : d)),
    }))
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">🪶 감정일기 열람·답장</h2>
          <p className="text-sm text-ink-500">학생 이름을 누르면 그 학생의 일기 목록이 열립니다. 각 일기에 답장을 적어 저장하세요.</p>
        </div>
        {selected && (
          <button onClick={() => { setSelectedSid(null); setOpenDate(null) }} className="btn-ghost text-xs">⟵ 목록으로</button>
        )}
      </div>

      {!selected ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {studentsWithCounts.map(({ s, total, newCount, latest }) => (
            <button
              key={s.id}
              onClick={() => { setSelectedSid(s.id) }}
              className="text-left bg-white hover:bg-cream-100/60 border border-gold-200/50 rounded-2xl p-3 flex items-center gap-3 transition"
            >
              <img src={avatarUrl(s.avatarSeed)} className="w-10 h-10 rounded-md bg-cream-100" style={{ imageRendering: 'pixelated' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-display font-bold text-ink-900 truncate">{s.heroName}</div>
                  <div className="text-[11px] text-ink-500 truncate">{s.realName}</div>
                </div>
                <div className="text-xs text-ink-500">
                  일기 {total}편{latest && ` · 최근 ${latest}`}
                </div>
              </div>
              {newCount > 0 && (
                <span className="chip chip-blue text-[10px]" title="아직 안 읽은 새 일기 수">
                  new {newCount}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img src={avatarUrl(selected.avatarSeed)} className="w-10 h-10 rounded-md bg-cream-100 border border-gold-200/40" style={{ imageRendering: 'pixelated' }} />
            <div>
              <div className="font-display text-lg font-bold text-ink-900">{selected.heroName}</div>
              <div className="text-xs text-ink-500">{selected.realName} · 일기 {diaries.length}편</div>
            </div>
          </div>

          {diaries.length === 0 ? (
            <div className="text-sm text-ink-500 py-6 text-center bg-cream-100/40 rounded-xl">
              이 학생은 아직 작성한 일기가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gold-200/40 bg-white rounded-2xl border border-gold-200/40">
              {diaries.map(d => {
                const k = draftKey(selectedSid!, d.date)
                return (
                  <DiaryRow
                    key={k}
                    entry={d}
                    open={openDate === d.date}
                    onToggle={() => {
                      const opening = openDate !== d.date
                      setOpenDate(opening ? d.date : null)
                      if (opening) markRead(d.date)
                    }}
                    draft={draft[k] ?? d.teacherFeedback ?? ''}
                    onDraftChange={v => setDraft(prev => ({ ...prev, [k]: v }))}
                    onSave={() => saveFeedback(d.date)}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function DiaryRow({
  entry, open, onToggle, draft, onDraftChange, onSave,
}: {
  entry: DiaryEntry
  open: boolean
  onToggle: () => void
  draft: string
  onDraftChange: (v: string) => void
  onSave: () => void
}) {
  const hasFeedback = !!entry.teacherFeedback?.trim()
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-cream-100/50 transition">
        <span className="font-display font-bold text-ink-900 text-sm">📅 {entry.date}</span>
        {(() => {
          const list = (entry.emotions && entry.emotions.length > 0) ? entry.emotions : (entry.emotion ? [entry.emotion] : [])
          return list.length > 0 && <span className="chip text-[10px]">감정 · {list.join(', ')}</span>
        })()}
        {hasFeedback ? (
          <span className="chip chip-green text-[10px]">✓ 답장함</span>
        ) : !entry.read ? (
          <span className="chip chip-blue text-[10px]">new</span>
        ) : null}
        <span className="ml-auto text-xs text-ink-500">{open ? '접기 ▴' : '펴기 ▾'}</span>
      </button>
      {open && (
        <div className="px-3 pb-4 space-y-3">
          {entry.situation && (
            <p className="text-sm text-ink-700 whitespace-pre-wrap bg-cream-100/50 rounded-xl px-3 py-2">
              <b className="text-ink-900">1. 상황 — </b>{entry.situation}
            </p>
          )}
          {entry.reason && (
            <p className="text-sm text-ink-700 whitespace-pre-wrap bg-cream-100/50 rounded-xl px-3 py-2">
              <b className="text-ink-900">3. 이유 — </b>{entry.reason}
            </p>
          )}

          <div className="rounded-xl border border-gold-200/60 bg-white p-3">
            <div className="font-display font-bold text-ink-900 mb-2">🌿 선생님 답장</div>
            <textarea
              value={draft}
              onChange={e => onDraftChange(e.target.value)}
              rows={3}
              placeholder="학생에게 보낼 따뜻한 답장을 적어 주세요."
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-[11px] text-ink-500">
                {entry.feedbackAt
                  ? `마지막 저장: ${new Date(entry.feedbackAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                  : '아직 답장을 적지 않았어요.'}
              </div>
              <button onClick={onSave} className="btn-gold text-xs">✦ 답장 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------ 호칭 ------------------ */
function TitlesSection() {
  const [titles, setTitles] = useCustomTitles()
  const { map, update } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [icon, setIcon] = useState('🎖️')
  const [color, setColor] = useState<TitleColor>('gold')

  const [awardStudent, setAwardStudent] = useState(MOCK_STUDENTS[0]?.id ?? '')
  const [awardTitle, setAwardTitle] = useState('')

  const add = () => {
    if (!name.trim()) { alert('호칭 이름을 입력해 주세요.'); return }
    const t: CustomTitle = {
      id: `t${Date.now()}`,
      name: name.trim(),
      description: desc.trim(),
      icon: icon || '🎖️',
      color,
    }
    setTitles(prev => [...prev, t])
    setName(''); setDesc('')
  }

  const remove = (id: string) => {
    if (!confirm('이 호칭을 삭제할까요?')) return
    setTitles(prev => prev.filter(t => t.id !== id))
  }

  const give = () => {
    if (!awardTitle) { alert('부여할 호칭을 선택해 주세요.'); return }
    update(awardStudent, s => {
      const isNew = !s.ownedTitleIds.includes(awardTitle)
      const owned = isNew ? [...s.ownedTitleIds, awardTitle] : s.ownedTitleIds
      // 자동 노출 (3개 슬롯 여유 있을 때만)
      const curDisplay = s.displayTitleIds ?? (s.displayTitleId ? [s.displayTitleId] : [])
      const newDisplay = isNew && !curDisplay.includes(awardTitle) && curDisplay.length < 3
        ? [...curDisplay, awardTitle]
        : curDisplay
      return {
        ...s,
        ownedTitleIds: owned,
        displayTitleIds: newDisplay,
        displayTitleId: newDisplay[0],
      }
    })
    const st = MOCK_STUDENTS.find(s => s.id === awardStudent)!
    const tt = titles.find(t => t.id === awardTitle)!
    alert(`✦ ${st.heroName}에게 「${tt.icon} ${tt.name}」 호칭을 부여했습니다. (학생의 호칭 보관함에 자동 추가됨)`)
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">🎖️ 호칭 관리</h2>
          <p className="text-sm text-ink-500">새 호칭을 만들고, 학생에게 부여합니다. 학생은 두루마리에서 노출할 호칭을 고를 수 있어요.</p>
        </div>
        <span className="chip">{titles.length}개</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 새 호칭 만들기 */}
        <div className="bg-cream-100/60 border border-gold-200/40 rounded-2xl p-4 space-y-3">
          <div className="font-display font-bold text-ink-900 mb-1">+ 새 호칭 만들기</div>

          <label className="block text-xs text-ink-500">
            <span className="block mb-1">이름</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="호칭 이름 (예: 신탁자의 별)"
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white" />
          </label>

          <label className="block text-xs text-ink-500">
            <span className="block mb-1">이모지 아이콘 — 직접 입력하거나 아래에서 골라요</span>
            <div className="flex items-center gap-2">
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🎖️"
                className="w-20 px-3 py-2 rounded-xl border-2 border-gold-300 outline-none focus:border-gold-500 bg-white text-center text-2xl" />
              <span className="text-xs text-ink-500">현재: <span className="text-2xl align-middle">{icon || '🎖️'}</span></span>
            </div>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['🏆','🌟','⭐','✨','🌿','🌱','🌸','🌹','💐','🏛','⚔️','🛡','📖','🎯','🌙','☀️','💫','🔥','⚡','🌊','🦋','🐦','🐢','🦊','🐱','🐶','📜','🎼','🎨','🧩','🪄','🎪'].map(e => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                className={`w-9 h-9 rounded-lg border text-xl transition
                  ${icon === e ? 'bg-gold-100 border-gold-400 shadow-temple' : 'bg-white border-gold-200/50 hover:border-gold-300'}`}
                title={e}
              >{e}</button>
            ))}
          </div>

          <label className="block text-xs text-ink-500">
            <span className="block mb-1">설명 / 부여 조건</span>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="예: 발표를 10번 이상 한 학생에게"
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white" />
          </label>

          <label className="block text-xs text-ink-500">
            <span className="block mb-1">색상</span>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-display border transition
                    ${color === c ? 'bg-white shadow-temple border-gold-400' : 'bg-white border-gold-200/50 text-ink-500'}`}
                >
                  {COLOR_LABEL[c]}
                </button>
              ))}
            </div>
          </label>

          <div className="border-t border-gold-200/40 pt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-ink-500">
              미리보기:&nbsp;
              <span className={`chip ${color === 'blue' ? 'chip-blue' : color === 'green' ? 'chip-green' : color === 'rose' ? 'chip-rose' : ''}`}>
                {icon || '🎖️'} {name || '호칭 이름'}
              </span>
            </div>
            <button onClick={add} className="btn-gold text-sm">+ 호칭 만들기</button>
          </div>
        </div>

        {/* 호칭 부여 */}
        <div className="bg-cream-100/60 border border-gold-200/40 rounded-2xl p-4">
          <div className="font-display font-bold text-ink-900 mb-2">학생에게 호칭 부여</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={awardStudent} onChange={e => setAwardStudent(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white">
              {MOCK_STUDENTS.map(s => (
                <option key={s.id} value={s.id}>{s.heroName} ({s.realName})</option>
              ))}
            </select>
            <select value={awardTitle} onChange={e => setAwardTitle(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white">
              <option value="">— 호칭 선택 —</option>
              {titles.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-ink-500">선택한 학생의 보유 호칭: {map[awardStudent]?.ownedTitleIds.length ?? 0}개</div>
            <button onClick={give} className="btn-gold text-sm">✦ 부여</button>
          </div>
        </div>
      </div>

      {/* 호칭 목록 */}
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {titles.map(t => {
          const cls = t.color === 'blue' ? 'chip chip-blue'
            : t.color === 'green' ? 'chip chip-green'
            : t.color === 'rose' ? 'chip chip-rose' : 'chip'
          return (
            <div key={t.id} className="bg-white rounded-2xl border border-gold-200/60 p-3 flex items-start gap-3">
              <div className="text-2xl">{t.icon}</div>
              <div className="flex-1">
                <div className="font-display font-bold text-ink-900">{t.name}</div>
                <div className="text-xs text-ink-500 mt-0.5">{t.description}</div>
                <div className="mt-1.5"><span className={cls}>{t.icon} 호칭</span></div>
              </div>
              <button onClick={() => remove(t.id)} className="text-xs text-rose2-400 hover:underline">삭제</button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------ 쿠키 조정 ------------------ */
function CookiesSection() {
  const { map, update } = useStudentStateMap()
  const MOCK_STUDENTS = useRoster()

  // 교사가 +/-/직접 설정으로 쿠키를 조정할 때, 누적 쿠키(lifetime)도 같이 따라간다.
  // 단, 누적은 (현재 잔액 + 상점에서 쓴 쿠키 합) 이하로 내려가지 않게 보정한다.
  const adjust = (sid: string, delta: number) => {
    update(sid, s => {
      const oldCookies = s.cookies ?? effectiveCookies(sid, map)
      const oldLife = s.lifetimeCookies ?? oldCookies
      const spent = (s.purchases ?? []).reduce((sum, p) => sum + (p.cost ?? 0), 0)
      const newCookies = Math.max(0, oldCookies + delta)
      const newLifeRaw = Math.max(0, oldLife + delta)
      const newLife = Math.max(newLifeRaw, newCookies + spent)
      return { ...s, cookies: newCookies, lifetimeCookies: newLife }
    })
  }

  const setExact = (sid: string, value: number) => {
    update(sid, s => {
      const oldCookies = s.cookies ?? effectiveCookies(sid, map)
      const oldLife = s.lifetimeCookies ?? oldCookies
      const spent = (s.purchases ?? []).reduce((sum, p) => sum + (p.cost ?? 0), 0)
      const newCookies = Math.max(0, value)
      const delta = newCookies - oldCookies
      const newLifeRaw = Math.max(0, oldLife + delta)
      const newLife = Math.max(newLifeRaw, newCookies + spent)
      return { ...s, cookies: newCookies, lifetimeCookies: newLife }
    })
  }

  return (
    <section className="card-temple p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">🍪 학생별 쿠키 조정</h2>
          <p className="text-sm text-ink-500">버튼으로 즉시 추가/차감할 수 있고, 직접 입력해 절대값을 설정할 수도 있어요.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-ink-500">
            <tr className="border-b border-gold-200/50">
              <th className="py-2 px-2">학생</th>
              <th className="py-2 px-2 text-right">현재 쿠키</th>
              <th className="py-2 px-2 text-right">빠른 조정</th>
              <th className="py-2 px-2 text-right">직접 설정</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_STUDENTS.map(s => {
              const cookies = effectiveCookies(s.id, map)
              return (
                <tr key={s.id} className="border-b border-gold-200/30 hover:bg-cream-100/40">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <img src={avatarUrl(s.avatarSeed)} className="w-8 h-8 rounded-md border border-gold-200/60 bg-cream-100" style={{ imageRendering: 'pixelated' }} />
                      <div>
                        <div className="font-display font-bold text-ink-900">{s.heroName}</div>
                        <div className="text-[11px] text-ink-500">{s.realName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-display font-bold text-gold-500">🍪 {cookies}</td>
                  <td className="py-2 px-2 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => adjust(s.id, -10)} className="btn-ghost text-xs px-2 py-1">-10</button>
                      <button onClick={() => adjust(s.id, -1)}  className="btn-ghost text-xs px-2 py-1">-1</button>
                      <button onClick={() => adjust(s.id, +1)}  className="btn-ghost text-xs px-2 py-1">+1</button>
                      <button onClick={() => adjust(s.id, +10)} className="btn-ghost text-xs px-2 py-1">+10</button>
                      <button onClick={() => adjust(s.id, +50)} className="btn-ghost text-xs px-2 py-1">+50</button>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      defaultValue={cookies}
                      key={cookies}
                      min={0}
                      onBlur={e => setExact(s.id, parseInt(e.target.value || '0', 10))}
                      className="w-20 px-2 py-1 rounded-md border border-gold-200/60 outline-none focus:border-gold-300 bg-white text-right"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ------------------ 상점 구매 내역 ------------------ */
function ShopPurchasesSection() {
  const { map, update } = useStudentStateMap()
  const roster = useRoster()

  const [sid, setSid] = useState('')
  const [itemName, setItemName] = useState('')
  const [icon, setIcon] = useState('🎁')
  const [cost, setCost] = useState<number | ''>(200)
  const [deductCookies, setDeductCookies] = useState(false)

  const studentById = useMemo(
    () => Object.fromEntries(roster.map(s => [s.id, s])),
    [roster]
  )

  const rows = useMemo(() => {
    const out: Array<{ sid: string; purchase: NonNullable<(typeof map)[string]['purchases']>[number] }> = []
    for (const sid of Object.keys(map)) {
      const purchases = map[sid]?.purchases ?? []
      for (const p of purchases) out.push({ sid, purchase: p })
    }
    return out.sort((a, b) => b.purchase.purchasedAt.localeCompare(a.purchase.purchasedAt))
  }, [map])

  const addRecord = () => {
    if (!sid) { alert('학생을 선택해 주세요.'); return }
    if (!itemName.trim()) { alert('상품 이름을 입력해 주세요.'); return }
    const c = typeof cost === 'number' ? cost : 0
    if (c < 0) { alert('비용은 0 이상이어야 해요.'); return }
    const baseCookies = roster.find(s => s.id === sid)?.cookies ?? 0
    const student = roster.find(s => s.id === sid)
    if (!confirm(
      `「${student?.heroName ?? sid}」 학생에게 다음 기록을 추가할까요?\n\n` +
      `${icon} ${itemName.trim()} · 🍪 ${c}\n` +
      `${deductCookies ? '쿠키 차감: 예' : '쿠키 차감: 아니오 (기록만 남김)'}`
    )) return

    update(sid, s => {
      const oldCookies = s.cookies ?? baseCookies
      const newCookies = deductCookies ? Math.max(0, oldCookies - c) : oldCookies
      return {
        ...s,
        cookies: newCookies,
        purchases: [
          ...(s.purchases ?? []),
          {
            id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            itemId: `manual_${Date.now()}`,
            itemName: itemName.trim(),
            icon: icon || '🎁',
            cost: c,
            purchasedAt: new Date().toISOString(),
          },
        ],
      }
    })
    setItemName('')
    setIcon('🎁')
    setCost(200)
    setDeductCookies(false)
  }

  const removeRecord = (recordSid: string, recordId: string, label: string) => {
    if (!confirm(`「${label}」 기록을 지울까요?\n(차감된 쿠키는 자동으로 돌려받지 않아요 — 필요 시 쿠키 조정에서 수동으로 더해 주세요.)`)) return
    update(recordSid, s => ({
      ...s,
      purchases: (s.purchases ?? []).filter(p => p.id !== recordId),
    }))
  }

  return (
    <section className="card-temple p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">🛒 상점 구매 내역</h2>
          <p className="text-sm text-ink-500">학생들이 구매한 내역을 최신순으로 확인하고, 누락된 기록을 수동으로 추가할 수 있어요.</p>
        </div>
        <span className="chip">{rows.length}건</span>
      </div>

      {/* 수동 추가 폼 */}
      <div className="rounded-2xl border-2 border-water/40 bg-water-light/30 p-4 space-y-3">
        <div className="font-display text-base font-bold text-ink-900">+ 누락된 구매 기록 수동 추가</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-xs text-ink-500 block">
            <span className="block mb-1">학생</span>
            <select
              value={sid}
              onChange={e => setSid(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white text-sm"
            >
              <option value="">— 학생 선택 —</option>
              {roster.map(s => <option key={s.id} value={s.id}>{s.heroName} ({s.id})</option>)}
            </select>
          </label>
          <label className="text-xs text-ink-500 block">
            <span className="block mb-1">아이콘</span>
            <input
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="🎁"
              maxLength={4}
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white text-sm"
            />
          </label>
          <label className="text-xs text-ink-500 block sm:col-span-2">
            <span className="block mb-1">상품 이름</span>
            <input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="예: 학습 도우미 쿠폰"
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white text-sm"
            />
          </label>
          <label className="text-xs text-ink-500 block">
            <span className="block mb-1">비용 🍪</span>
            <input
              type="number"
              min={0}
              value={cost}
              onChange={e => setCost(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-xl border border-gold-200/60 outline-none focus:border-gold-300 bg-white text-sm"
            />
          </label>
          <label className="text-xs text-ink-700 flex items-center gap-2 mt-5 px-1">
            <input
              type="checkbox"
              checked={deductCookies}
              onChange={e => setDeductCookies(e.target.checked)}
              className="w-4 h-4"
            />
            <span>학생 쿠키에서도 차감 (이미 차감된 경우 끄기)</span>
          </label>
        </div>
        <div className="flex justify-end">
          <button onClick={addRecord} className="btn-gold text-sm">+ 기록 추가</button>
        </div>
      </div>

      {/* 기존 내역 */}
      {rows.length === 0 ? (
        <div className="text-sm text-ink-500 py-6 text-center bg-cream-100/40 rounded-xl">
          아직 구매 내역이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-gold-200/40 bg-white rounded-2xl border border-gold-200/40">
          {rows.map(({ sid, purchase }) => {
            const s = studentById[sid]
            return (
              <div key={purchase.id} className="flex items-center gap-3 px-4 py-3">
                {s ? (
                  <img
                    src={avatarUrl(s.avatarSeed)}
                    className="w-9 h-9 rounded-md bg-cream-100 border border-gold-200/40 flex-shrink-0"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-cream-100 border border-gold-200/40 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display font-bold text-ink-900 truncate">{s?.heroName ?? '(알 수 없는 학생)'}</span>
                    {s && <span className="text-[11px] text-ink-500 truncate">{s.realName}</span>}
                  </div>
                  <div className="text-sm text-ink-700 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {purchase.icon && <span className="text-base">{purchase.icon}</span>}
                    <span>{purchase.itemName}</span>
                    <span className="text-xs text-ink-500">· 🍪 {purchase.cost}</span>
                  </div>
                </div>
                <div className="text-xs text-ink-500 text-right whitespace-nowrap mr-2">
                  {new Date(purchase.purchasedAt).toLocaleString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <button
                  onClick={() => removeRecord(sid, purchase.id, `${purchase.itemName} (${s?.heroName ?? sid})`)}
                  className="text-xs text-rose2-500 hover:text-rose2-600 flex-shrink-0"
                  title="이 기록 삭제"
                >🗑</button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ------------------ 데이터 정리 (Firebase 무료 한도 보호) ------------------ */
function CleanupSection() {
  const [posts, setPosts] = useAgoraPosts()
  const [topics] = useAgoraTopics()
  const roster = useRoster()
  const { map, setMap } = useStudentStateMap()
  const [emailMap] = useStudentEmailMap()
  const [notices] = useNotices()
  const [offerings] = useOfferings()
  const [titles] = useCustomTitles()
  const [missions] = useMissions()

  // 전체 데이터 백업 — 모든 컬렉션을 하나의 JSON 파일로 내려받는다(되돌리기/이관용).
  const exportBackup = () => {
    const backup = {
      meta: {
        app: 'divine-classroom',
        exportedAt: new Date().toISOString(),
        version: 'v1',
        note: '전체 학급 데이터 백업. students_v2는 학생 자리(sid) 기준으로 저장됨.',
      },
      students_v2: map,
      roster,
      student_email_map: emailMap,
      notices,
      offerings,
      titles,
      missions,
      agora_topics: topics,
      agora_posts: posts,
    }
    const studentCount = Object.keys(map).length
    const sanctuaryCount = Object.values(map).filter(s => (s?.sanctuary?.length ?? 0) > 0).length
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const a = document.createElement('a')
    a.href = url
    a.download = `divine-classroom-backup-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    alert(`✦ 전체 백업을 내려받았어요.\n학생 ${studentCount}명 · 성소(개인 신전) 보유 ${sanctuaryCount}명 포함.\n다운로드 폴더의 divine-classroom-backup-${stamp}.json 파일을 보관하세요.`)
  }

  // 누적 쿠키 정합성 보정: lifetime이 (cookies + 상점에서 쓴 쿠키 합)보다 작은 학생만 stored에 보정값 기록.
  const reconcilePreview = useMemo(() => {
    const out: Array<{ sid: string; heroName: string; oldLife: number; newLife: number; cookies: number; spent: number }> = []
    for (const s of roster) {
      const st = map[s.id]
      if (!st) continue
      const cookies = st.cookies ?? s.cookies ?? 0
      const spent = (st.purchases ?? []).reduce((sum, p) => sum + (p.cost ?? 0), 0)
      const minimum = cookies + spent
      const oldLife = st.lifetimeCookies ?? cookies
      const newLife = Math.max(oldLife, minimum)
      if (newLife > oldLife) {
        out.push({ sid: s.id, heroName: s.heroName, oldLife, newLife, cookies, spent })
      }
    }
    return out
  }, [map, roster])

  const reconcileLifetimes = () => {
    if (reconcilePreview.length === 0) { alert('보정이 필요한 학생이 없습니다. 누적 쿠키가 모두 정상이에요.'); return }
    const summary = reconcilePreview
      .slice(0, 8)
      .map(r => `· ${r.heroName}: ${r.oldLife} → ${r.newLife}`)
      .join('\n') + (reconcilePreview.length > 8 ? `\n(외 ${reconcilePreview.length - 8}명)` : '')
    if (!confirm(`누적 쿠키가 잘못 기록된 ${reconcilePreview.length}명을 보정할까요?\n\n${summary}\n\n각 학생의 (현재 잔액 + 상점에서 쓴 쿠키 합) 이상이 되도록 누적 쿠키를 올립니다. 현재 잔액은 변경되지 않아요.`)) return

    setMap(prev => {
      const next = { ...prev }
      for (const r of reconcilePreview) {
        const cur = next[r.sid]
        if (!cur) continue
        next[r.sid] = { ...cur, lifetimeCookies: r.newLife }
      }
      return next
    })
    alert(`✦ ${reconcilePreview.length}명의 누적 쿠키를 보정했어요.`)
  }

  const stats = useMemo(() => {
    let bytes = 0
    let imageCount = 0
    for (const p of posts) {
      bytes += (p.content?.length ?? 0)
      if (p.imageDataUrl) {
        bytes += p.imageDataUrl.length
        imageCount++
      }
    }
    return {
      count: posts.length,
      imageCount,
      kb: Math.round(bytes / 1024),
    }
  }, [posts])

  const exportPdf = () => {
    if (posts.length === 0) { alert('내보낼 글이 없습니다.'); return }

    const topicMap = new Map(topics.map(t => [t.id, t]))
    const studentMap = new Map(roster.map(s => [s.id, s.heroName]))
    const grouped = new Map<string, typeof posts>()
    for (const p of posts) {
      const arr = grouped.get(p.topicId) ?? []
      arr.push(p)
      grouped.set(p.topicId, arr)
    }

    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

    const formatDate = (iso: string) =>
      new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    const topicSections = Array.from(grouped.entries()).map(([topicId, arr]) => {
      const topic = topicMap.get(topicId)
      const sorted = [...arr].sort((a, b) => a.postedAt.localeCompare(b.postedAt))
      const postCards = sorted.map(p => {
        const name = p.studentName || studentMap.get(p.studentId) || p.studentId
        const img = p.imageDataUrl ? `<img src="${p.imageDataUrl}" alt="첨부" />` : ''
        const body = p.content ? `<p>${esc(p.content).replace(/\n/g, '<br>')}</p>` : ''
        return `<article class="post">
          <header><b>${esc(name)}</b><span class="when">${esc(formatDate(p.postedAt))}</span></header>
          ${img}
          ${body}
        </article>`
      }).join('\n')
      return `<section class="topic">
        <h2>${esc(topic?.title ?? `(삭제된 주제 ${topicId})`)}</h2>
        ${topic?.description ? `<p class="desc">${esc(topic.description)}</p>` : ''}
        <div class="count">${arr.length}장</div>
        ${postCards}
      </section>`
    }).join('\n')

    const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>아고라 기록 — ${new Date().toLocaleDateString('ko-KR')}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, "Noto Sans KR", sans-serif; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  h2 { font-size: 18px; margin: 28px 0 6px; padding-bottom: 6px; border-bottom: 2px solid #1a1a1a; page-break-after: avoid; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
  .desc { color: #444; font-size: 13px; margin: 4px 0 8px; white-space: pre-wrap; }
  .count { color: #666; font-size: 11px; margin-bottom: 10px; }
  .topic { page-break-inside: avoid; }
  .post { border: 1px solid #ccc; border-radius: 6px; padding: 10px 12px; margin: 8px 0; page-break-inside: avoid; }
  .post header { display: flex; gap: 8px; align-items: baseline; font-size: 13px; margin-bottom: 6px; }
  .post .when { color: #666; font-size: 11px; }
  .post p { margin: 4px 0 0; font-size: 13px; white-space: pre-wrap; }
  .post img { max-width: 100%; max-height: 240px; border-radius: 4px; margin: 4px 0; }
  @media print { .noprint { display: none; } }
  .noprint { position: fixed; top: 12px; right: 12px; background: #1a1a1a; color: white; padding: 10px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }
</style></head>
<body>
<button class="noprint" onclick="window.print()">🖨 PDF로 저장</button>
<h1>아고라 기록</h1>
<div class="meta">${new Date().toLocaleString('ko-KR')} · 글 ${posts.length}장 · 사진 ${stats.imageCount}장 · 주제 ${grouped.size}개</div>
${topicSections}
<script>setTimeout(() => window.print(), 600)</script>
</body></html>`

    const win = window.open('', '_blank')
    if (!win) {
      alert('새 창이 차단되었습니다. 팝업 차단을 해제해 주세요.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const wipeAgora = () => {
    if (posts.length === 0) { alert('지울 글이 없습니다.'); return }
    const msg = `현재 아고라에 글이 ${posts.length}장 있습니다 (사진 ${stats.imageCount}장, 약 ${stats.kb} KB).\n\n이 글들을 모두 삭제할까요?\n(주제·Padlet 링크는 그대로 남고, 글 데이터만 비웁니다)`
    if (!confirm(msg)) return
    if (!confirm('정말 모두 지울까요? 되돌릴 수 없습니다.')) return
    setPosts([])
    alert('아고라 글 데이터를 모두 비웠습니다. Firestore의 agora_posts 문서가 빈 배열이 되어 서버 부담이 크게 줄어듭니다.')
  }

  return (
    <section className="card-temple p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900">🧹 데이터 정리</h2>
        <p className="text-sm text-ink-500">Firebase 무료 한도를 안전하게 유지하기 위한 도구입니다.</p>
      </div>

      <div className="rounded-2xl border-2 border-gold-300 bg-gold-50/50 p-4 space-y-3">
        <div className="font-display font-bold text-ink-900">💾 전체 데이터 백업</div>
        <p className="text-xs text-ink-500 leading-relaxed">
          모든 학급 데이터(학생 상태·성소·명단·매핑·알림장·미션·제물·아고라)를 <b>JSON 파일 하나</b>로 내려받습니다.
          리뉴얼·구조 변경 전에 한 번 받아 두면 안전해요. <b>모둠별 신전으로 바꾸기 전에 꼭 받아 주세요.</b>
        </p>
        <div className="flex justify-end">
          <button onClick={exportBackup} className="btn-gold text-sm">💾 전체 백업 내려받기 (JSON)</button>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-water/50 bg-water-light/30 p-4 space-y-2">
        <div className="font-display font-bold text-ink-900">현재 아고라 글 데이터</div>
        <div className="text-sm text-ink-700">
          글 <b>{stats.count}</b>장 · 사진 <b>{stats.imageCount}</b>장 · 추정 용량 <b>{stats.kb}</b> KB
        </div>
        <p className="text-xs text-ink-500 leading-relaxed">
          아고라를 Padlet으로 옮긴 뒤에는 이 데이터가 더는 학생 화면에 표시되지 않지만, Firestore 안에는 그대로 남아 사이트를 열 때마다 다운로드됩니다.
          기념용 <b>PDF 백업</b>을 먼저 받으신 뒤 <b>일괄 삭제</b>를 진행하세요.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button onClick={exportPdf} disabled={stats.count === 0}
          className="card-temple p-4 text-left hover:bg-gold-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
          <div className="font-display font-bold text-ink-900 mb-1">📄 1단계 · PDF로 내보내기</div>
          <div className="text-xs text-ink-500 leading-relaxed">
            주제별로 묶은 인쇄용 페이지가 새 창에 열리고, 자동으로 인쇄 다이얼로그가 뜹니다.
            「대상 → PDF로 저장」을 선택해 파일로 보관하세요.
          </div>
        </button>

        <button onClick={wipeAgora} disabled={stats.count === 0}
          className="card-temple p-4 text-left border-2 border-rose2-300 hover:bg-rose2-100/30 transition disabled:opacity-50 disabled:cursor-not-allowed">
          <div className="font-display font-bold text-rose2-500 mb-1">🗑 2단계 · 아고라 글 일괄 삭제</div>
          <div className="text-xs text-ink-500 leading-relaxed">
            PDF 백업을 받은 뒤 누르세요. 주제 목록과 Padlet 링크는 보존되고, 학생들이 적었던 글 데이터만 모두 비웁니다.
            이 작업은 되돌릴 수 없습니다.
          </div>
        </button>
      </div>

      <div className="rounded-2xl border-2 border-gold-300 bg-gold-50/40 p-4 space-y-3">
        <div className="font-display font-bold text-ink-900">🍪 누적 쿠키 정합성 보정</div>
        <p className="text-xs text-ink-500 leading-relaxed">
          과거 race로 누적 쿠키(<b>lifetimeCookies</b>)가 현재 잔액보다 낮게 기록된 학생을 찾아,
          <b> (현재 잔액 + 상점에서 쓴 쿠키 합)</b> 이상이 되도록 한 번에 보정합니다. 현재 잔액은 변경되지 않아요.
        </p>
        {reconcilePreview.length === 0 ? (
          <div className="text-sm text-ink-700 bg-white rounded-lg px-3 py-2">
            ✓ 보정이 필요한 학생이 없습니다. 누적 쿠키가 모두 정상이에요.
          </div>
        ) : (
          <>
            <div className="text-sm text-ink-700">
              보정 대상: <b className="text-rose2-500">{reconcilePreview.length}명</b>
            </div>
            <div className="bg-white rounded-lg p-2 max-h-40 overflow-y-auto">
              {reconcilePreview.slice(0, 12).map(r => (
                <div key={r.sid} className="text-xs text-ink-700 flex items-center gap-2 py-0.5">
                  <span className="font-mono text-[10px] text-ink-500">{r.sid}</span>
                  <span className="font-display font-bold">{r.heroName}</span>
                  <span className="text-ink-500">· 누적 {r.oldLife} → {r.newLife} (잔액 {r.cookies} + 사용 {r.spent})</span>
                </div>
              ))}
              {reconcilePreview.length > 12 && (
                <div className="text-[11px] text-ink-500 mt-1">(외 {reconcilePreview.length - 12}명)</div>
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={reconcileLifetimes} className="btn-gold text-sm">✦ 누적 쿠키 일괄 보정</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}


/* ──────────────── 반 설정 (ClassSettingsSection) ──────────────── */
function ClassSettingsSection() {
  const { classInfo, updateTerms, updateMenus } = useClassInfo()
  const [terms, setTerms] = useState<ClassTerms>({ ...classInfo.terms })
  const [menus, setMenus] = useState<MenuConfig[]>(classInfo.menus.map(m => ({ ...m })))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // classInfo 변경 시 로컬 상태 동기화
  useEffect(() => { setTerms({ ...classInfo.terms }) }, [classInfo.terms])
  useEffect(() => { setMenus(classInfo.menus.map(m => ({ ...m }))) }, [classInfo.menus])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTerms(terms)
      await updateMenus(menus)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('[ClassSettings] save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* 반 이름·부제 */}
      <div>
        <h3 className="font-display font-bold text-moss-darkest mb-3">반 이름 및 부제</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-500 mb-1">반 이름 (헤더 큰 글씨)</label>
            <input className="pixel-input w-full" value={terms.className}
              onChange={e => setTerms(p => ({ ...p, className: e.target.value }))}
              placeholder="예: 신의반 신전" />
          </div>
          <div>
            <label className="block text-sm text-ink-500 mb-1">부제 (헤더 작은 글씨)</label>
            <input className="pixel-input w-full" value={terms.subtitle}
              onChange={e => setTerms(p => ({ ...p, subtitle: e.target.value }))}
              placeholder="예: 6학년 우리 반 마음마을" />
          </div>
        </div>
      </div>

      {/* 용어 설정 */}
      <div>
        <h3 className="font-display font-bold text-moss-darkest mb-3">용어 설정</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-500 mb-1">학생 호칭</label>
            <input className="pixel-input w-full" value={terms.studentTitle}
              onChange={e => setTerms(p => ({ ...p, studentTitle: e.target.value }))}
              placeholder="예: 신민, 탐험가, 별빛이" />
            <p className="text-xs text-ink-400 mt-1">학생을 부르는 호칭</p>
          </div>
          <div>
            <label className="block text-sm text-ink-500 mb-1">화폐 이름</label>
            <input className="pixel-input w-full" value={terms.cookieName}
              onChange={e => setTerms(p => ({ ...p, cookieName: e.target.value }))}
              placeholder="예: 쿠키, 별조각, 씨앗" />
            <p className="text-xs text-ink-400 mt-1">보상으로 받는 화폐 단위</p>
          </div>
        </div>
      </div>

      {/* 메뉴 켜기/끄기 + 이름 변경 */}
      <div>
        <h3 className="font-display font-bold text-moss-darkest mb-3">메뉴 설정</h3>
        <p className="text-xs text-ink-400 mb-3">체크박스로 메뉴를 켜거나 끄고, 텍스트로 메뉴 이름을 바꿀 수 있어요.</p>
        <div className="space-y-3">
          {menus.map((m, i) => (
            <div key={m.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={m.enabled}
                onChange={e => setMenus(prev => prev.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
                className="w-4 h-4 accent-moss-deep"
              />
              <input
                className="pixel-input flex-1"
                value={m.label}
                onChange={e => setMenus(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
              />
              <span className="text-xs text-ink-400 w-20">{m.enabled ? '표시됨' : '숨겨짐'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 저장 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold"
        >
          {saving ? '저장 중…' : saved ? '✓ 저장됨' : '설정 저장'}
        </button>
        {saved && <span className="text-sm text-moss-deep">변경 사항이 저장됐어요!</span>}
      </div>
    </section>
  )
}

/* ──────────────── 일일 퀘스트 설정 (QuestConfigSection) ──────────────── */
function QuestConfigSection() {
  const stored = useDailyTasks()
  const [tasks, setTasks] = useState<DailyTaskDef[]>(() => stored.map(t => ({ ...t })))
  const [saved, setSaved] = useState(false)

  const update = (i: number, field: keyof DailyTaskDef, val: string | number) =>
    setTasks(prev => prev.map((t, j) => j === i ? { ...t, [field]: val } : t))

  const addTask = () => setTasks(prev => [...prev, {
    key: `task_${Date.now()}`, label: '새 퀘스트', description: '설명을 입력하세요', maxScore: 1, icon: '⭐'
  }])

  const removeTask = (i: number) => setTasks(prev => prev.filter((_, j) => j !== i))

  const save = () => {
    setDailyTasks(tasks, e => console.error(e))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="sin-screen">
      <h2 className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>일일 퀘스트 설정</h2>
      <p className="page-subtitle" style={{ marginBottom: 16 }}>학생들이 매일 도전하는 퀘스트 항목을 커스텀해요.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {tasks.map((task, i) => (
          <div key={task.key} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>아이콘</label>
                <input className="input" value={task.icon} onChange={e => update(i, 'icon', e.target.value)}
                  style={{ textAlign: 'center', fontSize: 20, padding: '6px 4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>항목 이름</label>
                <input className="input" value={task.label} onChange={e => update(i, 'label', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>최대 점수</label>
                <input className="input" type="number" min={1} max={10} value={task.maxScore}
                  onChange={e => update(i, 'maxScore', Math.max(1, Math.min(10, Number(e.target.value))))} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>설명</label>
              <input className="input" value={task.description} onChange={e => update(i, 'description', e.target.value)} />
            </div>
            <button onClick={() => removeTask(i)} className="btn btn--ghost"
              style={{ fontSize: 12, padding: '4px 10px', color: 'var(--pink)' }}>
              삭제
            </button>
          </div>
        ))}
      </div>

      <button onClick={addTask} className="btn btn--ghost" style={{ marginBottom: 12 }}>+ 항목 추가</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} className="btn btn--primary">저장</button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)' }}>저장됐어요!</span>}
      </div>
    </section>
  )
}

/* ──────────────── 상점 설정 (ShopConfigSection) ──────────────── */
function ShopConfigSection() {
  const stored = useShopItems()
  const [items, setItems] = useState<CustomShopItem[]>(() => stored.map(i => ({ ...i })))
  const [saved, setSaved] = useState(false)

  const update = (i: number, field: keyof CustomShopItem, val: string | number) =>
    setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: val } : item))

  const addItem = () => setItems(prev => [...prev, {
    id: `item_${Date.now()}`, name: '새 아이템', icon: '🎁', description: '설명을 입력하세요', cost: 100
  }])

  const removeItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i))

  const save = () => {
    setShopItems(items, e => console.error(e))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="sin-screen">
      <h2 className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>상점 설정</h2>
      <p className="page-subtitle" style={{ marginBottom: 16 }}>학생들이 쿠키로 구매할 수 있는 아이템을 관리해요.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {items.map((item, i) => (
          <div key={item.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>아이콘</label>
                <input className="input" value={item.icon} onChange={e => update(i, 'icon', e.target.value)}
                  style={{ textAlign: 'center', fontSize: 20, padding: '6px 4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>아이템 이름</label>
                <input className="input" value={item.name} onChange={e => update(i, 'name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>가격 (쿠키)</label>
                <input className="input" type="number" min={1} value={item.cost}
                  onChange={e => update(i, 'cost', Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>설명</label>
              <input className="input" value={item.description} onChange={e => update(i, 'description', e.target.value)} />
            </div>
            <button onClick={() => removeItem(i)} className="btn btn--ghost"
              style={{ fontSize: 12, padding: '4px 10px', color: 'var(--pink)' }}>
              삭제
            </button>
          </div>
        ))}
      </div>

      <button onClick={addItem} className="btn btn--ghost" style={{ marginBottom: 12 }}>+ 아이템 추가</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} className="btn btn--primary">저장</button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)' }}>저장됐어요!</span>}
      </div>
    </section>
  )
}

/* ──────────────── 모두의 도서관 (방학 시즌 2) ──────────────── */
function LibraryAdminSection() {
  const { classInfo, updateMenus } = useClassInfo()
  const roster = useRoster()
  const statuses = useLibStatuses()
  const records = useLibRecords()
  const activities = useLibActivities()

  const libMenu = classInfo.menus.find(m => m.key === 'library')
  const isOpen = libMenu?.enabled ?? false

  const toggleOpen = async () => {
    await updateMenus(classInfo.menus.map(m => m.key === 'library' ? { ...m, enabled: !isOpen } : m))
  }

  const now = Date.now()
  const statusOf = (sid: string) => {
    const st = statuses.find(s => s.sid === sid)
    if (!st) return null
    const live = liveness(st, now)
    return live === 'gone' ? null : { st, live }
  }

  const rows = roster.map(s => {
    const recs = records.filter(r => r.sid === s.id)
    const mins = recs.reduce((a, r) => a + r.sessions.reduce((x, ss) => x + ss.minutes, 0), 0)
    const acts = activities.filter(a => a.sid === s.id).length
    return { s, recs, mins, finished: recs.filter(r => r.finished).length, acts, live: statusOf(s.id) }
  }).sort((a, b) => b.mins - a.mins)

  return (
    <section className="space-y-6">
      {/* 열고 닫기 */}
      <div className="flex items-center gap-4 flex-wrap p-4 rounded-xl border-2 border-moss-darkest/15 bg-moss-paper">
        <div className="text-3xl">{isOpen ? '📖' : '🌙'}</div>
        <div className="flex-1 min-w-[180px]">
          <div className="font-display font-bold text-moss-darkest">
            도서관이 지금 {isOpen ? '열려 있어요' : '닫혀 있어요'}
          </div>
          <p className="text-xs text-ink-400 mt-0.5">
            열면 학생 메뉴에 「{libMenu?.label ?? '모두의 도서관'}」이 나타나고, 닫아도 독서 기록은 그대로 보존돼요.
          </p>
        </div>
        <button onClick={() => void toggleOpen()} className={isOpen ? 'btn-ghost' : 'btn-gold'}>
          {isOpen ? '도서관 닫기' : '도서관 열기'}
        </button>
      </div>

      {/* 독서 현황 */}
      <div>
        <h3 className="font-display font-bold text-moss-darkest mb-3">학생별 독서 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 border-b border-moss-darkest/15">
                <th className="py-2 pr-2">학생</th>
                <th className="py-2 pr-2">지금</th>
                <th className="py-2 pr-2">총 독서 시간</th>
                <th className="py-2 pr-2">읽은 책</th>
                <th className="py-2 pr-2">완독</th>
                <th className="py-2 pr-2">독후활동</th>
                <th className="py-2">포트폴리오</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, recs, mins, finished, acts, live }) => (
                <tr key={s.id} className="border-b border-moss-darkest/10">
                  <td className="py-2 pr-2 font-bold text-moss-darkest whitespace-nowrap">{s.realName}</td>
                  <td className="py-2 pr-2 whitespace-nowrap text-xs">
                    {live
                      ? live.live === 'reading'
                        ? <span className="text-moss-deep font-bold">📖 독서 중{live.st.book ? ` · ${live.st.book.title}` : ''}</span>
                        : live.live === 'away'
                          ? <span className="text-ink-400">😴 자리 비움</span>
                          : <span className="text-water-600">💭 대기 중</span>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{mins ? fmtLibMinutes(mins) : '—'}</td>
                  <td className="py-2 pr-2">{recs.length || '—'}</td>
                  <td className="py-2 pr-2">{finished ? `🏅 ${finished}` : '—'}</td>
                  <td className="py-2 pr-2">{acts || '—'}</td>
                  <td className="py-2">
                    <Link to={`/app/library-print/${s.id}`}
                      className="text-xs font-bold text-moss-deep underline whitespace-nowrap">
                      🖨 인쇄용 보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-400 mt-3">
          「인쇄용 보기」에서 브라우저 인쇄(⌘P)로 학기말 PDF를 저장할 수 있어요.
        </p>
      </div>
    </section>
  )
}

