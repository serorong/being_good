/* 카카오 책 검색 API — REST 키는 .env.local의 VITE_KAKAO_REST_KEY */
import type { LibBook } from './types'

interface KakaoBookDoc {
  title: string
  authors: string[]
  publisher: string
  thumbnail: string
  isbn: string
  contents: string
}

export async function searchBooks(query: string): Promise<LibBook[]> {
  const key = import.meta.env.VITE_KAKAO_REST_KEY
  if (!key) {
    console.warn('[library] VITE_KAKAO_REST_KEY가 없어 책 검색을 쓸 수 없어요')
    return []
  }
  const res = await fetch(
    `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`,
    { headers: { Authorization: `KakaoAK ${key}` } },
  )
  if (!res.ok) throw new Error(`책 검색 실패 (${res.status})`)
  const data = (await res.json()) as { documents: KakaoBookDoc[] }
  return data.documents.map(d => ({
    title: d.title,
    authors: d.authors.join(', '),
    publisher: d.publisher,
    thumbnail: d.thumbnail || undefined,
    isbn: d.isbn ? d.isbn.split(' ').pop() : undefined,
  }))
}
