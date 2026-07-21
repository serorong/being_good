/* ──────────────────────────────────────────────────────────────
   미니룸 페이지 — 신의반 '모둠별 신전'(ShrinePage)을 대체.
   탭: 내 방 / 꾸미기 / 방명록 / 모둠 신전 (+ 교사: 모둠 관리)
   ────────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { useRoster, useStudentStateMap, useMiniGroups, setMiniGroups } from '../state'
import type { Gift, MiniGroup, MiniRoom, MiniRoomItem, MiniWallItem, Student, StudentState } from '../types'
import Sprite from '../components/Sprite'
import { RoomView, normalizeRoom, EMPTY_ROOM, newId } from './room'
import { RoomEditor } from './RoomEditor'
import { SPRITES } from './sprites'
import { SketchBoard } from './SketchBoard'
import { Modal } from './Modal'
import { FrameViewer } from './FrameViewer'
import { MC, MiniBtn, FriendPicker, GiftInbox } from './parts'
import { useGifts, sendGift, removeGift } from './collections'
import { BookshelfModal } from '../library/BookshelfModal'

type Tab = 'home' | 'deco' | 'shrine' | 'manage'

export default function MiniRoomPage() {
  const [auth] = useAuth()
  const roster = useRoster()
  const { get, update } = useStudentStateMap()
  const groups = useMiniGroups()
  const gifts = useGifts()

  const isTeacher = auth?.role === 'teacher'
  const mySid = auth?.role === 'student' ? auth.studentId : undefined
  const myName = isTeacher ? (auth?.teacherName || '선생님') : roster.find(s => s.id === mySid)?.heroName || '나'

  const nameOf = (sid: string) => roster.find(s => s.id === sid)?.heroName || sid
  const seedOf = (sid: string) => roster.find(s => s.id === sid)?.avatarSeed || sid
  const avatarOf = (sid: string) => get(sid)?.customAvatar
  const roomOf = (sid: string): MiniRoom => normalizeRoom(get(sid)?.miniRoom)
  const stateOf = (sid: string): StudentState => get(sid)

  const [tab, setTab] = useState<Tab>(isTeacher ? 'shrine' : 'home')
  const [viewer, setViewer] = useState<MiniRoomItem | MiniWallItem | null>(null)
  const [shelfSid, setShelfSid] = useState<string | null>(null)

  // 서재(bookshelf) 가구를 클릭하면 그 방 주인의 독서 포트폴리오를 연다
  const clickItem = (it: MiniRoomItem | MiniWallItem, ownerSid?: string) => {
    if (it.key === 'bookshelf' && ownerSid) setShelfSid(ownerSid)
    else setViewer(it)
  }

  const myReceivedGifts = useMemo(() => gifts.filter(g => g.toSid === mySid), [gifts, mySid])

  const saveRoom = (next: MiniRoom) => { if (mySid) update(mySid, s => ({ ...s, miniRoom: next })) }

  const hangGift = (g: Gift) => {
    if (!mySid) return
    const wi: MiniWallItem = { id: newId(), key: g.frameKey && SPRITES[g.frameKey] ? g.frameKey : 'frame_land', wall: 'L', col: 2, row: 1, scale: 1, flip: false, sketch: g.sketch, sketchText: g.sketchText, giftFrom: g.fromName, giftFromSid: g.fromSid }
    update(mySid, s => ({ ...s, miniRoom: { ...normalizeRoom(s.miniRoom), wallItems: [...normalizeRoom(s.miniRoom).wallItems, wi] } }))
    removeGift(g.id)
    alert('🎁 선물 액자를 방에 걸었어요!')
  }

  const TABS: [Tab, string][] = isTeacher
    ? [['shrine', '🏛 모둠 신전'], ['manage', '🛠 모둠 관리']]
    : [['home', '🏠 내 방'], ['deco', '🎨 꾸미기'], ['shrine', '🏛 모둠 신전']]

  return (
    <section className="sin-screen" style={{ fontFamily: "'Galmuri11','DungGeunMo',sans-serif" }}>
      <div>
        <h1 className="page-title">모둠별 신전 <span style={{ fontSize: 24 }}>🏛</span></h1>
        <p className="page-subtitle">내 미니룸을 꾸미고, 모둠 친구들의 방을 구경해요!</p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0' }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ background: tab === k ? MC.pink : '#fff', color: tab === k ? '#fff' : MC.ink, border: `2px solid ${MC.ink}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {tab === 'home' && mySid && (
        <HomeTab room={roomOf(mySid)} sid={mySid} name={myName} seed={seedOf(mySid)} customAvatar={avatarOf(mySid)}
          gifts={myReceivedGifts} onHangGift={hangGift} onDiscardGift={g => removeGift(g.id)}
          onClickItem={it => clickItem(it, mySid)} onStatus={(status) => saveRoom({ ...roomOf(mySid), status })} onEdit={() => setTab('deco')}
          onOpenShelf={() => setShelfSid(mySid)} />
      )}

      {tab === 'deco' && mySid && (
        <DecoTab key={mySid} sid={mySid} name={myName} seed={seedOf(mySid)} customAvatar={avatarOf(mySid)}
          initialRoom={roomOf(mySid)} onSaveRoom={saveRoom} students={roster} stateOf={stateOf} />
      )}

      {tab === 'shrine' && (
        <ShrineTab groups={groups} mySid={mySid} roster={roster} roomOf={roomOf} seedOf={seedOf} avatarOf={avatarOf} nameOf={nameOf}
          onClickItem={clickItem} onGoHome={() => setTab(mySid ? 'home' : 'shrine')} isTeacher={isTeacher} />
      )}

      {tab === 'manage' && isTeacher && (
        <ManageGroupsPanel groups={groups} roster={roster} seedOf={seedOf} avatarOf={avatarOf} />
      )}
      </div>

      <FrameViewer item={viewer} onClose={() => setViewer(null)} />
      {shelfSid && (
        <BookshelfModal open onClose={() => setShelfSid(null)} sid={shelfSid}
          name={nameOf(shelfSid)} own={shelfSid === mySid} />
      )}
    </section>
  )
}

/* ──────────────── 내 방 ──────────────── */
function HomeTab({ room, name, seed, customAvatar, gifts, onHangGift, onDiscardGift, onClickItem, onStatus, onEdit, onOpenShelf }: {
  room: MiniRoom; sid: string; name: string; seed: string; customAvatar?: string; gifts: Gift[]
  onHangGift: (g: Gift) => void; onDiscardGift: (g: Gift) => void; onClickItem: (it: MiniRoomItem | MiniWallItem) => void
  onStatus: (s: string) => void; onEdit: () => void; onOpenShelf: () => void
}) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ fontWeight: 800, color: MC.deep }}>🏠 {name} 님의 방</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <MiniBtn small onClick={onOpenShelf}>📚 내 서재</MiniBtn>
          <MiniBtn kind="primary" small onClick={onEdit}>🎨 꾸미기</MiniBtn>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 240, background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 12, overflow: 'hidden' }}>
        <RoomView room={room} seed={seed} customAvatar={customAvatar} owner={name} onClickItem={onClickItem} fill maxScale={3} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontWeight: 700 }}>오늘 한마디</span>
        <input defaultValue={room.status || ''} maxLength={40} placeholder="기분/상태 메시지"
          onBlur={e => onStatus(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{ flex: 1, minWidth: 180, padding: 8, border: `2px solid ${MC.ink}`, borderRadius: 8, fontFamily: 'inherit' }} />
      </div>
      <GiftInbox gifts={gifts} onHang={onHangGift} onDiscard={onDiscardGift} />
    </div>
  )
}

