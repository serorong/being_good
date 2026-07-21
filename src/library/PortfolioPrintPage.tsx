/* ──────────────────────────────────────────────────────────────
   독서 포트폴리오 인쇄용 보기 (교사 전용).
   학급관리 → 도서관 → 학생 선택으로 진입. 브라우저 인쇄(⌘P)로 PDF 저장.
   ────────────────────────────────────────────────────────────── */
import { useParams, useNavigate } from 'react-router-dom'
import { useRoster } from '../state'
import { useClassInfo } from '../ClassContext'
import { MindMapViewer } from './MindMap'
import { useLibActivities, useLibRecords } from './store'
import { activityMeta, fmtMinutes } from './types'

export default function PortfolioPrintPage() {
  const { sid = '' } = useParams()
  const nav = useNavigate()
  const roster = useRoster()
  const { classInfo } = useClassInfo()
  const records = useLibRecords().filter(r => r.sid === sid).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const activities = useLibActivities()

  const student = roster.find(s => s.id === sid)
  const totalMin = records.reduce((a, r) => a + r.sessions.reduce((x, s) => x + s.minutes, 0), 0)
  const finished = records.filter(r => r.finished).length
  const actCount = activities.filter(a => a.sid === sid).length
  const actsOf = (recId: string) => activities.filter(a => a.recordId === recId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (!student) return <div style={{ padding: 40, fontFamily: 'Pretendard, sans-serif' }}>학생을 찾을 수 없어요.</div>

  return (
    <div className="print-root">
      <style>{`
        .print-root { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; color: #2b2320; background: #f2ede4; min-height: 100vh; }
        .print-page { max-width: 800px; margin: 0 auto; background: #fff; padding: 48px 56px; }
        .print-toolbar { position: sticky; top: 0; z-index: 10; background: #3a2b3a; color: #fff; padding: 10px 16px; display: flex; gap: 12px; align-items: center; }
        .print-toolbar button { font-family: inherit; font-weight: 700; border-radius: 8px; padding: 8px 16px; cursor: pointer; border: none; }
        .pp-cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px double #b8a06a; margin-bottom: 32px; }
        .pp-book { page-break-inside: avoid; margin-bottom: 28px; border: 1px solid #e2d7c0; border-radius: 12px; padding: 20px 24px; }
        .pp-act { page-break-inside: avoid; margin-top: 14px; padding: 14px 16px; background: #faf7f0; border-radius: 10px; }
        .pp-act img { max-width: 420px; width: 100%; border: 1px solid #e2d7c0; border-radius: 6px; margin-top: 8px; }
        @media print {
          .print-toolbar { display: none; }
          .print-root { background: #fff; }
          .print-page { max-width: none; padding: 0; }
        }
      `}</style>

      <div className="print-toolbar">
        <button onClick={() => nav(-1)} style={{ background: '#fff', color: '#3a2b3a' }}>‹ 돌아가기</button>
        <span style={{ fontSize: 14 }}>{student.realName} 학생의 독서 포트폴리오 — 인쇄용 보기</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ background: '#f0b429', color: '#3a2b3a' }}>🖨 인쇄 / PDF 저장</button>
      </div>

      <div className="print-page">
        {/* 표지 */}
        <div className="pp-cover">
          <div style={{ fontSize: 13, letterSpacing: 4, color: '#b8a06a' }}>{classInfo.terms.className} · 방학 독서 여행</div>
          <h1 style={{ fontSize: 34, margin: '14px 0 6px' }}>{student.realName}의 독서 포트폴리오</h1>
          <div style={{ fontSize: 14, color: '#8a7a5a', marginTop: 18, display: 'flex', gap: 24, justifyContent: 'center' }}>
            <span>📖 읽은 책 <b>{records.length}권</b></span>
            <span>🏅 완독 <b>{finished}권</b></span>
            <span>⏱ 총 독서 <b>{fmtMinutes(totalMin)}</b></span>
            <span>🌟 독후활동 <b>{actCount}개</b></span>
          </div>
        </div>

        {records.length === 0 && <p style={{ textAlign: 'center', color: '#8a7a5a' }}>아직 독서 기록이 없어요.</p>}

        {/* 책별 기록 */}
        {records.map(rec => {
          const mins = rec.sessions.reduce((a, s) => a + s.minutes, 0)
          return (
            <section key={rec.id} className="pp-book">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {rec.book.thumbnail && <img src={rec.book.thumbnail} alt="" style={{ width: 64, borderRadius: 4, border: '1px solid #e2d7c0' }} />}
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 19, margin: '0 0 2px' }}>
                    {rec.book.title} {rec.finished && <span style={{ fontSize: 13, color: '#b8860b' }}>🏅 완독</span>}
                  </h2>
                  <div style={{ fontSize: 13, color: '#8a7a5a' }}>
                    {rec.book.authors}{rec.book.publisher ? ` · ${rec.book.publisher}` : ''}
                  </div>
                  <div style={{ fontSize: 13, color: '#5a4a3a', marginTop: 6 }}>
                    {rec.sessions.length}번에 걸쳐 총 {fmtMinutes(mins)} 읽음
                    {rec.book.totalPages ? ` · ${rec.currentPage}/${rec.book.totalPages}쪽` : rec.currentPage ? ` · ${rec.currentPage}쪽까지` : ''}
                    {rec.sessions.length > 0 && ` · ${rec.sessions[0].date} ~ ${rec.sessions[rec.sessions.length - 1].date}`}
                  </div>
                </div>
              </div>

              {actsOf(rec.id).map(a => {
                const meta = activityMeta(a.type)
                return (
                  <div key={a.id} className="pp-act">
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#8a6d2a' }}>
                      {meta.icon} {meta.label}{a.title ? ` — ${a.title}` : ''} <span style={{ fontWeight: 400, color: '#b0a080' }}>({a.createdAt.slice(0, 10)})</span>
                    </div>
                    {a.text && <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, margin: '8px 0 0' }}>{a.text}</p>}
                    {a.imageDataUrl && <img src={a.imageDataUrl} alt={meta.label} />}
                    {a.mindmap && <div style={{ maxWidth: 480, marginTop: 8 }}><MindMapViewer root={a.mindmap} /></div>}
                  </div>
                )
              })}
            </section>
          )
        })}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#b0a080', marginTop: 40 }}>
          {classInfo.terms.className} 모두의 도서관에서 함께한 기록입니다 🌿
        </p>
      </div>
    </div>
  )
}
