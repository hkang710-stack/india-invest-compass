"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import IssueBoard from "@/components/IssueBoard";
import IssueSquare from "@/components/IssueSquare";
import type { MapData } from "@/lib/geo";
import type { Issue, IssueStore } from "@/lib/issues";
import type { MapPin, SiteOrigin, StateCard } from "@/lib/types";

interface Tip {
  nameEn: string;
  x: number;
  y: number;
  flip: boolean;
}

interface Hit {
  state: StateCard;
  label: string;
  sub: string;
}

interface PinCluster {
  x: number;
  y: number;
  origin: SiteOrigin;
  pins: MapPin[];
}

interface PinTip {
  cluster: PinCluster;
  x: number;
  y: number;
  flip: boolean;
}

const PIN_STATUS: Record<string, string> = {
  가동: "run",
  "건설 중": "plan",
  "계획·검토": "plan",
  "본사·R&D": "hq",
  협력: "hq",
  중단: "stop",
};
const ORIGIN_KO: Record<SiteOrigin, string> = { kr: "한국", us: "미국" };

/** 전국 지도에서 가까운 같은 국적 거점끼리 묶기 */
function clusterPins(pins: MapPin[], radius: number): PinCluster[] {
  const out: PinCluster[] = [];
  for (const p of pins) {
    const near = out.find((c) => c.origin === p.origin && Math.hypot(c.x - p.x, c.y - p.y) < radius);
    if (near) {
      near.pins.push(p);
      const n = near.pins.length;
      near.x += (p.x - near.x) / n;
      near.y += (p.y - near.y) / n;
    } else out.push({ x: p.x, y: p.y, origin: p.origin, pins: [p] });
  }
  // 한국 묶음과 겹치는 미국 묶음은 비켜 두고, 한국 표시를 위에 그립니다
  for (const c of out) {
    if (c.origin === "us" && out.some((k) => k.origin === "kr" && Math.hypot(k.x - c.x, k.y - c.y) < radius))
      c.x += radius * 1.1;
  }
  return out.sort((a, b) => (a.origin === b.origin ? 0 : a.origin === "us" ? -1 : 1));
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·\-()]/g, "");