/* ──────────────── 꾸미기 (편집 + 저장 + 액자그리기 + 선물) ──────────────── */
function DecoTab({ sid, name, seed, customAvatar, initialRoom, onSaveRoom, students, stateOf }: {
  sid: string; name: string; seed: string; customAvatar?: string; initialRoom: MiniRoom
  onSaveRoom: (r: MiniRoom) => void
  students: Student[]; stateOf: (sid: string) => StudentState
}) {
  const [draft, setDraft] = useState<MiniRoom>(initialRoom)
  const [dirty, setDirty] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [paintTarget, setPaintTarget] = useState<MiniRoomItem | MiniWallItem | null>(null)
  const [giftTarget, setGiftTarget] = useState<MiniRoomItem | MiniWallItem | null>(null)

  const change = (next: MiniRoom) => { setDraft(next); setDirty(true); setSavedFlash(false) }
  const save = () => { onSaveRoom(draft); setDirty(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000) }

  const applySketch = (dataUrl: string, title: string) => {
    if (!paintTarget) return
    const id = paintTarget.id
    change({
      ...draft,
      items: draft.items.map(i => (i.id === id ? { ...i, sketch: dataUrl, sketchText: title } : i)),
      wallItems: draft.wallItems.map(w => (w.id === id ? { ...w, sketch: dataUrl, sketchText: title } : w)),
    })
    setPaintTarget(null)
  }
  const doGift = (toSid: string) => {
    if (!giftTarget || !giftTarget.sketch) return
    sendGift({ toSid, fromSid: sid, fromName: name, frameKey: giftTarget.key, sketch: giftTarget.sketch, sketchText: giftTarget.sketchText, message: '' })
    setGiftTarget(null)
    alert(`🎁 ${students.find(s => s.id === toSid)?.heroName ?? '친구'} 님에게 그림 액자를 선물했어요!`)
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* 상단 저장 바 (스크롤해도 따라오도록 sticky) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 10 }}>
        <div style={{ fontWeight: 800, color: MC.deep }}>🎨 내 방 꾸미기</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: dirty ? '#c2410c' : savedFlash ? '#3a9d5b' : '#a06' }}>
            {dirty ? '● 저장 안 한 변경사항' : savedFlash ? '✓ 저장됐어요!' : '저장됨'}
          </span>
          <MiniBtn kind="primary" onClick={save} disabled={!dirty}>💾 저장하기</MiniBtn>
        </div>
      </div>
      <RoomEditor room={draft} onChange={change} seed={seed} customAvatar={customAvatar} owner={name}
        onPaintFrame={(it) => setPaintTarget(it)} onGiftFrame={(it) => setGiftTarget(it)} />

      <Modal open={!!paintTarget} onClose={() => setPaintTarget(null)} title="🎨 액자에 그림 그리기">
        <SketchBoard initialImage={paintTarget?.sketch} initialTitle={paintTarget?.sketchText || ''} submitLabel="액자에 넣기"
          onSubmit={applySketch} onCancel={() => setPaintTarget(null)} />
      </Modal>

      <FriendPicker open={!!giftTarget} onClose={() => setGiftTarget(null)} students={students} stateOf={stateOf} excludeSid={sid} onPick={doGift} />
    </div>
  )
}

