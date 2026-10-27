import geoJson from "@data/india-geo.json";
import stateNames from "@data/state-names.json";

export interface MapShape {
  nameEn: string;
  nameKo: string;
  d: string;
  /** 라벨 위치 (가장 큰 폴리곤의 경계상자 중심) */
  cx: number;
  cy: number;
}

export interface MapData {
  viewBox: string;
  shapes: MapShape[];
}

type Ring = [number, number][];
interface Feature {
  properties: { n: string };
  geometry: { type: "MultiPolygon"; coordinates: Ring[][] };
}

// 인도 범위에 맞춘 단순 등장방형 투영 (위도 22° 기준 경도 보정)
const LON0 = 68;
const LAT1 = 37.2;
const LAT0 = 6.6;
const LON1 = 97.5;
const K = Math.cos((22 * Math.PI) / 180);
const S = 20;
const project = ([lon, lat]: [number, number]) => [(lon - LON0) * K * S, (LAT1 - lat) * S];

interface ProjectedShape extends MapShape {
  box: [number, number, number, number];
}

/** data/india-geo.json을 SVG path로 변환합니다 (서버에서 실행). */
function projectShapes(): ProjectedShape[] {
  const features = (geoJson as unknown as { features: Feature[] }).features;
  const names = stateNames as Record<string, string>;

  return features.map((f) => {
    let best = { area: -1, cx: 0, cy: 0 };
    const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    const d = f.geometry.coordinates
      .map((poly) =>
        poly
          .map((ring) => {
            const pts = ring.map(project);
            const xs = pts.map((p) => p[0]);
            const ys = pts.map((p) => p[1]);
            const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
            const area = (x1 - x0) * (y1 - y0);
            if (area > best.area) best = { area, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
            box[0] = Math.min(box[0], x0);
            box[1] = Math.min(box[1], y0);
            box[2] = Math.max(box[2], x1);
            box[3] = Math.max(box[3], y1);
            return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z";
          })
          .join(""),
      )
      .join("");
    const nameEn = f.properties.n;
    return { nameEn, nameKo: names[nameEn] ?? nameEn, d, cx: best.cx, cy: best.cy, box };
  });
}

const stripBox = ({ nameEn, nameKo, d, cx, cy }: ProjectedShape): MapShape => ({ nameEn, nameKo, d, cx, cy });

export function buildMapData(): MapData {
  const w = Math.ceil((LON1 - LON0) * K * S);
  const h = Math.ceil((LAT1 - LAT0) * S);
  return { viewBox: `0 0 ${w} ${h}`, shapes: projectShapes().map(stripBox) };
}

export interface StateMap {
  viewBox: string;
  /** 주 크기의 1/100 (점·글자 크기 기준) */
  unit: number;
  target: MapShape;
  /** 화면에 걸치는 이웃 주 (배경) */
  neighbors: MapShape[];
  points: [number, number][];
}

/** 한 주만 확대한 지도 + 위경도 점들의 지도 좌표 */
export function buildStateMap(nameEn: string, coords: { lat: number; lng: number }[]): StateMap {
  const shapes = projectShapes();
  const target = shapes.find((s) => s.nameEn === nameEn);
  if (!target) throw new Error(`no shape for ${nameEn}`);
  const [x0, y0, x1, y1] = target.box;
  const size = Math.max(x1 - x0, y1 - y0);
  const pad = size * 0.08;
  const vb = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
  const overlaps = (b: ProjectedShape["box"]) =>
    b[2] > vb[0] && b[0] < vb[0] + vb[2] && b[3] > vb[1] && b[1] < vb[1] + vb[3];

  return {
    viewBox: vb.map((v) => v.toFixed(1)).join(" "),
    unit: size / 100,
    target: stripBox(target),
    neighbors: shapes.filter((s) => s !== target && overlaps(s.box)).map(stripBox),
    points: coords.map(({ lat, lng }) => project([lng, lat]) as [number, number]),
  };
}
