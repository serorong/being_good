import { useMemo } from 'react'
import { useAuth } from '../auth'
import { useAgoraTopics, useRoster } from '../state'
import type { AgoraTopic } from '../types'
import { MeanderBand, OliveBranch, PixelIcon } from '../pixel-art'

export default function AgoraPage() {
  const [auth] = useAuth()
  const [topics] = useAgoraTopics()
  const MOCK_STUDENTS = useRoster()

  const isStudent = auth?.role === 'student'
  const myStudentId = isStudent ? auth.studentId : null
  const myName = myStudentId ? MOCK_STUDENTS.find(s => s.id === myStudentId)?.heroName : null

  const active = useMemo(() => topics.filter(t => t.active), [topics])

  return (
    <div className="space-y-6">
      <section className="card-temple p-6 sm:p-7">
        <MeanderBand height={8} color="#0d2419" bg="#f7f1de" />
        <div className="flex items-center gap-3 mt-4">
          <PixelIcon kind="chat" size={28} />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold gold-text">아고라</h1>
            <p className="text-sm text-moss-deep/80 mt-0.5">
              주제를 골라 들어가면 Padlet 공간이 새 창으로 열려요{myName ? `, ${myName} 용사!` : '.'}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center gap-3 select-none">
        <OliveBranch width={56} />
        <span className="font-display text-xs tracking-[0.4em] text-moss-deep">ΑΓΟΡΑ · 주제</span>
        <OliveBranch flip width={56} />
      </div>

      <TopicList topics={active} />
    </div>
  )
}

function TopicList({ topics }: { topics: AgoraTopic[] }) {
  if (topics.length === 0) {
    return (
      <section className="card-temple p-8 text-center">
        <p className="text-sm text-moss-deep/80">
          아직 열린 주제가 없어요. 선생님이 <b>학급관리</b>에서 주제를 추가하면 이곳에 나타납니다.
        </p>
      </section>
    )
  }

  return (
    <section>
      <ul className="divide-y divide-moss-darkest/10 border-2 border-moss-darkest bg-white rounded-2xl overflow-hidden">
        {topics.map(t => {
          const hasLink = !!t.padletUrl
          const open = () => {
            if (!t.padletUrl) {
              alert('이 주제에는 아직 링크가 연결되어 있지 않아요.')
              return
            }
            window.open(t.padletUrl, '_blank', 'noopener,noreferrer')
          }
          return (
            <li key={t.id}>
              <button
                onClick={open}
                disabled={!hasLink}
                className={`w-full text-left px-5 sm:px-6 py-6 sm:py-7 flex items-center gap-4 transition ${
                  hasLink ? 'hover:bg-moss-mist/40 active:bg-moss-mist/60' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="text-3xl flex-shrink-0" aria-label="주제">📜</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg sm:text-xl font-bold text-moss-darkest truncate">
                      {t.title}
                    </span>
                    {hasLink
                      ? <span className="chip chip-blue">🔗 Padlet 열기</span>
                      : <span className="chip">링크 미연결</span>}
                  </div>
                  {t.description && (
                    <div className="text-sm text-moss-deep/70 mt-1 line-clamp-2">{t.description}</div>
                  )}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {(t.visibility ?? 'public') === 'teacher'
                      ? <span className="chip chip-rose">🔒 선생님께만</span>
                      : <span className="chip chip-blue">🌍 모두에게</span>}
                    <span className="chip">
                      {new Date(t.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="text-2xl text-moss-deep flex-shrink-0">↗</div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
