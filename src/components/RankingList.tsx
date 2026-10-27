import Link from "next/link";
import type { RankedState } from "@/lib/types";

export default function RankingList({ ranked }: { ranked: RankedState[] }) {
  return (
    <section className="card">
      <h2 className="section-title">전체 순위</h2>
      <ol className="ranking">
        {ranked.map((r) => (
          <li key={r.state.id}>
            <details>
              <summary>
                <span className="rank">{r.rank}</span>
                <span className="name">
                  {r.state.nameKo}
                  <span className="en">{r.state.nameEn}</span>
                </span>
                <span className="bar-track" aria-hidden="true">
                  <span className="bar-fill" style={{ width: `${r.total}%` }} />
                </span>
                <span className="score">{r.total}</span>
              </summary>
              <table className="detail">
                <tbody>
                  {r.breakdown.map((b) => (
                    <tr key={b.id}>
                      <th scope="row">{b.label}</th>
                      <td className="num">{b.score}</td>
                      <td>{b.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link href={`/states/${r.state.id}`} className="more">
                {r.state.nameKo} 상세 정보 →
              </Link>
            </details>
          </li>
        ))}
      </ol>
      <p className="muted hint">각 주를 누르면 항목별 점수와 근거가 펼쳐집니다.</p>
    </section>
  );
}
