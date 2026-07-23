/* 모두의 도서관 전용 페이지 — 독서 서재 모달 (BookshelfModal의 새 테마판).
   그리기·마인드맵 편집기는 기존 것을 그대로 재사용한다. */
import { useMemo, useState } from 'react'
import { SketchBoard } from '../../minihompy/SketchBoard'
import { MindMapEditor, MindMapViewer } from '../MindMap'
import { addActivity, removeActivity, removeRecord, useLibActivities, useLibRecords } from '../store'
import { ACTIVITY_TYPES, activityMeta, fmtMinutes, type LibActivity, type LibActivityType, type LibRecord } from '../types'
import { BookCover, LBtn, LModal, LProgress } from './ui'

const dateShort = (iso: string) => iso.slice(0, 10)

export function ShelfModal({ open, onClose, sid, name, own }: {
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
    <LModal open={open} onClose={close} title={`${name} 님의 독서 서재`} maxWidth={780}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="lib-chip lib-chip--plain">읽은 책 {records.length}권</span>
        <span className="lib-chip lib-chip--amber">완독 {finishedCount}권</span>
        <span className="lib-chip">총 {fmtMinutes(totalMin)}</span>
      </div>

      {!openRec ? (
        records.length === 0 ? (
          <div className="lib-card" style={{ padding: 28, textAlign: 'center', color: 'var(--lib-sub)', borderStyle: 'dashed', fontSize: 14, lineHeight: 1.7 }}>
            아직 서재가 비어 있어요.<br />
            {own ? '도서관에서 책을 읽으면 여기에 차곡차곡 쌓여요!' : '친구가 책을 읽으면 여기에 쌓여요.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 10 }}>
            {records.map(rec => (
              <button key={rec.id} onClick={() => setOpenRecId(rec.id)} className="lib-seat"
                style={{ minHeight: 0, display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: 10 }}>
                <BookCover title={rec.book.title} thumbnail={rec.book.thumbnail} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.book.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--lib-sub)', margin: '2px 0 6px' }}>
                    {fmtMinutes(rec.sessions.reduce((a, s) => a + s.minutes, 0))} · 활동 {actsOf(rec.id).length}개
                  </div>
                  <LProgress rec={rec} />
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <LBtn sm onClick={() => { setOpenRecId(null); setAdding(null) }}>‹ 책꽂이</LBtn>
            <BookCover title={openRec.book.title} thumbnail={openRec.book.thumbnail} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lib-serif" style={{ fontWeight: 700, fontSize: 16 }}>{openRec.book.title}</div>
              <div style={{ fontSize: 13, color: 'var(--lib-sub)' }}>{openRec.book.authors}{openRec.book.publisher ? ` · ${openRec.book.publisher}` : ''}</div>
              <div style={{ marginTop: 6 }}><LProgress rec={openRec} /></div>
              <div style={{ fontSize: 12, color: 'var(--lib-sub)', marginTop: 4 }}>
                {openRec.sessions.length}번 읽음 · 총 {fmtMinutes(openRec.sessions.reduce((a, s) => a + s.minutes, 0))}
                {openRec.book.totalPages ? ` · 전체 ${openRec.book.totalPages}쪽` : ''}
              </div>
            </div>
            {own && (
              <LBtn sm kind="danger" onClick={() => {
                if (confirm('이 책의 기록을 지울까요? 독후활동도 함께 사라져요.')) {
                  actsOf(openRec.id).forEach(a => void removeActivity(a.id))
                  void removeRecord(openRec.id)
                  setOpenRecId(null)
                }
              }}>기록 지우기</LBtn>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>독후활동</h3>
            <span style={{ flex: 1 }} />
            {own && !adding && <LBtn sm kind="primary" onClick={() => setAdding('pick')}>+ 활동 만들기</LBtn>}
          </div>

          {own && adding === 'pick' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 8, marginBottom: 14 }}>
              {ACTIVITY_TYPES.map(t => (
                <button key={t.type} onClick={() => setAdding(t.type)} className="lib-seat"
                  style={{ minHeight: 0, textAlign: 'left', padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--lib-sub)', marginTop: 3, lineHeight: 1.5 }}>{t.hint}</div>
                </button>
              ))}
            </div>
          )}

          {own && adding && adding !== 'pick' && (
            <ActivityEditor type={adding} rec={openRec} sid={sid}
              onDone={() => setAdding(null)} onCancel={() => setAdding('pick')} />
          )}

          {actsOf(openRec.id).length === 0 && !adding ? (
            <div className="lib-card" style={{ padding: 18, textAlign: 'center', color: 'var(--lib-sub)', borderStyle: 'dashed', fontSize: 13 }}>
              아직 독후활동이 없어요.{own && ' 위의 [+ 활동 만들기]를 눌러 보세요!'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8 }}>
              {actsOf(openRec.id).map(a => {
                const meta = activityMeta(a.type)
                return (
                  <button key={a.id} onClick={() => setViewingAct(a)} className="lib-seat"
                    style={{ minHeight: 0, textAlign: 'left', padding: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lib-green)', marginBottom: 4 }}>{meta.icon} {meta.label}</div>
                    {a.imageDataUrl && <img src={a.imageDataUrl} alt={a.title || '독후활동 그림'} style={{ width: '100%', borderRadius: 6, border: '1px solid var(--lib-line)' }} />}
                    {a.text && <div style={{ fontSize: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>{a.text}</div>}
                    {a.mindmap && <div style={{ fontSize: 12 }}>{a.mindmap.text} 마인드맵</div>}
                    <div style={{ fontSize: 10, color: 'var(--lib-sub)', marginTop: 4 }}>{dateShort(a.createdAt)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 활동 열람 팝업 */}
      <LModal open={!!viewingAct} onClose={() => setViewingAct(null)} maxWidth={720}
        title={viewingAct ? `${activityMeta(viewingAct.type).icon} ${activityMeta(viewingAct.type).label}` : ''}>
        {viewingAct && (
          <div style={{ display: 'grid', gap: 10 }}>
            {viewingAct.title && <div className="lib-serif" style={{ fontWeight: 700, fontSize: 16 }}>{viewingAct.title}</div>}
            {viewingAct.imageDataUrl && (
              <div style={{ background: '#fff', border: '4px solid #caa86a', borderRadius: 6 }}>
                <img src={viewingAct.imageDataUrl} alt={viewingAct.title || '독후활동 그림'} style={{ display: 'block', width: '100%', borderRadius: 2 }} />
              </div>
            )}
            {viewingAct.mindmap && <MindMapViewer root={viewingAct.mindmap} />}
            {viewingAct.text && (
              <div className="lib-card" style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.8, padding: 16 }}>
                {viewingAct.text}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--lib-sub)' }}>{dateShort(viewingAct.createdAt)}</span>
              {own && (
                <LBtn sm kind="danger" onClick={() => {
                  if (confirm('이 활동을 지울까요?')) { void removeActivity(viewingAct.id); setViewingAct(null) }
                }}>지우기</LBtn>
              )}
            </div>
          </div>
        )}
      </LModal>
    </LModal>
  )
}

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
    <div className="lib-card" style={{ marginBottom: 14, padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{meta.icon} {meta.label}</div>
      <p style={{ fontSize: 12, color: 'var(--lib-sub)', margin: '0 0 10px' }}>{meta.hint}</p>

      {meta.kind === 'text' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <label className="lib-label" htmlFor="lib-act-title">제목 (안 적어도 돼요)</label>
            <input id="lib-act-title" className="lib-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={40} />
          </div>
          <div>
            <label className="lib-label" htmlFor="lib-act-text">내용</label>
            <textarea id="lib-act-text" className="lib-input" value={text} onChange={e => setText(e.target.value)} rows={7} maxLength={2000}
              placeholder={type === 'sentence' ? '"마음에 남은 문장"을 옮겨 적고, 왜 좋았는지 써 봐요' : '자유롭게 써 봐요'}
              style={{ lineHeight: 1.6, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <LBtn kind="quiet" onClick={onCancel}>다른 활동 고르기</LBtn>
            <LBtn kind="primary" onClick={() => void saveText()}>저장하기</LBtn>
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
