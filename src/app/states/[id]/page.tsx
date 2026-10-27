import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import KoreanSites from "@/components/KoreanSites";
import NewsList from "@/components/NewsList";
import ScoreBar from "@/components/ScoreBar";
import { loadCompassData } from "@/lib/data";
import { buildStateMap } from "@/lib/geo";
import { loadNews, newsForState } from "@/lib/news";
import { koreanClusterScores } from "@/lib/scoring";

const STATUS_ORDER = ["가동", "건설 중", "본사·R&D", "협력", "계획·검토", "중단"];

export function generateStaticParams() {
  return loadCompassData().states.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/states/[id]">): Promise<Metadata> {
  const { id } = await params;
  const state = loadCompassData().states.find((s) => s.id === id);
  return { title: state ? `${state.nameKo} · 인도 주별 투자 나침반` : "인도 주별 투자 나침반" };
}

export default async function StatePage({ params }: PageProps<"/states/[id]">) {
  const { id } = await params;
  const data = loadCompassData();
  const index = data.states.findIndex((s) => s.id === id);
  if (index === -1) notFound();

  const state = data.states[index];
  const news = loadNews();
  const korean = koreanClusterScores(data)[state.id];
  const sites = [...(data.koreanSites[state.id] ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  const industries = [...data.industries].sort((a, b) => state.industryFit[b.id] - state.industryFit[a.id]);
  const criterionScore = (cid: string) =>
    cid === "korean" ? korean : state.scores[cid as keyof typeof state.scores];
  const criterionBasis = (cid: string) =>
    cid === "korean" ? `한국 기업 거점 ${sites.length}곳 (위 목록)` : state.basis[cid as keyof typeof state.basis];
  const prev = data.states[(index - 1 + data.states.length) % data.states.length];
  const next = data.states[(index + 1) % data.states.length];

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/">← 지도로 돌아가기</Link>
        <span>
          <Link href={`/states/${prev.id}`}>‹ {prev.nameKo}</Link>
          <Link href={`/states/${next.id}`}>{next.nameKo} ›</Link>
        </span>
      </nav>

      <article className="card top detail-head">
        <p className="eyebrow">{state.type}</p>
        <h1>
          {state.nameKo} <span className="en">{state.nameEn}</span>
        </h1>
        <p className="tags">
          <span className="tag">{state.region}</span>
          <span className="tag">주도 {state.capital}</span>
          <span className="tag">한국 기업 거점 {sites.length}곳</span>
        </p>
        <p className="summary">{state.summary}</p>
      </article>

      <KoreanSites sites={sites} map={buildStateMap(state.nameEn, sites)} />

      <div className="detail-grid">
        <section className="card">
          <h2 className="section-title">조건별 점수</h2>
          <div className="bars">
            {data.criteria.map((c) => (
              <ScoreBar key={c.id} label={c.label} score={criterionScore(c.id)} />
            ))}
          </div>
          <table className="detail">
            <tbody>
              {data.criteria.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.label}</th>
                  <td>{criterionBasis(c.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="section-title">산업 적합도</h2>
          <div className="bars">
            {industries.map((i) => (
              <ScoreBar key={i.id} label={i.label} score={state.industryFit[i.id]} />
            ))}
          </div>
          <Link href="/recommend" className="cta inline">
            산업·조건을 골라 다른 주와 비교하기 →
          </Link>
        </section>
      </div>

      <NewsList items={newsForState(state.id)} retentionDays={news.retentionDays} updatedAt={news.updatedAt} />

      <footer className="foot">
        <p>
          데이터 상태: {data.meta.status} (v{data.meta.version}, {data.meta.updatedAt}) · 한국 기업 거점:{" "}
          {data.koreanSitesSource}
        </p>
      </footer>
    </main>
  );
}
