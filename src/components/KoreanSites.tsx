"use client";

import { useMemo, useState } from "react";
import type { StateMap } from "@/lib/geo";
import type { KoreanSite } from "@/lib/types";

interface Cluster {
  x: number;
  y: number;
  members: number[];
}

const STATUS_CLASS: Record<string, string> = {
  가동: "run",
  "건설 중": "plan",
  "계획·검토": "plan",
  "본사·R&D": "hq",
  협력: "hq",
  중단: "stop",
};

/** 가까운 점끼리 묶어 원 하나로 (숫자 = 거점 수) */
function clusterPoints(points: [number, number][], radius: number): Cluster[] {
  const out: Cluster[] = [];
  points.forEach(([x, y], i) => {
    const near = out.find((c) => Math.hypot(c.x - x, c.y - y) < radius);
    if (near) {
      near.members.push(i);
      const n = near.members.length;
      near.x += (x - near.x) / n;
      near.y += (y - near.y) / n;
    } else out.push({ x, y, members: [i] });
  });
  return out;
}

export default function KoreanSites({ sites, map }: { sites: KoreanSite[]; map: StateMap }) {
  const [active, setActive] = useState<number[] | null>(null);
  const clusters = useMemo(() => clusterPoints(map.points, map.unit * 5), [map]);
  const u = map.unit;
  const isActive = (i: number) => active?.includes(i) ?? false;

  return (
    <section className="card sites">
      <h2 className="section-title">한국 기업 거점</h2>
      {sites.length === 0 ? (
        <p className="muted">조사된 한국 기업 거점이 없습니다.</p>
      ) : (
        <div className="sites-layout">
          <figure className="site-map">
            <svg viewBox={map.viewBox} role="img" aria-label={`${map.target.nameKo} 한국 기업 거점 지도`}>
              {map.neighbors.map((s) => (
                <path key={s.nameEn} d={s.d} className="sm-other" style={{ strokeWidth: u * 0.25 }} />
              ))}
              <path d={map.target.d} className="sm-target" style={{ strokeWidth: u * 0.4 }} />
              {clusters.map((c) => {
                const on = c.members.some(isActive);
                const r = u * (c.members.length > 1 ? 3.2 + Math.min(c.members.length, 8) * 0.35 : 2.4) * (on ? 1.3 : 1);
                return (
                  <g
                    key={c.members.join("-")}
                    className={`sm-dot ${STATUS_CLASS[sites[c.members[0]].status] ?? "hq"}${on ? " on" : ""}`}
                    onMouseEnter={() => setActive(c.members)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <circle cx={c.x} cy={c.y} r={r} style={{ strokeWidth: u * 0.5 }} />
                    {c.members.length > 1 && (
                      <text x={c.x} y={c.y} style={{ fontSize: u * 3.4 }}>
                        {c.members.length}
                      </text>
                    )}
                    <title>{c.members.map((i) => `${sites[i].company} · ${sites[i].site}`).join("\n")}</title>
                  </g>
                );
              })}
            </svg>
            <figcaption>
              {active ? (
                <ul>
                  {active.map((i) => (
                    <li key={i}>
                      <b>{sites[i].company}</b> {sites[i].site}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <span className="sm-legend run">가동</span>
                  <span className="sm-legend plan">건설·계획</span>
                  <span className="sm-legend hq">본사·R&amp;D·협력</span>
                  <span className="sm-legend stop">중단</span>
                  <small>원 안 숫자는 가까이 모인 거점 수 · 위치는 도시 단위 근사값</small>
                </>
              )}
            </figcaption>
          </figure>

          <div className="table-scroll">
            <table className="detail sites-table">
              <thead>
                <tr>
                  <th>기업</th>
                  <th>거점</th>
                  <th>생산·기능</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s, i) => (
                  <tr
                    key={i}
                    className={isActive(i) ? "on" : undefined}
                    onMouseEnter={() => setActive([i])}
                    onMouseLeave={() => setActive(null)}
                  >
                    <td>
                      <b>{s.company}</b>
                    </td>
                    <td>{s.site}</td>
                    <td>{s.product}</td>
                    <td>
                      <span className="status" data-status={s.status}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
