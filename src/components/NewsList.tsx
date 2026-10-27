import { kstDay, type NewsItem } from "@/lib/news";

const FIRST = 12;

function Group({ items }: { items: NewsItem[] }) {
  const days: [string, NewsItem[]][] = [];
  for (const item of items) {
    const day = kstDay(item.date);
    const last = days[days.length - 1];
    if (last && last[0] === day) last[1].push(item);
    else days.push([day, [item]]);
  }
  return (
    <>
      {days.map(([day, list]) => (
        <div key={day} className="news-day">
          <h3>{day}</h3>
          <ul>
            {list.map((n) => (
              <li key={n.url}>
                <span className="news-titles">
                  <a href={n.url} target="_blank" rel="noopener noreferrer">
                    {n.titleKo ?? n.title}
                  </a>
                  {n.titleKo && <small className="news-en">{n.title}</small>}
                </span>
                <span className="news-src">{n.domain}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function NewsList({
  items,
  retentionDays,
  updatedAt,
}: {
  items: NewsItem[];
  retentionDays: number;
  updatedAt: string | null;
}) {
  return (
    <section className="card news">
      <header className="news-head">
        <h2 className="section-title">최근 뉴스 정리</h2>
        <p className="muted">
          최근 {retentionDays}일 {items.length}건
          {updatedAt && <> · 마지막 수집 {kstDay(updatedAt)}</>} · 제목은 한국어 번역, 원문은 각 언론사 링크
        </p>
      </header>
      {items.length === 0 ? (
        <p className="muted">아직 수집된 뉴스가 없습니다. 터미널에서 npm run news 를 실행하세요.</p>
      ) : (
        <>
          <Group items={items.slice(0, FIRST)} />
          {items.length > FIRST && (
            <details className="news-more">
              <summary>나머지 {items.length - FIRST}건 더 보기</summary>
              <Group items={items.slice(FIRST)} />
            </details>
          )}
        </>
      )}
    </section>
  );
}
