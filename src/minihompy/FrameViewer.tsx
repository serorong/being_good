/* 액자 클릭 시 안의 그림을 크게 보여주는 뷰어 */
import { Modal } from './Modal'
import type { MiniRoomItem, MiniWallItem } from '../types'

export function FrameViewer({ item, onClose }: { item: (MiniRoomItem | MiniWallItem) | null; onClose: () => void }) {
  return (
    <Modal open={!!item} onClose={onClose} title={item?.sketchText || '액자 속 그림'} maxWidth={560}>
      {item && (
        <div style={{ display: 'grid', gap: 12, placeItems: 'center' }}>
          <div style={{ background: '#fff', border: '6px solid #caa86a', borderRadius: 8, padding: 8, boxShadow: '0 6px 18px rgba(0,0,0,.18)' }}>
            {item.sketch
              ? <img src={item.sketch} alt={item.sketchText || ''} style={{ display: 'block', maxWidth: '100%', maxHeight: '60vh', borderRadius: 2 }} />
              : <div style={{ width: 320, height: 200, display: 'grid', placeItems: 'center', color: '#b9a' }}>아직 그림이 없어요</div>}
          </div>
          {item.giftFrom && (
            <div style={{ fontSize: 14, color: '#d6457f', fontWeight: 700 }}>🎁 {item.giftFrom} 님이 선물한 그림이에요</div>
          )}
        </div>
      )}
    </Modal>
  )
}
