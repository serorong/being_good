/* ──────────────────────────────────────────────────────────────
   모두의 도서관 — 방학 시즌 2 공용 페이지.
   빈자리를 골라 앉고, 책을 고르고, 뽀모도로 타이머로 읽는다.
   친구 자리를 누르면 그 친구의 독서 서재를 구경할 수 있다.
   ────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { useRoster, useStudentStateMap } from '../state'
import { useClassInfo } from '../ClassContext'
import Sprite from '../components/Sprite'
import { Modal } from '../minihompy/Modal'
import { MC, MiniBtn } from '../minihompy/parts'
import { BookshelfModal } from './BookshelfModal'
import { searchBooks } from './kakao'
import {
  clearAllSeats, elapsedMs, finishReading, getOrCreateRecord, leaveSeat, liveness,
  pauseReading, resumeReading, sitDown, startReading, useHeartbeat, useLibRecords, useLibStatuses,
} from './store'
import { SEAT_COUNT, fmtMinutes, type LibBook, type LibRecord, type LibStatus } from './types'

/* 도서관 팔레트 — 미니룸과 같은 도트 감성, 나무·초록 톤 */
const LC = { wood: '#a87b50', woodSoft: '#e9d5b5', paper: '#fbf6ea', ink: '#3a2b3a', green: '#2e7d52', line: '#d3b98c' }

const TARGET_PRESETS = [10, 15, 20, 30]

