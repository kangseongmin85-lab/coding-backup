export type Holding = {
  id: string
  ticker: string        // 종목명 (건물 식별자)
  symbol?: string       // 네이버 reutersCode (예: 005930, TSLA.O) — 시가/시총 조회용
  ownerId: string       // 작성자 식별 (내 종목만 보기/삭제)
  charType?: string     // 선택한 캐릭터 종류
  nickname: string      // 내 캐릭터 닉네임
  avgPrice: number      // 평단가 → 층수로 매핑
  quantity: number      // 보유 수량
  message: string       // 말풍선 대사 (커스텀, 비우면 손익 기반 자동)
  createdAt: number
}

// 종목(건물) 단위로 묶인 뷰 모델
export type Building = {
  ticker: string
  nameEn?: string
  currentPrice: number
  holdings: Holding[]
  floorCount: number
}

export type ChatMessage = {
  id: string
  nickname: string
  ticker: string // 비어 있으면 전체 채팅
  text: string
  createdAt: number
}