export default function MapExplorer({
  map,
  cards,
  issues,
  pins,
}: {
  map: MapData;
  cards: StateCard[];
  issues: IssueStore;
  pins: MapPin[];
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [showPins, setShowPins] = useState<Record<SiteOrigin, boolean>>({ kr: true, us: false });
  const [pinTip, setPinTip] = useState<PinTip | null>(null);
  const clusters = useMemo(() => clusterPins(pins.filter((p) => showPins[p.origin]), 9), [pins, showPins]);
  const pinCount = (o: SiteOrigin) => pins.filter((p) => p.origin === o).length;
  const pinStates = (o: SiteOrigin) => new Set(pins.filter((p) => p.origin === o).map((p) => p.stateId)).size;

  const byEn = useMemo(() => new Map(cards.map((c) => [c.nameEn, c])), [cards]);
  const go = (id: string) => router.push(`/states/${id}`);

  // 지도 왼쪽에는 서쪽 주의 최신 이슈, 오른쪽에는 동쪽 주의 최신 이슈를 하나씩
  const [leftIssue, rightIssue] = useMemo<[Issue | undefined, Issue | undefined]>(() => {
    const [minX, , w] = map.viewBox.split(/s+/).map(Number);
    const mid = minX + w / 2;
    const xOf = (id: string) => {
      const en = cards.find((c) => c.id === id)?.nameEn;
      return map.shapes.find((s) => s.nameEn === en)?.cx ?? mid;
    };
    const list = issues.issues;
    const left = list.find((i) => xOf(i.states[0]) < mid) ?? list[0];
    const right = list.find((i) => i !== left && xOf(i.states[0]) >= mid) ?? list.find((i) => i !== left);
    return [left, right];
  }, [issues, cards, map]);
  const nameKo = (id: string) => cards.find((c) => c.id === id)?.nameKo ?? id;

  const hits = useMemo<Hit[]>(() => {
    const q = norm(query);
    if (!q) return [];
    const out: Hit[] = [];
    for (const c of cards) {
      if ([c.nameKo, c.nameEn, c.capital, c.region].some((v) => norm(v).includes(q))) {
        out.push({ state: c, label: c.nameKo, sub: `${c.nameEn} · ${c.type}` });
      }
    }
    for (const c of cards) {
      for (const company of c.companies) {
        if (norm(company).includes(q)) out.push({ state: c, label: company, sub: `한국 기업 → ${c.nameKo}` });
      }
      for (const company of c.usCompanies) {
        if (norm(company).includes(q)) out.push({ state: c, label: company, sub: `미국 기업 → ${c.nameKo}` });
      }
    }
    return out.slice(0, 8);
  }, [query, cards]);

  const onMove = (e: React.MouseEvent, nameEn: string) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setTip({ nameEn, x, y: e.clientY - rect.top, flip: x > rect.width * 0.55 });
  };

  const onPin = (e: React.MouseEvent, cluster: PinCluster) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setTip(null);
    setPinTip({ cluster, x, y: e.clientY - rect.top, flip: x > rect.width * 0.55 });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && hits[cursor]) {
      go(hits[cursor].state.id);
    }
  };

  const tipCard = tip ? byEn.get(tip.nameEn) : undefined;
  const tipShape = tip ? map.shapes.find((s) => s.nameEn === tip.nameEn) : undefined;
  const highlighted = focusId ?? (tipCard?.id || null);

  return (
    <>
      <div className="explorer">
        <div
          className="map-wrap"
          ref={wrapRef}
          onMouseLeave={() => {
            setTip(null);
            setPinTip(null);
          }}
        >
          <svg viewBox={map.viewBox} className="map" role="img" aria-label="인도 주 지도">
            {map.shapes.map((s) => {
              const card = byEn.get(s.nameEn);
              const cls = card ? `st target${highlighted === card.id ? " on" : ""}` : "st";
              return (
                <path
                  key={s.nameEn}
                  d={s.d}
                  className={cls}
                  onMouseMove={(e) => onMove(e, s.nameEn)}
                  onClick={card ? () => go(card.id) : undefined}
                >
                  <title>{s.nameKo}</title>
                </path>
              );
            })}
            {map.shapes
              .filter((s) => byEn.has(s.nameEn))
              .map((s) => (
                <text key={s.nameEn} x={s.cx} y={s.cy} className="map-label">
                  {s.nameKo}
                </text>
              ))}
            <g className="pins">
              {clusters.map((c) => {
                const n = c.pins.length;
                const r = n > 1 ? 4.6 + Math.min(n, 12) * 0.45 : 3.4;
                const target = cards.find((k) => k.id === c.pins[0].stateId);
                const s = r * 1.15;
                return (
                  <g
                    key={`${c.origin}-${c.x}-${c.y}`}
                    className={`pin ${PIN_STATUS[c.pins[0].status] ?? "hq"} ${c.origin}`}
                    onMouseMove={(e) => onPin(e, c)}
                    onMouseLeave={() => setPinTip(null)}
                    onClick={target ? () => go(target.id) : undefined}
                  >
                    {c.origin === "kr" ? (
                      <circle cx={c.x} cy={c.y} r={r} />
                    ) : (
                      <polygon points={`${c.x},${c.y - s} ${c.x + s},${c.y} ${c.x},${c.y + s} ${c.x - s},${c.y}`} />
                    )}
                    {n > 1 && (
                      <text x={c.x} y={c.y}>
                        {n}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {pinTip && (
            <div
              className={`tip pin-tip${pinTip.flip ? " flip" : ""}`}
              style={{ left: pinTip.x, top: pinTip.y }}
              role="tooltip"
            >
              <p className="tip-type">
                {ORIGIN_KO[pinTip.cluster.origin]} 기업 거점 {pinTip.cluster.pins.length}곳
              </p>
              <ul>
                {pinTip.cluster.pins.slice(0, 8).map((p, i) => (
                  <li key={i}>
                    <b>{p.company}</b> <span>{p.site}</span>
                    <small>
                      {p.stateKo} · {p.status}
                    </small>
                  </li>
                ))}
                {pinTip.cluster.pins.length > 8 && <li className="tip-muted">외 {pinTip.cluster.pins.length - 8}곳</li>}
              </ul>
            </div>
          )}

          {tip && tipShape && !pinTip && (
            <div
              className={`tip${tip.flip ? " flip" : ""}`}
              style={{ left: tip.x, top: tip.y }}
              role="tooltip"
            >
              {tipCard ? (
                <>
                  <p className="tip-type">{tipCard.type}</p>
                  <p className="tip-name">
                    {tipCard.nameKo} <span>{tipCard.nameEn}</span>
                  </p>
                  <p className="tip-summary">{tipCard.summary}</p>
                  <dl>
                    <dt>주도</dt>
                    <dd>{tipCard.capital}</dd>
                    <dt>강한 산업</dt>
                    <dd>{tipCard.topIndustries.join(" · ")}</dd>
                    <dt>한국 기업</dt>
                    <dd>
                      운영 거점 {tipCard.siteCount}곳 · 클러스터 {tipCard.koreanScore}점
                    </dd>
                    <dt>미국 기업</dt>
                    <dd>
                      운영 거점 {tipCard.usSiteCount}곳 · 클러스터 {tipCard.usScore}점
                    </dd>
                    <dt>최근 뉴스</dt>
                    <dd>{tipCard.newsCount}건 (30일)</dd>
                  </dl>
                  <p className="tip-cta">클릭하면 상세 정보로 이동</p>
                </>
              ) : (
                <>
                  <p className="tip-name">
                    {tipShape.nameKo} <span>{tipShape.nameEn}</span>
                  </p>
                  <p className="tip-muted">비교 대상 8개 주에 포함되지 않습니다</p>
                </>
              )}
            </div>
          )}

          <p className="map-legend">
            <span className="swatch target" /> 비교 대상 8개 주 <span className="swatch" /> 기타 지역
          </p>
          <div className="pin-toggles" role="group" aria-label="지도에 표시할 기업 거점">
            {(["kr", "us"] as SiteOrigin[]).map((o) => (
              <label key={o} className={`pin-toggle ${o}`}>
                <input
                  type="checkbox"
                  checked={showPins[o]}
                  onChange={(e) => setShowPins((v) => ({ ...v, [o]: e.target.checked }))}
                />
                <span>
                  {ORIGIN_KO[o]} 기업 거점 {pinCount(o)}곳 <small>({pinStates(o)}개 주)</small>
                </span>
              </label>
            ))}
            <small className="pin-note">
              ● 한국 · ◆ 미국 · 색은 상태(초록 가동, 주황 건설·계획, 파랑 본사·R&amp;D, 회색 중단) · 숫자는 모인 거점 수
            </small>
          </div>
        </div>

        <aside className="side">
          <label className="search-label" htmlFor="search">
            주·도시·한국·미국 기업 검색
          </label>
          <div className="search">
            <input
              id="search"
              type="search"
              placeholder="예: 타밀나두, 첸나이, 기아, 마이크론"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={onKey}
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls="search-results"
            />
            {query && (
              <ul id="search-results" className="results-list" role="listbox">
                {hits.length === 0 && <li className="empty">검색 결과가 없습니다</li>}
                {hits.map((h, i) => (
                  <li key={`${h.state.id}-${h.label}`} role="option" aria-selected={i === cursor}>
                    <Link
                      href={`/states/${h.state.id}`}
                      className={i === cursor ? "active" : undefined}
                      onMouseEnter={() => {
                        setCursor(i);
                        setFocusId(h.state.id);
                      }}
                      onMouseLeave={() => setFocusId(null)}
                    >
                      <b>{h.label}</b>
                      <span>{h.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="side-title">비교 대상 8개 주</h2>
          <ul className="state-list">
            {cards.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/states/${c.id}`}
                  onMouseEnter={() => setFocusId(c.id)}
                  onMouseLeave={() => setFocusId(null)}
                  onFocus={() => setFocusId(c.id)}
                  onBlur={() => setFocusId(null)}
                >
                  <span>
                    <b>{c.nameKo}</b>
                    <small>{c.type}</small>
                  </span>
                  <span className="count">
                    <i className="origin kr">한</i>
                    {c.siteCount}
                    <i className="origin us">미</i>
                    {c.usSiteCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="side-note">숫자는 운영 중인 한국·미국 기업 거점 수</p>

          <Link href="/recommend" className="cta">
            산업·조건으로 주 추천받기 →
          </Link>
        </aside>

        <div className="issue-rail">
          {leftIssue && <IssueSquare issue={leftIssue} stateName={nameKo(leftIssue.states[0])} onFocus={setFocusId} />}
          {rightIssue && <IssueSquare issue={rightIssue} stateName={nameKo(rightIssue.states[0])} onFocus={setFocusId} />}
        </div>
      </div>

      {issues.issues.length > 0 && <IssueBoard store={issues} cards={cards} onFocus={setFocusId} />}
    </>
  );
}
