import Link from "next/link";
import type { IssueStore } from "@/lib/issues";
import { kstDay } from "@/lib/news";
import type { StateCard } from "@/lib/types";

const TONE = { chance: "기회", risk: "주의" } as const;

export default function IssueBoard({
  store,
  cards,
  onFocus,
}: {
  store: IssueStore;
  cards: StateCard[];
  onFocus: (stateId: string | null) => void;
}) {
  const nameOf = new Map(cards.map((c) => [c.id, c.nameKo]));

  return (
    <section className="card issues" aria-labelledby="issues-title">
      <header className="news-head">
        <h2 id="issues-title" className="section-title">
          중요한 이슈
        </h2>
        <p className="muted">
          {store.period} 뉴스 요약
          {store.basedOn && <> · {kstDay(store.basedOn)} 수집분 기준</>} · 이슈에 마우스를 올리면 지도에 표시됩니다
        </p>
      </header>

      <ul className="issue-grid">
        {store.issues.map((iss) => (
          <li
            key={iss.id}
            id={`issue-${iss.id}`}
            className={`issue ${iss.tone}`}
            onMouseEnter={() => onFocus(iss.states[0])}
            onMouseLeave={() => onFocus(null)}
          >
            <p className="issue-meta">
              <span className="issue-tone">{TONE[iss.tone]}</span>
              <span>{iss.category}</span>
              <span>{kstDay(iss.date)}</span>
            </p>
            <h3>{iss.title}</h3>
            <p className="issue-summary">{iss.summary}</p>
            <p className="issue-impact">
              <b>시사점</b> {iss.impact}
            </p>
            <p className="issue-states">
              {iss.states.map((id) => (
                <Link key={id} href={`/states/${id}`} className="tag" onFocus={() => onFocus(id)} onBlur={() => onFocus(null)}>
                  {nameOf.get(id) ?? id}
                </Link>
              ))}
            </p>
            <details className="issue-src">
              <summary>원문 {iss.sources.length}건</summary>
              <ul>
                {iss.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.titleKo ?? s.title}
                    </a>
                    <span className="news-src">{s.domain}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
