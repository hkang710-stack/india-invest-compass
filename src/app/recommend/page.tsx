import type { Metadata } from "next";
import Compass from "@/components/Compass";
import { loadCompassData } from "@/lib/data";

export const metadata: Metadata = { title: "주 추천 · 인도 주별 투자 나침반" };

export default function RecommendPage() {
  const data = loadCompassData();

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">산업·조건별 추천</p>
        <h1>어느 주로 진출할까?</h1>
        <p className="lead">
          진출 산업과 중요하게 보는 조건을 고르면 8개 주의 점수를 계산해 가장 잘 맞는 주를 추천합니다.
        </p>
      </header>

      <Compass data={data} />

      <footer className="foot">
        <p>
          <b>데이터 상태: {data.meta.status}</b> (v{data.meta.version}, {data.meta.updatedAt}) — {data.meta.note}
        </p>
        <p>한국 기업 거점: {data.koreanSitesSource}</p>
      </footer>
    </main>
  );
}
