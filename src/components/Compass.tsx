"use client";

import { useMemo, useState } from "react";
import { rankStates } from "@/lib/scoring";
import type { CompassData, CriterionId, IndustryId } from "@/lib/types";
import RecommendationCard from "./RecommendationCard";
import RankingList from "./RankingList";

export default function Compass({ data }: { data: CompassData }) {
  const [industry, setIndustry] = useState<IndustryId>("auto");
  const [selected, setSelected] = useState<CriterionId[]>(["port", "korean"]);

  const ranked = useMemo(() => rankStates(data, industry, selected), [data, industry, selected]);
  const suggested = data.industries.find((i) => i.id === industry)?.suggested ?? [];
  const pct = Math.round(data.industryWeight * 100);

  const toggle = (id: CriterionId) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));

  return (
    <div className="layout">
      <section className="panel" aria-label="조건 선택">
        <fieldset className="group">
          <legend>
            <span className="step">1</span> 진출 산업
          </legend>
          <div className="chips">
            {data.industries.map((i) => (
              <label key={i.id} className="chip">
                <input
                  type="radio"
                  name="industry"
                  value={i.id}
                  checked={industry === i.id}
                  onChange={() => setIndustry(i.id)}
                />
                <span>{i.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="group">
          <legend>
            <span className="step">2</span> 중요 조건 <small>(여러 개 선택)</small>
          </legend>
          <div className="chips">
            {data.criteria.map((c) => (
              <label key={c.id} className="chip" title={c.description}>
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          <button type="button" className="link" onClick={() => setSelected(suggested)}>
            이 산업에서 흔히 중요한 조건으로 맞추기
          </button>
        </fieldset>

        <p className="formula">
          총점 = 산업 적합도 × {pct}% + 선택 조건 평균 × {100 - pct}%
          {selected.length === 0 && <> · 조건 미선택 시 산업 적합도만 반영</>}
        </p>
      </section>

      <section className="results" aria-live="polite">
        <RecommendationCard top={ranked[0]} />
        <RankingList ranked={ranked} />
      </section>
    </div>
  );
}
