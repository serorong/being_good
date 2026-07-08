import { useEffect, useState } from 'react'
import { EMOTION_FOREST } from '../data'
import { PixelIcon } from '../pixel-art'

type Tab = 'positive' | 'negative'

export default function EmotionPicker({
  values,
  onChange,
  onClose,
  max = 4,
}: {
  values: string[]
  onChange: (next: string[]) => void
  onClose: () => void
  max?: number
}) {
  const [tab, setTab] = useState<Tab>('positive')
  const [local, setLocal] = useState<string[]>(values ?? [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const groups = EMOTION_FOREST[tab]

  const toggle = (w: string) => {
    setLocal(prev => {
      if (prev.includes(w)) return prev.filter(x => x !== w)
      if (prev.length >= max) return prev
      return [...prev, w]
    })
  }

  const confirm = () => {
    onChange(local)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-start sm:place-items-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card-temple w-full max-w-3xl p-5 sm:p-7 relative max-h-[92vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 w-9 h-9 grid place-items-center bg-moss-paper border-2 border-moss-darkest text-moss-darkest hover:bg-moss-mist"
          aria-label="닫기"
        >✕</button>

        <div className="flex items-center gap-2 mb-2">
          <PixelIcon kind="leaf" size={20} />
          <h2 className="font-display text-xl sm:text-2xl font-bold gold-text">감정단어의 숲</h2>
        </div>
        <p className="text-sm text-moss-deep/80 mb-3">
          오늘의 마음에 가까운 단어를 <b>최대 {max}개</b> 골라보세요.
        </p>

        {/* 선택된 감정 + 카운터 */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {local.length === 0 ? (
            <span className="text-sm text-moss-deep/60">아직 고른 단어가 없어요.</span>
          ) : (
            local.map(w => (
              <span key={w} className="chip">
                <PixelIcon kind="star" size={12} /> {w}
                <button onClick={() => toggle(w)} className="ml-1" aria-label={`${w} 제거`}>✕</button>
              </span>
            ))
          )}
          <span className={`chip ml-auto ${local.length >= max ? 'chip-rose' : 'chip-green'}`}>
            {local.length} / {max}
          </span>
        </div>

        {/* 탭 */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setTab('positive')}
            className={tab === 'positive' ? 'btn-honey text-sm' : 'btn-ghost text-sm'}
          >
            🌱 긍정적인 감정
          </button>
          <button
            onClick={() => setTab('negative')}
            className={tab === 'negative' ? 'btn-honey text-sm' : 'btn-ghost text-sm'}
          >
            🍂 부정적인 감정
          </button>
        </div>

        {/* 그룹/단어 */}
        <div className="overflow-y-auto pr-1 -mr-1 space-y-5 flex-1">
          {groups.length === 0 ? (
            <div className="text-sm text-moss-deep/70 py-8 text-center">
              아직 등록된 감정 단어가 없어요. 선생님이 곧 업로드하실 거예요.
            </div>
          ) : groups.map(g => (
            <div key={g.name}>
              <div className="font-display text-sm text-moss-deep mb-2">
                <span className="chip">
                  {tab === 'positive' ? '🌱' : '🍂'} {g.name}
                </span>
                <span className="ml-2 text-xs text-moss-deep/70">{g.words.length}개</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.words.map(w => {
                  const picked = local.includes(w)
                  const full = local.length >= max && !picked
                  return (
                    <button
                      key={w}
                      onClick={() => toggle(w)}
                      disabled={full}
                      className={`px-3 py-1 font-display text-sm border-2 border-moss-darkest transition
                        ${picked
                          ? 'bg-gold-200 text-moss-darkest shadow-pixel-sm'
                          : full
                            ? 'bg-moss-paper/60 text-moss-deep/40 cursor-not-allowed'
                            : 'bg-white text-moss-darkest hover:bg-moss-mist'}`}
                    >
                      {w}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost text-sm">취소</button>
          <button onClick={confirm} className="btn-gold text-sm">
            <PixelIcon kind="check" size={14} /> 확정 ({local.length}/{max})
          </button>
        </div>
      </div>
    </div>
  )
}
