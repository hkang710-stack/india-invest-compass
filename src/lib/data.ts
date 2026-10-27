import statesJson from "@data/states.json";
import industriesJson from "@data/industries.json";
import criteriaJson from "@data/criteria.json";
import koreanSitesJson from "@data/korean-sites.json";
import type { CompassData, Criterion, Industry, KoreanSite, StateProfile } from "./types";

/** data/*.json을 한곳에서 읽어 화면에 넘깁니다. 나중에 DB로 바꿀 때 이 함수만 교체하면 됩니다. */
export function loadCompassData(): CompassData {
  return {
    meta: statesJson.meta,
    states: statesJson.states as StateProfile[],
    industries: industriesJson.industries as Industry[],
    criteria: criteriaJson.criteria as Criterion[],
    industryWeight: criteriaJson.industryWeight,
    koreanStatusWeights: criteriaJson.koreanStatusWeights as Record<string, number>,
    koreanSites: koreanSitesJson.sites as Record<string, KoreanSite[]>,
    koreanSitesSource: koreanSitesJson.meta.source,
  };
}
