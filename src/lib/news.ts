import newsJson from "@data/news.json";
import newsKoJson from "@data/news-ko.json";

export interface NewsItem {
  url: string;
  title: string;
  domain: string;
  date: string;
  image: string | null;
  states: string[];
  inTitle: boolean;
  /** 한국어 제목 (data/news-ko.json, 아직 번역 안 된 기사는 없음) */
  titleKo?: string;
}

interface NewsStore {
  updatedAt: string | null;
  retentionDays: number;
  items: NewsItem[];
}

/** data/news.json (scripts/collect-news.mjs가 매일 갱신). 나중에 DB로 바꿀 때 이 파일만 교체합니다. */
export function loadNews(): NewsStore {
  const store = newsJson as NewsStore;
  const ko = newsKoJson as Record<string, string>;
  return { ...store, items: store.items.map((i) => (ko[i.title] ? { ...i, titleKo: ko[i.title] } : i)) };
}

export function newsForState(stateId: string): NewsItem[] {
  return loadNews().items.filter((i) => i.states.includes(stateId));
}

export function newsCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const i of loadNews().items) for (const s of i.states) counts[s] = (counts[s] ?? 0) + 1;
  return counts;
}

/** KST 기준 날짜 (예: 10월 25일 (토)) */
export function kstDay(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}
