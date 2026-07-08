import { avatarUrl } from '../data'

/**
 * 쯔꾸르(RPG Maker) 스프라이트 느낌으로 표시.
 * - 카드 테두리/배경 없음
 * - 픽셀 렌더링 + 부드러운 그림자
 * - 발 아래 그라운드 그림자
 * - `customSrc`가 있으면 (학생이 그리거나 업로드한 이미지) 그것을 우선 사용
 */
export default function Sprite({
  seed,
  size = 96,
  shadow = true,
  customSrc,
}: {
  seed: string
  size?: number
  shadow?: boolean
  customSrc?: string
}) {
  const src = customSrc && customSrc.length > 0 ? customSrc : avatarUrl(seed)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <img
        src={src}
        alt=""
        draggable={false}
        onError={e => {
          const t = e.currentTarget
          if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = '/assets/logo_mascot.png' }
        }}
        className="block w-full h-full select-none object-contain"
        style={{
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 4px 6px rgba(60,40,10,0.18))',
        }}
      />
      {shadow && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            bottom: 2,
            width: size * 0.55,
            height: size * 0.09,
            background:
              'radial-gradient(closest-side, rgba(60,40,10,0.28), rgba(60,40,10,0))',
            filter: 'blur(1px)',
          }}
        />
      )}
    </div>
  )
}