export default function LibraryPage() {
  const [auth] = useAuth()
  const roster = useRoster()
  const { get } = useStudentStateMap()
  const { classInfo } = useClassInfo()
  const statuses = useLibStatuses()
  const records = useLibRecords()

  const isTeacher = auth?.role === 'teacher'
  const mySid = auth?.role === 'student' ? auth.studentId : undefined

  // 1초마다 갱신 — 타이머·자리비움 판정용
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const nameOf = (sid: string) => roster.find(s => s.id === sid)?.heroName || sid
  const seedOf = (sid: string) => roster.find(s => s.id === sid)?.avatarSeed || sid
  const avatarOf = (sid: string) => get(sid)?.customAvatar

  const active = useMemo(
    () => statuses.filter(s => roster.some(r => r.id === s.sid) && liveness(s, now) !== 'gone'),
    [statuses, roster, now])
  const bySeat = useMemo(() => {
    const m = new Map<number, LibStatus>()
    for (const s of active) if (s.seat !== null) m.set(s.seat, s)
    return m
  }, [active])
  const myStatus = mySid ? active.find(s => s.sid === mySid) : undefined

  useHeartbeat(mySid, !!myStatus)

  const [searchOpen, setSearchOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [shelfSid, setShelfSid] = useState<string | null>(null)

  const enabled = classInfo.menus.find(m => m.key === 'library')?.enabled ?? false
  if (!enabled && !isTeacher) {
    return (
      <section className="sin-screen" style={{ fontFamily: "'Galmuri11','DungGeunMo',sans-serif" }}>
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', background: LC.paper, border: `2px solid ${LC.ink}`, borderRadius: 16, padding: 36 }}>
          <div style={{ fontSize: 44 }}>🌙</div>
          <h1 style={{ fontSize: 20, color: LC.ink, margin: '10px 0 6px' }}>도서관이 닫혀 있어요</h1>
          <p style={{ fontSize: 13, color: '#8a6d4a', margin: 0 }}>선생님이 도서관 문을 열면 들어올 수 있어요.</p>
        </div>
      </section>
    )
  }

  const recordOf = (st: LibStatus) => records.find(r => r.id === st.recordId)

  const sit = (seat: number) => { if (mySid) void sitDown(mySid, seat) }

  return (
    <section className="sin-screen" style={{ fontFamily: "'Galmuri11','DungGeunMo',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 className="page-title">모두의 도서관 <span style={{ fontSize: 24 }}>📚</span></h1>
          <p className="page-subtitle">원하는 자리에 앉아 책을 읽어요. 친구 자리를 누르면 서재를 구경할 수 있어요!</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: LC.green, background: '#e6f2ea', border: `1px solid ${LC.green}`, borderRadius: 999, padding: '4px 10px' }}>
            🪑 {active.length}명 이용 중
          </span>
          {mySid && <MiniBtn small onClick={() => setShelfSid(mySid)}>📚 내 서재</MiniBtn>}
          {isTeacher && (
            <MiniBtn small kind="ghost" onClick={() => { if (confirm('모든 자리를 비울까요? (기록은 지워지지 않아요)')) void clearAllSeats() }}>
              🧹 모든 자리 비우기
            </MiniBtn>
          )}
        </div>
      </div>

      {/* 내 독서 패널 */}
      {mySid && (
        <MyPanel status={myStatus} record={myStatus ? recordOf(myStatus) : undefined} now={now}
          onPickBook={() => setSearchOpen(true)} onFinish={() => setFinishOpen(true)}
          onPause={() => void pauseReading(mySid)} onResume={() => void resumeReading(mySid)}
          onLeave={() => { if (!myStatus?.startedAt || confirm('타이머가 도는 중이에요. 정말 나갈까요? (읽은 시간은 저장되지 않아요)')) void leaveSeat(mySid) }} />
      )}

      {/* 좌석 그리드 */}
      <div style={{ marginTop: 14, background: LC.paper, border: `2px solid ${LC.ink}`, borderRadius: 16, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {Array.from({ length: SEAT_COUNT }, (_, i) => {
            const st = bySeat.get(i)
            if (!st) {
              return (
                <button key={i} onClick={() => sit(i)} disabled={!mySid}
                  style={{ minHeight: 110, borderRadius: 12, border: `2px dashed ${LC.line}`, background: '#fffdf6', cursor: mySid ? 'pointer' : 'default', fontFamily: 'inherit', display: 'grid', placeItems: 'center', gap: 2, padding: 8 }}>
                  <span style={{ fontSize: 20, opacity: 0.5 }}>🪑</span>
                  <span style={{ fontSize: 11, color: '#b09a72' }}>{mySid ? (myStatus ? '이 자리로 옮기기' : '여기 앉기') : '빈자리'}</span>
                </button>
              )
            }
            const live = liveness(st, now)
            const isMe = st.sid === mySid
            const rec = recordOf(st)
            const total = rec?.book.totalPages ?? 0
            const pct = rec ? (rec.finished ? 100 : total > 0 ? Math.min(100, Math.round((rec.currentPage / total) * 100)) : null) : null
            return (
              <button key={i} onClick={() => setShelfSid(st.sid)}
                title={`${nameOf(st.sid)} 님의 서재 구경하기`}
                style={{
                  minHeight: 110, borderRadius: 12, padding: 8, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${isMe ? MC.pink : LC.ink}`,
                  boxShadow: isMe ? `0 0 0 3px ${MC.pinkSoft}` : 'none',
                  background: live === 'reading' ? '#eef7ef' : live === 'away' ? '#f3f0ea' : '#fff',
                  opacity: live === 'away' ? 0.75 : 1,
                }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Sprite seed={seedOf(st.sid)} size={40} customSrc={avatarOf(st.sid)} shadow={false} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: LC.ink, marginTop: 2 }}>
                  {nameOf(st.sid)}{isMe && ' (나)'}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: live === 'reading' ? LC.green : live === 'away' ? '#a08a62' : '#4a7fc1' }}>
                  {live === 'reading' ? '📖 집중해서 읽는 중' : live === 'away' ? '😴 자리 비움' : '💭 쉬는 중'}
                </div>
                {st.book && (
                  <div style={{ fontSize: 10, color: '#8a6d4a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    『{st.book.title}』{pct !== null ? ` ${pct}%` : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 책 고르기 */}
      {mySid && (
        <BookSearchModal open={searchOpen} onClose={() => setSearchOpen(false)}
          onStart={async (book, minutes) => {
            const rec = await getOrCreateRecord(mySid, book)
            await startReading(mySid, book, rec.id, minutes)
            setSearchOpen(false)
          }} />
      )}

      {/* 타이머 종료 */}
      {mySid && myStatus && (
        <FinishModal open={finishOpen} onClose={() => setFinishOpen(false)} status={myStatus}
          record={recordOf(myStatus)} now={now}
          onSave={async (endPage, finished) => {
            await finishReading(mySid, { endPage, finished })
            setFinishOpen(false)
          }} />
      )}

      {/* 서재 구경 */}
      {shelfSid && (
        <BookshelfModal open onClose={() => setShelfSid(null)} sid={shelfSid}
          name={nameOf(shelfSid)} own={shelfSid === mySid} />
      )}
    </section>
  )
}

/* ──────────────── 내 독서 패널 ──────────────── */
function MyPanel({ status, record, now, onPickBook, onFinish, onPause, onResume, onLeave }: {
  status?: LibStatus; record?: LibRecord; now: number
  onPickBook: () => void; onFinish: () => void; onPause: () => void; onResume: () => void; onLeave: () => void
}) {
  if (!status) {
    return (
      <div style={{ marginTop: 12, background: '#fff', border: `2px solid ${LC.ink}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>🚪</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: LC.ink }}>아래에서 마음에 드는 빈자리를 눌러 도서관에 들어가요!</span>
      </div>
    )
  }

  const reading = status.mode === 'reading' && !!status.startedAt
  const paused = !!status.pausedAt

  if (!reading) {
    return (
      <div style={{ marginTop: 12, background: '#fff', border: `2px solid ${LC.ink}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>🪑</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: LC.ink, flex: 1, minWidth: 160 }}>
          자리에 앉았어요. 이제 책을 골라 볼까요?
        </span>
        <MiniBtn kind="primary" onClick={onPickBook}>📖 책 고르고 읽기</MiniBtn>
        <MiniBtn kind="ghost" onClick={onLeave}>🚪 자리 비우기</MiniBtn>
      </div>
    )
  }

  const target = (status.targetMinutes ?? 0) * 60_000
  const elapsed = elapsedMs(status, now)
  const remain = target - elapsed
  const done = remain <= 0
  const mm = Math.floor(Math.abs(done ? elapsed : remain) / 60000)
  const ss = Math.floor((Math.abs(done ? elapsed : remain) % 60000) / 1000)
  const total = record?.book.totalPages ?? 0
  const pct = record && total > 0 ? Math.min(100, Math.round(((record.currentPage) / total) * 100)) : null

  return (
    <div style={{ marginTop: 12, background: done ? '#fff8e1' : '#eef7ef', border: `2px solid ${LC.ink}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: done ? '#b8860b' : LC.green, fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
        {paused ? '⏸' : done ? '🎉' : '📖'} {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: LC.ink }}>『{status.book?.title}』</div>
        <div style={{ fontSize: 12, color: '#6a8a5a' }}>
          {done
            ? `목표 ${status.targetMinutes}분 달성! 지금까지 ${fmtMinutes(Math.max(1, Math.round(elapsed / 60000)))} 읽었어요`
            : paused
              ? '잠깐 쉬는 중 — 준비되면 다시 읽기를 눌러요'
              : `목표 ${status.targetMinutes}분 중 ${fmtMinutes(Math.max(0, Math.floor(elapsed / 60000)))} 읽는 중`}
          {pct !== null && ` · 진행률 ${pct}%`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {paused
          ? <MiniBtn onClick={onResume}>▶ 다시 읽기</MiniBtn>
          : <MiniBtn onClick={onPause}>⏸ 잠깐 멈춤</MiniBtn>}
        <MiniBtn kind="primary" onClick={onFinish}>✅ 다 읽었어요</MiniBtn>
        <MiniBtn kind="ghost" onClick={onLeave}>🚪 나가기</MiniBtn>
      </div>
    </div>
  )
}

/* ──────────────── 책 고르기 (카카오 검색 + 수동 입력) ──────────────── */
function BookSearchModal({ open, onClose, onStart }: {
  open: boolean; onClose: () => void
  onStart: (book: LibBook, minutes: number) => Promise<void>
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<LibBook[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [picked, setPicked] = useState<LibBook | null>(null)
  const [pages, setPages] = useState('')
  const [minutes, setMinutes] = useState(20)
  const [manual, setManual] = useState(false)
  const [mTitle, setMTitle] = useState('')
  const [mAuthor, setMAuthor] = useState('')

  const reset = () => { setQ(''); setResults([]); setSearched(false); setPicked(null); setPages(''); setManual(false); setMTitle(''); setMAuthor('') }
  const close = () => { reset(); onClose() }

  const doSearch = async () => {
    const query = q.trim()
    if (!query) return
    setSearching(true)
    try {
      setResults(await searchBooks(query))
      setSearched(true)
    } catch (e) {
      console.error(e)
      alert('책 검색이 잘 안 돼요. 잠시 후 다시 해 보거나, 직접 입력해 주세요.')
    } finally {
      setSearching(false)
    }
  }

  const start = async () => {
    const book = manual
      ? { title: mTitle.trim(), authors: mAuthor.trim() || undefined }
      : picked
    if (!book || !book.title) { alert('책을 골라 주세요!'); return }
    const totalPages = parseInt(pages, 10)
    await onStart({ ...book, ...(totalPages > 0 ? { totalPages } : {}) }, minutes)
    reset()
  }

  return (
    <Modal open={open} onClose={close} title="📖 무슨 책을 읽을까요?" maxWidth={620}>
      {!picked && !manual && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="책 제목을 검색해 봐요 (예: 해리 포터)"
              onKeyDown={e => { if (e.key === 'Enter') void doSearch() }} autoFocus
              style={{ flex: 1, padding: 10, border: `2px solid ${MC.ink}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }} />
            <MiniBtn kind="primary" onClick={() => void doSearch()} disabled={searching}>{searching ? '찾는 중…' : '🔍 검색'}</MiniBtn>
          </div>
          {results.length > 0 && (
            <div style={{ display: 'grid', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {results.map((b, i) => (
                <button key={i} onClick={() => setPicked(b)}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: 8, borderRadius: 10, border: `2px solid ${MC.line}`, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {b.thumbnail
                    ? <img src={b.thumbnail} alt="" style={{ width: 38, height: 54, objectFit: 'cover', borderRadius: 3, border: `1px solid ${MC.line}` }} />
                    : <div style={{ width: 38, height: 54, borderRadius: 3, border: `1px solid ${MC.line}`, display: 'grid', placeItems: 'center' }}>📕</div>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: MC.ink }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: '#a06' }}>{b.authors}{b.publisher ? ` · ${b.publisher}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searched && results.length === 0 && !searching && (
            <div style={{ fontSize: 13, color: '#a06', textAlign: 'center', padding: 10 }}>검색 결과가 없어요. 아래에서 직접 입력해 보세요.</div>
          )}
          <button onClick={() => setManual(true)}
            style={{ fontSize: 12, color: '#a06', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', justifySelf: 'center' }}>
            검색에 없는 책이에요 — 직접 입력하기
          </button>
        </div>
      )}

      {(picked || manual) && (
        <div style={{ display: 'grid', gap: 12 }}>
          {picked ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {picked.thumbnail && <img src={picked.thumbnail} alt="" style={{ width: 46, height: 66, objectFit: 'cover', borderRadius: 4, border: `2px solid ${MC.ink}` }} />}
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: MC.ink }}>{picked.title}</div>
                <div style={{ fontSize: 12, color: '#a06' }}>{picked.authors}</div>
              </div>
              <span style={{ flex: 1 }} />
              <MiniBtn small kind="ghost" onClick={() => setPicked(null)}>다른 책</MiniBtn>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <input value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="책 제목" maxLength={60}
                style={{ padding: 10, border: `2px solid ${MC.ink}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }} />
              <input value={mAuthor} onChange={e => setMAuthor(e.target.value)} placeholder="지은이 (안 적어도 돼요)" maxLength={40}
                style={{ padding: 10, border: `2px solid ${MC.line}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
              <button onClick={() => setManual(false)}
                style={{ fontSize: 12, color: '#a06', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', justifySelf: 'start' }}>
                ‹ 검색으로 돌아가기
              </button>
            </div>
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: MC.deep, marginBottom: 6 }}>이 책은 전부 몇 쪽인가요? <span style={{ fontWeight: 400, color: '#a06' }}>(진행률 표시에 써요 — 몰라도 괜찮아요)</span></div>
            <input value={pages} onChange={e => setPages(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="예: 240"
              style={{ width: 120, padding: 8, border: `2px solid ${MC.line}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }} /> 쪽
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: MC.deep, marginBottom: 6 }}>얼마나 읽을까요?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TARGET_PRESETS.map(m => (
                <button key={m} onClick={() => setMinutes(m)}
                  style={{ padding: '8px 14px', borderRadius: 999, border: `2px solid ${minutes === m ? MC.pink : MC.line}`, background: minutes === m ? MC.pinkSoft : '#fff', color: MC.ink, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13 }}>
                  {m}분
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <MiniBtn kind="primary" onClick={() => void start()}>📖 독서 시작!</MiniBtn>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ──────────────── 타이머 종료 — "몇 쪽까지 읽었어?" ──────────────── */
function FinishModal({ open, onClose, status, record, now, onSave }: {
  open: boolean; onClose: () => void; status: LibStatus
  record?: LibRecord; now: number
  onSave: (endPage: number | undefined, finished: boolean) => Promise<void>
}) {
  const [page, setPage] = useState('')
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    if (open) { setPage(record?.currentPage ? String(record.currentPage) : ''); setFinished(false) }
  }, [open, record])

  const minutes = Math.max(1, Math.round(elapsedMs(status, now) / 60000))
  const total = record?.book.totalPages

  return (
    <Modal open={open} onClose={onClose} title="✅ 오늘 독서 끝!" maxWidth={480}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ textAlign: 'center', background: MC.cream, border: `2px solid ${MC.line}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, color: '#a06' }}>『{status.book?.title}』</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: MC.deep, marginTop: 4 }}>⏱ {fmtMinutes(minutes)} 읽었어요!</div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: MC.ink, marginBottom: 6 }}>몇 쪽까지 읽었어요?</div>
          <input value={page} onChange={e => setPage(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoFocus
            placeholder={record?.currentPage ? `지난번엔 ${record.currentPage}쪽까지` : '예: 52'}
            style={{ width: 140, padding: 10, border: `2px solid ${MC.ink}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 16 }} /> 쪽{total ? ` / ${total}쪽` : ''}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 700, color: MC.ink, cursor: 'pointer' }}>
          <input type="checkbox" checked={finished} onChange={e => setFinished(e.target.checked)} style={{ width: 18, height: 18 }} />
          🏅 이 책을 다 읽었어요 (완독!)
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <MiniBtn kind="ghost" onClick={onClose}>계속 읽기</MiniBtn>
          <MiniBtn kind="primary" onClick={() => { const p = parseInt(page, 10); void onSave(p > 0 ? p : undefined, finished) }}>💾 기록 저장</MiniBtn>
        </div>
      </div>
    </Modal>
  )
}