/* ──────────────── 모둠 신전 (2×2 + 화살표 + 네비게이션) ──────────────── */
function ShrineTab({ groups, mySid, roster, roomOf, seedOf, avatarOf, nameOf, onClickItem, onGoHome, isTeacher }: {
  groups: MiniGroup[]; mySid?: string; roster: Student[]
  roomOf: (sid: string) => MiniRoom; seedOf: (sid: string) => string; avatarOf: (sid: string) => string | undefined; nameOf: (sid: string) => string
  onClickItem: (it: MiniRoomItem | MiniWallItem, ownerSid?: string) => void; onGoHome: () => void
  isTeacher: boolean
}) {
  const myGroup = groups.find(g => mySid && g.memberSids.includes(mySid))
  const [groupId, setGroupId] = useState<string | null>(myGroup?.id ?? groups[0]?.id ?? null)
  const [focus, setFocus] = useState<number | null>(null) // null = 2×2 개요
  const group = groups.find(g => g.id === groupId) ?? null
  const members = (group?.memberSids ?? []).filter(sid => roster.some(s => s.id === sid))

  if (!groups.length) {
    return <div className="card card--empty" style={{ padding: 24, textAlign: 'center', color: '#a06' }}>아직 모둠이 없어요. {isTeacher ? "'모둠 관리'에서 모둠을 만들어 주세요." : '선생님이 모둠을 만들면 여기서 친구들 방을 구경할 수 있어요.'}</div>
  }

  const goMyGroup = () => { if (myGroup) { setGroupId(myGroup.id); setFocus(null) } }

  const cell = (sid: string, i: number) => (
    <div key={sid} style={{ position: 'relative', background: '#fff', cursor: 'pointer' }} onClick={() => setFocus(i)}>
      <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 50, background: 'rgba(255,255,255,.85)', border: `1px solid ${MC.line}`, borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: MC.deep, display: 'flex', gap: 4, alignItems: 'center' }}>
        <Sprite seed={seedOf(sid)} size={20} customSrc={avatarOf(sid)} shadow={false} /> {nameOf(sid)}
      </div>
      <RoomView room={roomOf(sid)} seed={seedOf(sid)} customAvatar={avatarOf(sid)} owner={nameOf(sid)} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 60 }} />{/* 클릭 가로채기(개요에선 입장) */}
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* 네비게이션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {mySid && <MiniBtn small onClick={onGoHome}>🏠 내 방 가기</MiniBtn>}
        {myGroup && <MiniBtn small kind={group?.id === myGroup.id ? 'primary' : 'default'} onClick={goMyGroup}>👥 내 모둠 가기</MiniBtn>}
        <span style={{ fontSize: 12, color: '#a06', marginLeft: 4 }}>다른 모둠 보기:</span>
        {groups.map(g => (
          <button key={g.id} onClick={() => { setGroupId(g.id); setFocus(null) }}
            style={{ background: g.id === groupId ? MC.pink : '#fff', color: g.id === groupId ? '#fff' : MC.ink, border: `2px solid ${MC.ink}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}>
            {g.name}
          </button>
        ))}
      </div>

      <div style={{ fontWeight: 800, color: MC.deep, marginBottom: 8 }}>🏛 {group?.name} 신전</div>

      {!group || members.length === 0 ? (
        <div className="card card--empty" style={{ padding: 20, color: '#a06' }}>이 모둠에 배정된 친구가 없어요.</div>
      ) : focus === null ? (
        /* 개요 — 모든 방을 동일 크기 2열 그리드로(5명↑은 아래로 스크롤) */
        <div style={{ display: 'grid', gridTemplateColumns: members.length === 1 ? '1fr' : '1fr 1fr', gap: 4, background: MC.ink, padding: 4, borderRadius: 12 }}>
          {members.map((sid, i) => cell(sid, i))}
        </div>
      ) : (
        /* 포커스 — 한 친구 방 크게 + 화살표 */
        (() => {
          const sid = members[focus]
          const prev = () => setFocus((focus - 1 + members.length) % members.length)
          const next = () => setFocus((focus + 1) % members.length)
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MiniBtn small onClick={() => setFocus(null)}>▦ 모둠 전체</MiniBtn>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: MC.deep }}>
                  <Sprite seed={seedOf(sid)} size={22} customSrc={avatarOf(sid)} shadow={false} /> {nameOf(sid)} 님의 방 <span style={{ color: '#a06', fontSize: 12 }}>({focus + 1}/{members.length})</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={prev} aria-label="이전 친구" style={arrowStyle}>‹</button>
                <div style={{ flex: 1, minWidth: 0, height: '68vh', background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 12, overflow: 'hidden' }}>
                  <RoomView room={roomOf(sid)} seed={seedOf(sid)} customAvatar={avatarOf(sid)} owner={nameOf(sid)} onClickItem={it => onClickItem(it, sid)} fill maxScale={3} />
                </div>
                <button onClick={next} aria-label="다음 친구" style={arrowStyle}>›</button>
              </div>
              <p style={{ fontSize: 12, color: '#a06', marginTop: 10, textAlign: 'center' }}>액자를 클릭하면 친구가 그린 그림을 볼 수 있어요.</p>
            </div>
          )
        })()
      )}
    </div>
  )
}
const arrowStyle: React.CSSProperties = { flexShrink: 0, width: 44, height: 64, borderRadius: 12, border: `2px solid ${MC.ink}`, background: MC.pinkSoft, color: MC.ink, fontSize: 28, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }

/* ──────────────── 교사: 모둠 관리 ──────────────── */
function ManageGroupsPanel({ groups, roster, seedOf, avatarOf }: { groups: MiniGroup[]; roster: Student[]; seedOf: (sid: string) => string; avatarOf: (sid: string) => string | undefined }) {
  const [newName, setNewName] = useState('')
  const assigned = new Set(groups.flatMap(g => g.memberSids))

  const addGroup = () => {
    const name = newName.trim() || `모둠 ${groups.length + 1}`
    setMiniGroups([...groups, { id: newId(), name, memberSids: [] }])
    setNewName('')
  }
  const rename = (id: string, name: string) => setMiniGroups(groups.map(g => (g.id === id ? { ...g, name } : g)))
  const del = (id: string) => { if (confirm('이 모둠을 삭제할까요? (학생 데이터는 지워지지 않아요)')) setMiniGroups(groups.filter(g => g.id !== id)) }
  const toggle = (id: string, sid: string) => setMiniGroups(groups.map(g => {
    if (g.id !== id) return { ...g, memberSids: g.memberSids.filter(s => s !== sid) } // 한 학생은 한 모둠만
    const has = g.memberSids.includes(sid)
    return { ...g, memberSids: has ? g.memberSids.filter(s => s !== sid) : [...g.memberSids, sid] }
  }))

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 860 }}>
      <div style={{ background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="새 모둠 이름 (예: 별빛 모둠)" onKeyDown={e => { if (e.key === 'Enter') addGroup() }}
          style={{ flex: 1, minWidth: 180, padding: 8, border: `2px solid ${MC.ink}`, borderRadius: 8, fontFamily: 'inherit' }} />
        <MiniBtn kind="primary" small onClick={addGroup}>+ 모둠 만들기</MiniBtn>
      </div>
      {groups.length === 0 && <div style={{ fontSize: 13, color: '#a06' }}>모둠을 만들고 학생을 배정하세요. 2×2로 4명씩 묶으면 보기 좋아요.</div>}
      {groups.map(g => (
        <div key={g.id} style={{ background: '#fff', border: `2px solid ${MC.ink}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input defaultValue={g.name} onBlur={e => rename(g.id, e.target.value.trim() || g.name)}
              style={{ fontWeight: 800, fontSize: 15, padding: 6, border: `2px solid ${MC.line}`, borderRadius: 8, fontFamily: 'inherit', color: MC.deep }} />
            <span style={{ fontSize: 12, color: '#a06' }}>{g.memberSids.length}명</span>
            <span style={{ flex: 1 }} />
            <MiniBtn small kind="ghost" onClick={() => del(g.id)}>모둠 삭제 🗑</MiniBtn>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {roster.map(s => {
              const inThis = g.memberSids.includes(s.id)
              const inOther = !inThis && assigned.has(s.id)
              return (
                <button key={s.id} onClick={() => toggle(g.id, s.id)} disabled={inOther} title={inOther ? '다른 모둠에 배정됨' : ''}
                  style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '4px 8px', borderRadius: 999, cursor: inOther ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, opacity: inOther ? 0.4 : 1, border: `2px solid ${inThis ? MC.pink : MC.line}`, background: inThis ? MC.pinkSoft : '#fff', color: MC.ink }}>
                  <Sprite seed={seedOf(s.id)} size={18} customSrc={avatarOf(s.id)} shadow={false} /> {s.heroName}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
