import { kstDay } from "@/lib/news";
import type { KotraItem, KotraStore } from "@/lib/kotra";

const day = (d: string) => kstDay(`${d}T03:00:00Z`);

function Items({ items }: { items: KotraItem[] }) {
  return (
    <ul className="kotra-list">
      {items.map((n) => (
        <li key={n.id}>
          <span className="news-titles">
            <a href={n.url} target="_blank" rel="noopener noreferrer">
              {n.title}
            </a>
            <small className="news-en">
              {[n.office, n.kind, n.industry].filter(Boolean).join(" · ")}
            </small>
          </span>
          <span className="news-src">{day(n.date)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * KOTRA 해외시장뉴스 (인도). stateItems를 주면 "이 주 관련"을 먼저 보여 주고,
 * 나머지는 인도 전체 최신 기사로 채웁니다.
 */
export default function KotraNews({
  store,
  stateItems,
  stateName,
  first = 6,
}: {
  store: KotraStore;
  stateItems?: KotraItem[];
  stateName?: string;
  first?: number;
}) {
  const own = new Set((stateItems ?? []).map((i) => i.id));
  const rest = store.items.filter((i) => !own.has(i.id));
  return (
    <section className="card news kotra">
      <header className="news-head">
        <h2 className="section-title">KOTRA 인도 시장뉴스</h2>
        <p className="muted">
          현지 무역관 보고서 최근 {store.retentionDays}일 {store.items.length}건
          {store.updatedAt && <> · 마지막 수집 {kstDay(store.updatedAt)}</>} · 출처: {store.source}
        </p>
      </header>

      {stateItems && (
        <div className="news-day">
          <h3>{stateName} 관련</h3>
          {stateItems.length ? (
            <Items items={stateItems} />
          ) : (
            <p className="muted">최근 기사 중 제목에 이 주(州)나 주요 도시 이름이 나온 기사는 없습니다.</p>
          )}
        </div>
      )}

      <div className="news-day">
        <h3>{stateItems ? "인도 전체 최신" : "최신 기사"}</h3>
        <Items items={rest.slice(0, first)} />
        {rest.length > first && (
          <details className="news-more">
            <summary>나머지 {rest.length - first}건 더 보기</summary>
            <Items items={rest.slice(first)} />
          </details>
        )}
      </div>
    </section>
  );
}
