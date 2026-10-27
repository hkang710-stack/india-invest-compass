import MapExplorer from "@/components/MapExplorer";
import { loadCompassData } from "@/lib/data";
import { buildMapData } from "@/lib/geo";
import { loadIssues } from "@/lib/issues";
import { newsCounts } from "@/lib/news";
import { buildStateCards } from "@/lib/scoring";

export default function Home() {
  const data = loadCompassData();

  return (
    <main className="page home">
      <header className="hero compact">
        <p className="eyebrow">HUFS H-UP · 인도 주별 투자 환경 비교</p>
        <h1>인도 투자 지도</h1>
        <p className="lead">주 위에 마우스를 올리면 요약이, 클릭하거나 오른쪽에서 검색하면 상세 정보가 나옵니다.</p>
      </header>

      <MapExplorer map={buildMapData()} cards={buildStateCards(data, newsCounts())} issues={loadIssues()} />

      <footer className="foot">
        <p>
          <b>데이터 상태: {data.meta.status}</b> (v{data.meta.version}, {data.meta.updatedAt}) · 한국 기업 거점:{" "}
          {data.koreanSitesSource}
        </p>
      </footer>
    </main>
  );
}
