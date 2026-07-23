/* ──────────────────────────────────────────────────────────────
   모두의 도서관 — 전용 페이지 (/library).
   신의반 앱과 같은 Firestore 기록을 쓰지만, 로그인은
   "이름 선택 + 학생이 만든 비밀번호"로 한다. 시즌 2 기능 전체 포함.
   ────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { ROSTER } from '../../data'
import { useStudentStateMap } from '../../state'
import { useClassInfo } from '../../ClassContext'
import Sprite from '../../components/Sprite'
import { searchBooks } from '../kakao'
import {
  elapsedMs, finishReading, getOrCreateRecord, leaveSeat, liveness,
  pauseReading, resumeReading, sitDown, startReading, useHeartbeat, useLibRecords, useLibStatuses,
} from '../store'
import { SEAT_COUNT, TEACHER_NAME, TEACHER_SID, fmtMinutes, type LibBook, type LibRecord, type LibStatus } from '../types'
import { logoutLib, useLibSession } from './auth'
import LoginScreen from './LoginScreen'
import { ShelfModal } from './Shelf'
import { BookCover, LBtn, LModal } from './ui'
import './theme.css'

const TARGET_PRESETS = [10, 15, 20, 30]

export default function LibrarySitePage() {
  const session = useLibSession()
  return (
    <div className="libsite">
      <div className="lib-spines" />
      {session ? <LibraryMain sid={session.sid} name={session.name} /> : <LoginScreen />}
    </div>
  )
}

function LibraryMain({ sid, name }: { sid: string; name: string }) {
  const { get } = useStudentStateMap()
  const { classInfo } = useClassInfo()
  const statuses = useLibStatuses()
  const records = useLibRecords()

  const isTeacher = sid === TEACHER_SID

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const nameOf = (s: string) => s === TEACHER_SID ? TEACHER_NAME : ROSTER.find(r => r.id === s)?.name || s
  const avatarOf = (s: string) => s === TEACHER_SID ? undefined : get(s)?.customAvatar

  const active = useMemo(
    () => statuses.filter(s => (s.sid === TEACHER_SID || ROSTER.some(r => r.id === s.sid)) && liveness(s, now) !== 'gone'),
    [statuses, now])
  const bySeat = useMemo(() => {
    const m = new Map<number, LibStatus>()
    for (const s of active) if (s.seat !== null) m.set(s.seat, s)
    return m
  }, [active])
  const myStatus = active.find(s => s.sid === sid)

  useHeartbeat(sid, !!myStatus)

  const [searchOpen, setSearchOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [shelfSid, setShelfSid] = useState<string | null>(null)

  const recordOf = (st: LibStatus) => records.find(r => r.id === st.recordId)
  const enabled = classInfo.menus.find(m => m.key === 'library')?.enabled ?? false

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 16px 60px' }}>
      {/* 머리말 */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>모두의 도서관</h1>
          <p style={{ fontSize: 13, color: 'var(--lib-sub)', margin: '4px 0 0' }}>
            원하는 자리에 앉아 책을 읽어요. 친구 자리를 누르면 서재를 구경할 수 있어요.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="lib-chip">지금 {active.length}명 이용 중</span>
          <LBtn sm onClick={() => setShelfSid(sid)}>내 서재</LBtn>
          {!isTeacher && <LBtn sm kind="quiet" onClick={() => setShelfSid(TEACHER_SID)}>선생님 서재</LBtn>}
          <span style={{ fontSize: 13, color: 'var(--lib-sub)', marginLeft: 4 }}>{name} 님</span>
          <LBtn sm kind="quiet" onClick={() => { void logoutLib() }}>나가기</LBtn>
        </div>
      </header>

      {!enabled && !isTeacher ? (
        <div className="lib-card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: 36 }}>
          <div style={{ fontSize: 40 }}>🌙</div>
          <h2 style={{ fontSize: 20, margin: '10px 0 6px' }}>도서관이 닫혀 있어요</h2>
          <p style={{ fontSize: 14, color: 'var(--lib-sub)', margin: 0 }}>선생님이 도서관 문을 열면 들어올 수 있어요.</p>
        </div>
      ) : (
        <>
          <MyPanel status={myStatus} record={myStatus ? recordOf(myStatus) : undefined} now={now}
            onPickBook={() => setSearchOpen(true)} onFinish={() => setFinishOpen(true)}
            onPause={() => void pauseReading(sid)} onResume={() => void resumeReading(sid)}
            onLeave={() => { if (!myStatus?.startedAt || confirm('타이머가 도는 중이에요. 정말 나갈까요? (읽은 시간은 저장되지 않아요)')) void leaveSeat(sid) }} />

          {/* 좌석 그리드 */}
          <div className="lib-card" style={{ marginTop: 14, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {Array.from({ length: SEAT_COUNT }, (_, i) => {
                const st = bySeat.get(i)
                if (!st) {
                  return (
                    <button key={i} onClick={() => void sitDown(sid, i)} className="lib-seat lib-seat--empty">
                      <span className="lib-lamp" aria-hidden />
                      <span style={{ fontSize: 12 }}>{myStatus ? '이 자리로 옮기기' : '여기 앉기'}</span>
                    </button>
                  )
                }
                const live = liveness(st, now)
                const isMe = st.sid === sid
                const rec = recordOf(st)
                const total = rec?.book.totalPages ?? 0
                const pct = rec ? (rec.finished ? 100 : total > 0 ? Math.min(100, Math.round((rec.currentPage / total) * 100)) : null) : null
                const cls = ['lib-seat']
                if (live === 'reading') cls.push('lib-seat--reading')
                if (live === 'away') cls.push('lib-seat--away')
                if (isMe) cls.push('lib-seat--me')
                return (
                  <button key={i} onClick={() => setShelfSid(st.sid)} className={cls.join(' ')}
                    title={`${nameOf(st.sid)} 님의 서재 구경하기`}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {st.sid === TEACHER_SID
                        ? <div style={{ fontSize: 28, lineHeight: '40px' }}>👩‍🏫</div>
                        : <Sprite seed={st.sid} size={40} customSrc={avatarOf(st.sid)} shadow={false} />}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {nameOf(st.sid)}{isMe && ' (나)'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, color: live === 'reading' ? 'var(--lib-amber)' : 'var(--lib-sub)' }}>
                      <span className={`lib-lamp${live === 'reading' ? ' lib-lamp--on' : ''}`} aria-hidden style={{ marginRight: 4 }} />
                      {live === 'reading' ? '집중해서 읽는 중' : live === 'away' ? '자리 비움' : '쉬는 중'}
                    </div>
                    {st.book && (
                      <div style={{ fontSize: 11, color: 'var(--lib-sub)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        『{st.book.title}』{pct !== null ? ` ${pct}%` : ''}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* 책 고르기 */}
      <BookSearchModal open={searchOpen} onClose={() => setSearchOpen(false)}
        myUnfinished={records
          .filter(r => r.sid === sid && !r.finished)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))}
        onStart={async (book, minutes) => {
          const rec = await getOrCreateRecord(sid, book)
          await startReading(sid, book, rec.id, minutes)
          setSearchOpen(false)
        }} />

      {/* 타이머 종료 */}
      {myStatus && (
        <FinishModal open={finishOpen} onClose={() => setFinishOpen(false)} status={myStatus}
          record={recordOf(myStatus)} now={now}
          onSave={async (endPage, finished) => {
            await finishReading(sid, { endPage, finished })
            setFinishOpen(false)
          }} />
      )}

      {/* 서재 구경 */}
      {shelfSid && (
        <ShelfModal open onClose={() => setShelfSid(null)} sid={shelfSid}
          name={nameOf(shelfSid)} own={shelfSid === sid} />
      )}
    </div>
  )
}

/* ──────────────── 내 독서 패널 ──────────────── */
function MyPanel({ status, record, now, onPickBook, onFinish, onPause, onResume, onLeave }: {
  status?: LibStatus; record?: LibRecord; now: number
  onPickBook: () => void; onFinish: () => void; onPause: () => void; onResume: () => void; onLeave: () => void
}) {
  if (!status) {
    return (
      <div className="lib-card" style={{ padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>아래에서 마음에 드는 빈자리를 눌러 도서관에 들어가요.</span>
      </div>
    )
  }

  const reading = status.mode === 'reading' && !!status.startedAt
  const paused = !!status.pausedAt

  if (!reading) {
    return (
      <div className="lib-card" style={{ padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 160 }}>자리에 앉았어요. 이제 책을 골라 볼까요?</span>
        <LBtn kind="primary" onClick={onPickBook}>책 고르고 읽기</LBtn>
        <LBtn kind="quiet" onClick={onLeave}>자리 비우기</LBtn>
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
  const pct = record && total > 0 ? Math.min(100, Math.round((record.currentPage / total) * 100)) : null

  return (
    <div className="lib-card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', background: done ? 'var(--lib-amber-soft)' : 'var(--lib-card)' }}>
      <div className="lib-timer" style={{ fontSize: 36, color: done ? 'var(--lib-amber)' : 'var(--lib-green)' }}>
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div className="lib-serif" style={{ fontSize: 15, fontWeight: 700 }}>『{status.book?.title}』</div>
        <div style={{ fontSize: 13, color: 'var(--lib-sub)', marginTop: 2 }}>
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
          ? <LBtn onClick={onResume}>다시 읽기</LBtn>
          : <LBtn onClick={onPause}>잠깐 멈춤</LBtn>}
        <LBtn kind="primary" onClick={onFinish}>다 읽었어요</LBtn>
        <LBtn kind="quiet" onClick={onLeave}>나가기</LBtn>
      </div>
    </div>
  )
}

/* ──────────────── 책 고르기 (카카오 검색 + 수동 입력) ──────────────── */
function BookSearchModal({ open, onClose, onStart, myUnfinished }: {
  open: boolean; onClose: () => void
  onStart: (book: LibBook, minutes: number) => Promise<void>
  myUnfinished: LibRecord[]
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<LibBook[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [picked, setPicked] = useState<LibBook | null>(null)
  const [minutes, setMinutes] = useState(20)
  const [manual, setManual] = useState(false)
  const [mTitle, setMTitle] = useState('')
  const [mAuthor, setMAuthor] = useState('')

  const reset = () => { setQ(''); setResults([]); setSearched(false); setPicked(null); setManual(false); setMTitle(''); setMAuthor('') }
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
    await onStart(book, minutes)
    reset()
  }

  return (
    <LModal open={open} onClose={close} title="무슨 책을 읽을까요?" maxWidth={620}>
      {!picked && !manual && (
        <div style={{ display: 'grid', gap: 12 }}>
          {myUnfinished.length > 0 && (
            <div>
              <div className="lib-label">읽던 책 이어서 읽기</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 6, maxHeight: 230, overflowY: 'auto' }}>
                {myUnfinished.map(rec => {
                  const total = rec.book.totalPages ?? 0
                  const pct = total > 0 ? Math.min(100, Math.round((rec.currentPage / total) * 100)) : null
                  return (
                    <button key={rec.id} onClick={() => setPicked(rec.book)} className="lib-seat"
                      style={{ minHeight: 0, display: 'flex', gap: 8, alignItems: 'center', textAlign: 'left', padding: 8 }}>
                      <BookCover title={rec.book.title} thumbnail={rec.book.thumbnail} size={32} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.book.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--lib-sub)', marginTop: 2 }}>
                          {rec.currentPage > 0 ? `${rec.currentPage}쪽까지 읽음` : '읽기 시작한 책'}{pct !== null ? ` · ${pct}%` : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="lib-label" style={{ margin: '12px 0 2px' }}>새 책 읽기</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <label htmlFor="lib-book-q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>책 제목 검색</label>
            <input id="lib-book-q" className="lib-input" value={q} onChange={e => setQ(e.target.value)}
              placeholder="책 제목을 검색해 봐요 (예: 해리 포터)" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') void doSearch() }} style={{ flex: 1 }} />
            <LBtn kind="primary" onClick={() => void doSearch()} disabled={searching}>{searching ? '찾는 중…' : '검색'}</LBtn>
          </div>
          {results.length > 0 && (
            <div style={{ display: 'grid', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {results.map((b, i) => (
                <button key={i} onClick={() => setPicked(b)} className="lib-seat"
                  style={{ minHeight: 0, display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: 8 }}>
                  <BookCover title={b.title} thumbnail={b.thumbnail} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--lib-sub)' }}>{b.authors}{b.publisher ? ` · ${b.publisher}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searched && results.length === 0 && !searching && (
            <div style={{ fontSize: 13, color: 'var(--lib-sub)', textAlign: 'center', padding: 10 }}>검색 결과가 없어요. 아래에서 직접 입력해 보세요.</div>
          )}
          <button onClick={() => setManual(true)} className="lib-btn lib-btn--quiet lib-btn--sm" style={{ justifySelf: 'center', textDecoration: 'underline' }}>
            검색에 없는 책이에요 — 직접 입력하기
          </button>
        </div>
      )}

      {(picked || manual) && (
        <div style={{ display: 'grid', gap: 14 }}>
          {picked ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <BookCover title={picked.title} thumbnail={picked.thumbnail} size={46} />
              <div>
                <div className="lib-serif" style={{ fontWeight: 700, fontSize: 15 }}>{picked.title}</div>
                <div style={{ fontSize: 13, color: 'var(--lib-sub)' }}>{picked.authors}</div>
              </div>
              <span style={{ flex: 1 }} />
              <LBtn sm kind="quiet" onClick={() => setPicked(null)}>다른 책</LBtn>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <label className="lib-label" htmlFor="lib-m-title">책 제목</label>
                <input id="lib-m-title" className="lib-input" value={mTitle} onChange={e => setMTitle(e.target.value)} maxLength={60} />
              </div>
              <div>
                <label className="lib-label" htmlFor="lib-m-author">지은이 (안 적어도 돼요)</label>
                <input id="lib-m-author" className="lib-input" value={mAuthor} onChange={e => setMAuthor(e.target.value)} maxLength={40} />
              </div>
              <button onClick={() => setManual(false)} className="lib-btn lib-btn--quiet lib-btn--sm" style={{ justifySelf: 'start', textDecoration: 'underline' }}>
                ‹ 검색으로 돌아가기
              </button>
            </div>
          )}

          <div>
            <div className="lib-label">얼마나 읽을까요?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TARGET_PRESETS.map(m => (
                <button key={m} onClick={() => setMinutes(m)} className="lib-btn lib-btn--sm"
                  style={minutes === m ? { background: 'var(--lib-green)', borderColor: 'var(--lib-green)', color: '#fff' } : undefined}>
                  {m}분
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <LBtn kind="primary" onClick={() => void start()}>독서 시작</LBtn>
          </div>
        </div>
      )}
    </LModal>
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
    <LModal open={open} onClose={onClose} title="오늘 독서 끝!" maxWidth={460}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div className="lib-card" style={{ textAlign: 'center', padding: 14, background: 'var(--lib-green-soft)', borderColor: '#c8dbc9' }}>
          <div className="lib-serif" style={{ fontSize: 13, color: 'var(--lib-sub)' }}>『{status.book?.title}』</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--lib-green)', marginTop: 4 }}>{fmtMinutes(minutes)} 읽었어요!</div>
        </div>
        <div>
          <label className="lib-label" htmlFor="lib-endpage">몇 쪽까지 읽었어요?</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="lib-endpage" className="lib-input" value={page} onChange={e => setPage(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric" autoFocus style={{ width: 140 }}
              placeholder={record?.currentPage ? `지난번엔 ${record.currentPage}쪽까지` : '예: 52'} />
            <span style={{ fontSize: 14 }}>쪽{total ? ` / ${total}쪽` : ''}</span>
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={finished} onChange={e => setFinished(e.target.checked)} style={{ width: 18, height: 18 }} />
          이 책을 다 읽었어요 (완독!)
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <LBtn kind="quiet" onClick={onClose}>계속 읽기</LBtn>
          <LBtn kind="primary" onClick={() => { const p = parseInt(page, 10); void onSave(p > 0 ? p : undefined, finished) }}>기록 저장</LBtn>
        </div>
      </div>
    </LModal>
  )
}
