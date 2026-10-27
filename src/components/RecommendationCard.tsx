import Link from "next/link";
import type { RankedState } from "@/lib/types";
import ScoreBar from "./ScoreBar";

const ACTIVE = new Set(["가동", "건설 중", "본사·R&D"]);

export default function RecommendationCard({ top }: { top: RankedState }) {
  const { state, total, breakdown, sites } = top;
  const strengths = [...breakdown].sort((a, b) => b.score - a.score).slice(0, 2);
  const activeSites = sites.filter((s) => ACTIVE.has(s.status));

  return (
    <article className="card top">
      <header className="top-head">
        <div>
          <p className="eyebrow">추천 1위</p>
          <h2>
            {state.nameKo} <span className="en">{state.nameEn}</span>
          </h2>
          <p className="tags">
            <span className="tag">{state.type}</span>
            <span className="tag">{state.region}</span>
            <span className="tag">주도 {state.capital}</span>
          </p>
        </div>
        <div className="total" aria-label={`총점 ${total}점`}>
          <strong>{total}</strong>
          <span>/ 100</span>
        </div>
      </header>

      <p className="summary">
        {state.summary} <Link href={`/states/${state.id}`}>상세 정보 →</Link>
      </p>

      <div className="bars">
        {breakdown.map((b) => (
          <ScoreBar key={b.id} label={b.label} score={b.score} />
        ))}
      </div>

      <h3>이 주가 앞선 이유</h3>
      <ul className="reasons">
        {strengths.map((b) => (
          <li key={b.id}>
            <b>{b.label}</b> {b.score}점{b.id !== "industry" && <> — {b.basis}</>}
          </li>
        ))}
      </ul>

      <h3>현지 한국 기업 거점 {activeSites.length > 0 && <small>({activeSites.length}곳 운영 중)</small>}</h3>
      {activeSites.length === 0 ? (
        <p className="muted">운영 중인 한국 기업 거점이 아직 없습니다 — 선점 기회이자 리스크입니다.</p>
      ) : (
        <ul className="sites">
          {activeSites.slice(0, 6).map((s, i) => (
            <li key={i}>
              <b>{s.company}</b> {s.site} <span className="muted">· {s.product}</span>
            </li>
          ))}
          {activeSites.length > 6 && <li className="muted">외 {activeSites.length - 6}곳</li>}
        </ul>
      )}
    </article>
  );
}
