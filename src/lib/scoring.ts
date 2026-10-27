import type {
  CompassData,
  CriterionId,
  IndustryId,
  KoreanSite,
  RankedState,
  ScoreBreakdown,
  StateCard,
  StateProfile,
} from "./types";

/** 거점 상태별 가중치를 합산해 가장 많은 주를 100으로 맞춘 점수 */
export function koreanClusterScores(data: CompassData): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const s of data.states) {
    const sites = data.koreanSites[s.id] ?? [];
    raw[s.id] = sites.reduce((sum, site) => sum + (data.koreanStatusWeights[site.status] ?? 0), 0);
  }
  const max = Math.max(...Object.values(raw), 1);
  return Object.fromEntries(Object.entries(raw).map(([id, v]) => [id, Math.round((v / max) * 100)]));
}

function describeSites(sites: KoreanSite[]): string {
  if (sites.length === 0) return "조사된 한국 기업 거점 없음";
  const companies = [...new Set(sites.map((s) => s.company))];
  const shown = companies.slice(0, 3).join(", ");
  return `거점 ${sites.length}곳 — ${shown}${companies.length > 3 ? ` 외 ${companies.length - 3}개사` : ""}`;
}

/**
 * 총점 = 산업 적합도 × industryWeight + 선택한 조건 평균 × (1 − industryWeight)
 * 조건을 하나도 고르지 않으면 산업 적합도만으로 순위를 매깁니다.
 */
export function rankStates(
  data: CompassData,
  industryId: IndustryId,
  selected: CriterionId[],
): RankedState[] {
  const korean = koreanClusterScores(data);
  const industry = data.industries.find((i) => i.id === industryId);
  const w = data.industryWeight;

  const criterionScore = (s: StateProfile, id: CriterionId) =>
    id === "korean" ? korean[s.id] : s.scores[id];

  const rows = data.states.map((state) => {
    const sites = data.koreanSites[state.id] ?? [];
    const industryFit = state.industryFit[industryId];
    const breakdown: ScoreBreakdown[] = [
      { id: "industry", label: `${industry?.label ?? ""} 산업 적합도`, score: industryFit, basis: state.summary },
      ...data.criteria
        .filter((c) => selected.includes(c.id))
        .map((c) => ({
          id: c.id,
          label: c.label,
          score: criterionScore(state, c.id),
          basis: c.id === "korean" ? describeSites(sites) : state.basis[c.id],
        })),
    ];
    const critScores = breakdown.slice(1).map((b) => b.score);
    const total =
      critScores.length === 0
        ? industryFit
        : w * industryFit + (1 - w) * (critScores.reduce((a, b) => a + b, 0) / critScores.length);
    return { state, rank: 0, total: Math.round(total * 10) / 10, industryFit, breakdown, sites };
  });

  rows.sort((a, b) => b.total - a.total || b.industryFit - a.industryFit);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

const ACTIVE_STATUSES = new Set(["가동", "건설 중", "본사·R&D"]);

export function buildStateCards(data: CompassData, newsCounts: Record<string, number> = {}): StateCard[] {
  const korean = koreanClusterScores(data);
  return data.states.map((s) => {
    const sites = data.koreanSites[s.id] ?? [];
    const topIndustries = data.industries
      .map((i) => ({ label: i.label, fit: s.industryFit[i.id] }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 3)
      .map((i) => i.label);
    return {
      id: s.id,
      nameKo: s.nameKo,
      nameEn: s.nameEn,
      capital: s.capital,
      region: s.region,
      type: s.type,
      summary: s.summary,
      koreanScore: korean[s.id],
      siteCount: sites.filter((x) => ACTIVE_STATUSES.has(x.status)).length,
      topIndustries,
      companies: [...new Set(sites.map((x) => x.company))],
      newsCount: newsCounts[s.id] ?? 0,
    };
  });
}
