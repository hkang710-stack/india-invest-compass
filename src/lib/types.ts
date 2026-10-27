export type IndustryId = "auto" | "electronics" | "chemical" | "textile" | "it" | "finance";
export type CriterionId = "port" | "korean" | "incentive" | "laborCost" | "finance";
/** states.json에 직접 적는 조건 (korean은 거점 데이터에서 계산) */
export type ManualCriterionId = Exclude<CriterionId, "korean">;

export interface Industry {
  id: IndustryId;
  label: string;
  suggested: CriterionId[];
}

export interface Criterion {
  id: CriterionId;
  label: string;
  description: string;
}

export interface StateProfile {
  id: string;
  nameKo: string;
  nameEn: string;
  capital: string;
  region: string;
  type: string;
  summary: string;
  scores: Record<ManualCriterionId, number>;
  industryFit: Record<IndustryId, number>;
  basis: Record<ManualCriterionId, string>;
}

export interface KoreanSite {
  company: string;
  site: string;
  product: string;
  status: string;
  /** 도시·산업단지 단위 근사 좌표 */
  lat: number;
  lng: number;
}

export interface DataMeta {
  version: string;
  updatedAt: string;
  status: string;
  note: string;
}

export interface CompassData {
  meta: DataMeta;
  states: StateProfile[];
  industries: Industry[];
  criteria: Criterion[];
  industryWeight: number;
  koreanStatusWeights: Record<string, number>;
  koreanSites: Record<string, KoreanSite[]>;
  koreanSitesSource: string;
}

export interface ScoreBreakdown {
  id: "industry" | CriterionId;
  label: string;
  score: number;
  basis: string;
}

export interface RankedState {
  state: StateProfile;
  rank: number;
  total: number;
  industryFit: number;
  breakdown: ScoreBreakdown[];
  sites: KoreanSite[];
}

/** 지도·검색에 쓰는 주 요약 정보 */
export interface StateCard {
  id: string;
  nameKo: string;
  nameEn: string;
  capital: string;
  region: string;
  type: string;
  summary: string;
  koreanScore: number;
  siteCount: number;
  topIndustries: string[];
  companies: string[];
  newsCount: number;
}
