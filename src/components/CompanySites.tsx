"use client";

import { useMemo, useState } from "react";
import type { StateMap } from "@/lib/geo";
import type { KoreanSite, SiteOrigin } from "@/lib/types";

export interface TaggedSite extends KoreanSite {
  origin: SiteOrigin;
}

interface Cluster {
  x: number;
  y: number;
  origin: SiteOrigin;
  members: number[];
}

type Filter = "all" | SiteOrigin;

const STATUS_CLASS: Record<string, string> = {
  가동: "run",
  "건설 중": "plan",
  "계획·검토": "plan",
  "본사·R&D": "hq",
  협력: "hq",
  중단: "stop",
};

const ORIGIN_LABEL: Record<SiteOrigin, string> = { kr: "한국", us: "미국" };

/** 같은 국적끼리 가까운 점을 묶어 표시 하나로 (숫자 = 거점 수) */
function clusterPoints(points: [number, number][], origins: SiteOrigin[], radius: number): Cluster[] {
  const out: Cluster[] = [];
  points.forEach(([x, y], i) => {
    const origin = origins[i];
    const near = out.find((c) => c.origin === origin && Math.hypot(c.x - x, c.y - y) < radius);
    if (near) {
      near.members.push(i);
      const n = near.members.length;
      near.x += (x - near.x) / n;
      near.y += (y - near.y) / n;
    } else out.push({ x, y, origin, members: [i] });
  });
  // 한국 묶음과 겹치는 미국 묶음은 오른쪽으로 비켜 두고, 한국 표시를 위에 그립니다
  for (const c of out) {
    if (c.origin !== "us") continue;
    if (out.some((k) => k.origin === "kr" && Math.hypot(k.x - c.x, k.y - c.y) < radius)) c.x += radius * 1.5;
  }
  return out.sort((a, b) => (a.origin === b.origin ? 0 : a.origin === "us" ? -1 : 1));
}

/** 한국 기업은 원, 미국 기업은 마름모 */
function Marker({ c, r, u }: { c: Cluster; r: number; u: number }) {
  const style = { strokeWidth: u * 0.5 };
  if (c.origin === "kr") return <circle cx={c.x} cy={c.y} r={r} style={style} />;
  const s = r * 1.15;
  return (
    <polygon
      points={`${c.x},${c.y - s} ${c.x + s},${c.y} ${c.x},${c.y + s} ${c.x - s},${c.y}`}
      style={style}
    />
  );
}

export default function CompanySites({ sites, map }: { sites: TaggedSite[]; map: StateMap }) {
  const [active, setActive] = useState<number[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const clusters = useMemo(
    () => clusterPoints(map.points, sites.map((s) => s.origin), map.unit * 5),
    [map, sites],
  );
  const u = map.unit;
  const isActive = (i: number) => active?.includes(i) ?? false;
  const shown = (o: SiteOrigin) => filter === "all" || filter === o;
  const counts = { kr: sites.filter((s) => s.origin === "kr").length, us: sites.filter((s) => s.origin === "us").length };

  return (
    <section className="card sites">
      <div className="sites-head">
        <h2 className="section-title">한국·미국 기업 거점</h2>
        <div className="seg" role="tablist" aria-label="거점 국적 선택">
          {(
            [
              ["all", `전체 ${sites.length}`],
              ["kr", `한국 ${counts.kr}`],
              ["us", `미국 ${counts.us}`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? "on" : undefined}
              onClick={() => {
                setFilter(f);
                setActive(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {sites.length === 0 ? (
        <p className="muted">조사된 한국·미국 기업 거점이 없습니다.</p>
      ) : (
        <div className="sites-layout">
          <figure className="site-map">
            <svg viewBox={map.viewBox} role="img" aria-label={`${map.target.nameKo} 한국·미국 기업 거점 지도`}>
              {map.neighbors.map((s) => (
                <path key={s.nameEn} d={s.d} className="sm-other" style={{ strokeWidth: u * 0.25 }} />
              ))}
              <path d={map.target.d} className="sm-target" style={{ strokeWidth: u * 0.4 }} />
              {clusters
                .filter((c) => shown(c.origin))
                .map((c) => {
                  const on = c.members.some(isActive);
                  const r =
                    u * (c.members.length > 1 ? 3.2 + Math.min(c.members.length, 8) * 0.35 : 2.4) * (on ? 1.3 : 1);
                  return (
                    <g
                      key={`${c.origin}-${c.members.join("-")}`}
                      className={`sm-dot ${STATUS_CLASS[sites[c.members[0]].status] ?? "hq"} ${c.origin}${on ? " on" : ""}`}
                      onMouseEnter={() => setActive(c.members)}
                      onMouseLeave={() => setActive(null)}
                    >
                      <Marker c={c} r={r} u={u} />
                      {c.members.length > 1 && (
                        <text x={c.x} y={c.y} style={{ fontSize: u * 3.4 }}>
                          {c.members.length}
                        </text>
                      )}
                      <title>
                        {c.members
                          .map((i) => `[${ORIGIN_LABEL[sites[i].origin]}] ${sites[i].company} · ${sites[i].site}`)
                          .join("\n")}
                      </title>
                    </g>
                  );
                })}
            </svg>
            <figcaption>
              {active ? (
                <ul>
                  {active.map((i) => (
                    <li key={i}>
                      <span className={`origin ${sites[i].origin}`}>{ORIGIN_LABEL[sites[i].origin]}</span>{" "}
                      <b>{sites[i].company}</b> {sites[i].site}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <span className="sm-shape kr">한국 기업</span>
                  <span className="sm-shape us">미국 기업</span>
                  <span className="sm-legend run">가동</span>
                  <span className="sm-legend plan">건설·계획</span>
                  <span className="sm-legend hq">본사·R&amp;D·협력</span>
                  <span className="sm-legend stop">중단</span>
                  <small>모양은 국적, 색은 상태 · 숫자는 가까이 모인 거점 수 · 위치는 도시 단위 근사값</small>
                </>
              )}
            </figcaption>
          </figure>

          <div className="table-scroll">
            <table className="detail sites-table">
              <thead>
                <tr>
                  <th>국적</th>
                  <th>기업</th>
                  <th>거점</th>
                  <th>생산·기능</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s, i) =>
                  shown(s.origin) ? (
                    <tr
                      key={i}
                      className={isActive(i) ? "on" : undefined}
                      onMouseEnter={() => setActive([i])}
                      onMouseLeave={() => setActive(null)}
                    >
                      <td>
                        <span className={`origin ${s.origin}`}>{ORIGIN_LABEL[s.origin]}</span>
                      </td>
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
                  ) : null,
                )}
              </tbody>
            </table>
            {filter !== "all" && counts[filter] === 0 && (
              <p className="muted">조사된 {ORIGIN_LABEL[filter]} 기업 거점이 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
