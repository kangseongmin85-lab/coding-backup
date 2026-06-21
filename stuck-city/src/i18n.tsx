import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'ko' | 'en'

type Dict = Record<string, { ko: string; en: string }>

const S: Dict = {
  appName: { ko: '떡상시티', en: 'Stonk City' },
  tagline: { ko: '오늘 우리 종목은 몇 층?', en: "what floor's your stock on?" },
  online: { ko: '공개 도시', en: 'Online' },
  offline: { ko: '오프라인', en: 'Offline' },
  stuck: { ko: '물림', en: 'stuck' },
  moveIn: { ko: '입주하기', en: 'Move in' },
  myStocks: { ko: '내 종목', en: 'My stocks' },
  allCity: { ko: '전체 도시', en: 'All city' },
  nickname: { ko: '닉네임', en: 'Nickname' },
  chat: { ko: '채팅', en: 'Chat' },
  plaza: { ko: '광장', en: 'Plaza' },
  chatSuffix: { ko: ' 채팅', en: ' chat' },
  searchPh: {
    ko: '종목명 입력 (예: 삼성전자, 테슬라, 애플)',
    en: 'Search a stock (e.g. Tesla, Apple, Samsung)',
  },
  formHint: {
    ko: '종목명만 입력하면 시세(금일 시가)·시총이 자동 반영돼요.',
    en: 'Just type the name — price (today\'s open) & market cap auto-fill.',
  },
  avgPh: { ko: '평단가', en: 'Avg price' },
  qtyPh: { ko: '수량', en: 'Qty' },
  msgPh: {
    ko: '말풍선 대사 (비우면 손익 따라 자동 멘트)',
    en: 'Speech bubble (blank = auto by P/L)',
  },
  newMoveIn: { ko: '새 입주', en: 'New move-in' },
  editTitle: { ko: '평단·정보 수정', en: 'Edit holding' },
  save: { ko: '저장', en: 'Save' },
  editTip: { ko: '평단 수정', en: 'Edit' },
  openLabel: { ko: '시가', en: 'Open' },
  openTip: { ko: '금일 시가 기준', en: "Today's open price" },
  delTip: { ko: '이 캐릭터 삭제', en: 'Remove this character' },
  openChatTip: { ko: '이 종목 입주민 채팅 열기', en: 'Open this stock\'s chat' },
  emptyMine: {
    ko: '아직 내가 입주한 종목이 없어요.<br>위 "입주하기"로 내 종목을 세워보세요!',
    en: 'You haven\'t moved in yet.<br>Tap "Move in" to add your stock!',
  },
  emptyAll: {
    ko: '아직 아무도 입주하지 않았어요.<br>"입주하기"로 첫 종목을 세워보세요!',
    en: 'Nobody\'s here yet.<br>Tap "Move in" to start the city!',
  },
  chatEmptyPlaza: {
    ko: '광장에 첫 글을 남겨보세요!',
    en: 'Say hi in the plaza!',
  },
  chatEmptyBuilding: {
    ko: '이 건물 입주민끼리 첫 대화를 시작해보세요!',
    en: 'Start the conversation with fellow holders!',
  },
  phPlaza: { ko: '광장에 한마디…', en: 'Say something in the plaza…' },
  phSetNick: { ko: '먼저 닉네임을 정해주세요', en: 'Set a nickname first' },
  // character labels
  char_ant: { ko: '개미', en: 'Ant' },
  char_heugwu: { ko: '흑우', en: 'Ox' },
  char_bull: { ko: '황소', en: 'Bull' },
  char_bear: { ko: '곰', en: 'Bear' },
  char_diamond: { ko: '다이아손', en: 'Diamond' },
  char_rocket: { ko: '로켓맨', en: 'Rocket' },
  char_paper: { ko: '종이손', en: 'Paper' },
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }
const LangContext = createContext<Ctx>({
  lang: 'ko',
  setLang: () => {},
  t: (k) => k,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('stuck-city:lang') as Lang) || 'ko',
  )
  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('stuck-city:lang', l)
  }
  const t = (k: string) => S[k]?.[lang] ?? k
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}

// 입주민에게 보낼 채팅 placeholder (채널명 포함)
export function buildingPh(lang: Lang, label: string): string {
  return lang === 'ko' ? `${label} 입주민에게…` : `Message ${label} holders…`
}
