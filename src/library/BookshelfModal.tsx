/* ──────────────────────────────────────────────────────────────
   독서 서재 (포트폴리오 가구 팝업) — 미니룸 책장 클릭 시 열림.
   내 서재: 독후활동 추가/삭제 가능. 친구 서재: 열람만.
   ────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { Modal } from '../minihompy/Modal'
import { MC, MiniBtn } from '../minihompy/parts'
import { SketchBoard } from '../minihompy/SketchBoard'
import { MindMapEditor, MindMapViewer } from './MindMap'
import { addActivity, removeActivity, removeRecord, useLibActivities, useLibRecords } from './store'
import { ACTIVITY_TYPES, activityMeta, fmtMinutes, type LibActivity, type LibActivityType, type LibRecord } from './types'

const dateShort = (iso: string) => iso.slice(0, 10)

function BookCover({ rec, size = 64 }: { rec: LibRecord; size?: number }) {
  return rec.book.thumbnail ? (
    <img src={rec.book.thumbnail} alt="" style={{ width: size, height: size * 1.45, objectFit: 'cover', borderRadius: 4, border: `2px solid ${MC.ink}` }} />
  ) : (
    <div style={{ width: size, height: size * 1.45, borderRadius: 4, border: `2px solid ${MC.ink}`, background: '#f6e7c8', display: 'grid', placeItems: 'center', fontSize: size / 2.4 }}>📕</div>
  )
}

function ProgressBar({ rec }: { rec: LibRecord }) {
  const total = rec.book.totalPages ?? 0
  const pct = rec.finished ? 100 : total > 0 ? Math.min(100, Math.round((rec.currentPage / total) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 10, background: '#f0e3ea', borderRadius: 999, border: `1px solid ${MC.line}`, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: rec.finished ? '#f0b429' : MC.pink, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: MC.deep, minWidth: 32, textAlign: 'right' }}>
        {rec.finished ? '완독!' : total > 0 ? `${pct}%` : `${rec.currentPage}쪽`}
      </span>
    </div>
  )
}

export function BookshelfModal({ open, onClose, sid, name, own }: {
  open: boolean; onClose: () => void; sid: string; name: string; own: boolean
}) {
  const allRecords = useLibRecords()
  const allActivities = useLibActivities()
  const [openRecId, setOpenRecId] = useState<string | null>(null)
  const [adding, setAdding] = useState<LibActivityType | 'pick' | null>(null)
  const [viewingAct, setViewingAct] = useState<LibActivity | null>(null)

  const records = useMemo(
    () => allRecords.filter(r => r.sid === sid).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allRecords, sid])
  const openRec = records.find(r => r.id === openRecId) ?? null
  const actsOf = (recId: string) => allActivities.filter(a => a.recordId === recId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const totalMin = records.reduce((a, r) => a + r.sessions.reduce((x, s) => x + s.minutes, 0), 0)
  const finishedCount = records.filter(r => r.finished).length

  const close = () => { setOpenRecId(null); setAdding(null); setViewingAct(null); onClose() }

  return (
    <Modal open={open} onClose={close} title={`📚 ${name} 님의 독서 서재`} maxWidth={780}>
      {/* 요약 줄 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={chip}>📖 읽은 책 {records.length}권</span>
        <span style={chip}>🏅 완독 {finishedCount}권</span>
        <span style={chip}>⏱ 총 {fmtMinutes(totalMin)}</span>
      </div>

      {!openRec ? (
        /* ── 책꽂이 (기록 목록) ── */
        records.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: '#a06', background: MC.cream, borderRadius: 12, border: `2px dashed ${MC.line}` }}>
            아직 서재가 비어 있어요.<br />
            {own ? '모두의 도서관에서 책을 읽으면 여기에 차곡차곡 쌓여요!' : '친구가 책을 읽으면 여기에 쌓여요.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {records.map(rec => (
              <button key={rec.id} onClick={() => setOpenRecId(rec.id)}
                style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: 10, borderRadius: 12, border: `2px solid ${MC.line}`, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                <BookCover rec={rec} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: MC.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.book.title}</div>
                  <div style={{ fontSize: 11, color: '#a06', margin: '2px 0 6px' }}>
                    {fmtMinutes(rec.sessions.reduce((a, s) => a + s.minutes, 0))} · 활동 {actsOf(rec.id).length}개
                  </div>
                  <ProgressBar rec={rec} />
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        /* ── 책 상세: 기록 + 독후활동 ── */
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <MiniBtn small onClick={() => { setOpenRecId(null); setAdding(null) }}>‹ 책꽂이</MiniBtn>
            <BookCover rec={openRec} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: MC.ink }}>{openRec.book.title}</div>
              <div style={{ fontSize: 12, color: '#a06' }}>{openRec.book.authors}{openRec.book.publisher ? ` · ${openRec.book.publisher}` : ''}</div>
              <div style={{ marginTop: 6 }}><ProgressBar rec={openRec} /></div>
              <div style={{ fontSize: 11, color: '#a06', marginTop: 4 }}>
                {openRec.sessions.length}번 읽음 · 총 {fmtMinutes(openRec.sessions.reduce((a, s) => a + s.minutes, 0))}
                {openRec.book.totalPages ? ` · 전체 ${openRec.book.totalPages}쪽` : ''}
              </div>
            </div>
            {own && (
              <MiniBtn small kind="ghost" onClick={() => {
                if (confirm('이 책의 기록을 지울까요? 독후활동도 함께 사라져요.')) {
                  actsOf(openRec.id).forEach(a => void removeActivity(a.id))
                  void removeRecord(openRec.id)
                  setOpenRecId(null)
                }
              }}>🗑</MiniBtn>
            )}
          </div>

          {/* 독후활동 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 800, color: MC.deep }}>🌟 독후활동</div>
            <span style={{ flex: 1 }} />
            {own && !adding && (
              <MiniBtn small kind="primary" onClick={() => setAdding('pick')}>+ 활동 만들기</MiniBtn>
            )}
          </div>

          {/* 활동 종류 고르기 */}
          {own && adding === 'pick' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8, marginBottom: 12 }}>
              {ACTIVITY_TYPES.map(t => (
                <button key={t.type} onClick={() => setAdding(t.type)}
                  style={{ textAlign: 'left', padding: 10, borderRadius: 12, border: `2px solid ${MC.line}`, background: MC.cream, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: MC.ink }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize: 11, color: '#a06', marginTop: 2 }}>{t.hint}</div>
                </button>
              ))}
            </div>
          )}

          {/* 활동 편집기 */}
          {own && adding && adding !== 'pick' && (
            <ActivityEditor type={adding} rec={openRec} sid={sid}
              onDone={() => setAdding(null)} onCancel={() => setAdding('pick')} />
          )}

          {/* 활동 목록 */}
          {actsOf(openRec.id).length === 0 && !adding ? (
            <div style={{ padding: 18, textAlign: 'center', color: '#a06', background: MC.cream, borderRadius: 12, border: `2px dashed ${MC.line}`, fontSize: 13 }}>
              아직 독후활동이 없어요.{own && ' 위의 [+ 활동 만들기]를 눌러 보세요!'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
              {actsOf(openRec.id).map(a => {
                const meta = activityMeta(a.type)
                return (
                  <button key={a.id} onClick={() => setViewingAct(a)}
                    style={{ textAlign: 'left', padding: 10, borderRadius: 12, border: `2px solid ${MC.line}`, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: MC.deep, marginBottom: 4 }}>{meta.icon} {meta.label}</div>
                    {a.imageDataUrl && <img src={a.imageDataUrl} alt="" style={{ width: '100%', borderRadius: 6, border: `1px solid ${MC.line}` }} />}
                    {a.text && <div style={{ fontSize: 12, color: MC.ink, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{a.text}</div>}
                    {a.mindmap && <div style={{ fontSize: 12, color: MC.ink }}>🕸️ {a.mindmap.text} 마인드맵</div>}
                    <div style={{ fontSize: 10, color: '#b88', marginTop: 4 }}>{dateShort(a.createdAt)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 활동 열람 팝업 */}
      <Modal open={!!viewingAct} onClose={() => setViewingAct(null)}
        title={viewingAct ? `${activityMeta(viewingAct.type).icon} ${activityMeta(viewingAct.type).label}` : ''} maxWidth={720}>
        {viewingAct && (
          <div style={{ display: 'grid', gap: 10 }}>
            {viewingAct.title && <div style={{ fontWeight: 800, fontSize: 15, color: MC.ink }}>{viewingAct.title}</div>}
            {viewingAct.imageDataUrl && (
              <div style={{ background: '#fff', border: '4px solid #caa86a', borderRadius: 6 }}>
                <img src={viewingAct.imageDataUrl} alt="" style={{ display: 'block', width: '100%', borderRadius: 2 }} />
              </div>
            )}
            {viewingAct.mindmap && <MindMapViewer root={viewingAct.mindmap} />}
            {viewingAct.text && (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: MC.ink, background: MC.cream, borderRadius: 10, padding: 14, border: `1px solid ${MC.line}` }}>
                {viewingAct.text}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#a06' }}>{dateShort(viewingAct.createdAt)}</span>
              {own && (
                <MiniBtn small kind="ghost" onClick={() => {
                  if (confirm('이 활동을 지울까요?')) { void removeActivity(viewingAct.id); setViewingAct(null) }
                }}>🗑 지우기</MiniBtn>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  )
}

const chip: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: MC.deep, background: MC.pinkSoft, border: `1px solid ${MC.line}`, borderRadius: 999, padding: '4px 10px' }

/* ── 활동 편집기: 글쓰기 / 그리기 / 마인드맵 ── */
function ActivityEditor({ type, rec, sid, onDone, onCancel }: {
  type: LibActivityType; rec: LibRecord; sid: string; onDone: () => void; onCancel: () => void
}) {
  const meta = activityMeta(type)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')

  const saveText = async () => {
    if (!text.trim()) { alert('내용을 적어 주세요!'); return }
    await addActivity({ sid, recordId: rec.id, type, title: title.trim() || undefined, text: text.trim() })
    onDone()
  }

  return (
    <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: `2px solid ${MC.ink}`, background: '#fff' }}>
      <div style={{ fontWeight: 800, color: MC.deep, marginBottom: 4 }}>{meta.icon} {meta.label}</div>
      <p style={{ fontSize: 12, color: '#a06', margin: '0 0 10px' }}>{meta.hint}</p>

      {meta.kind === 'text' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={40} placeholder="제목 (안 적어도 돼요)"
            style={{ padding: 8, border: `2px solid ${MC.line}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
          <textarea value={text} onChange={e => setText(e.target.value)} rows={7} maxLength={2000}
            placeholder={type === 'sentence' ? '“마음에 남은 문장”을 옮겨 적고, 왜 좋았는지 써 봐요' : '자유롭게 써 봐요'}
            style={{ padding: 10, border: `2px solid ${MC.line}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <MiniBtn kind="ghost" onClick={onCancel}>다른 활동 고르기</MiniBtn>
            <MiniBtn kind="primary" onClick={() => void saveText()}>💾 저장하기</MiniBtn>
          </div>
        </div>
      )}

      {meta.kind === 'drawing' && (
        <SketchBoard withTitle initialTitle="" titlePlaceholder="그림 제목" submitLabel="서재에 넣기"
          onSubmit={(dataUrl, t) => {
            void addActivity({ sid, recordId: rec.id, type, title: t || undefined, imageDataUrl: dataUrl }).then(onDone)
          }}
          onCancel={onCancel} />
      )}

      {meta.kind === 'mindmap' && (
        <MindMapEditor bookTitle={rec.book.title}
          onSave={root => { void addActivity({ sid, recordId: rec.id, type, mindmap: root }).then(onDone) }}
          onCancel={onCancel} />
      )}
    </div>
  )
}
