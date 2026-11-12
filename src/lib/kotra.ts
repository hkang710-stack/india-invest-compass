import kotraJson from "@data/kotra-news.json";

export interface KotraItem {
  id: string;
  title: string;
  url: string;
  /** 게시일 YYYY-MM-DD */
  date: string;
  /** 작성 무역관 (예: 첸나이무역관) */
  office: string;
  industry: string | null;
  /** 정보 분류 (예: 투자진출, 트렌드) */
  kind: string | null;
  /** 제목에 주·도시 이름이 나온 비교 대상 주 */
  states: string[];
}

export interface KotraStore {
  updatedAt: string | null;
  retentionDays: number;
  source: string;
  items: KotraItem[];
}

/** data/kotra-news.json (scripts/collect-kotra.mjs가 매일 갱신) */
export function loadKotra(): KotraStore {
  return kotraJson as KotraStore;
}

export function kotraForState(stateId: string): KotraItem[] {
  return loadKotra().items.filter((i) => i.states.includes(stateId));
}
