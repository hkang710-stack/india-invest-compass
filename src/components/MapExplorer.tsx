"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import IssueBoard from "@/components/IssueBoard";
import IssueSquare from "@/components/IssueSquare";
import type { MapData } from "@/lib/geo";
import type { Issue, IssueStore } from "@/lib/issues";
import type { StateCard } from "@/lib/types";

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

const norm = (s: string) => s.toLowerCase().replace(/[\s·\-()]/g, "");

export default function MapExplorer({
  map,
  cards,
  issues,
}: {
  map: MapData;
  cards: StateCard[];
  issues: IssueStore;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

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
    }
    return out.slice(0, 8);
  }, [query, cards]);

  const onMove = (e: React.MouseEvent, nameEn: string) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setTip({ nameEn, x, y: e.clientY - rect.top, flip: x > rect.width * 0.55 });
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
        <div className="map-wrap" ref={wrapRef} onMouseLeave={() => setTip(null)}>
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
          </svg>

          {tip && tipShape && (
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
        </div>

        <aside className="side">
          <label className="search-label" htmlFor="search">
            주·도시·한국 기업 검색
          </label>
          <div className="search">
            <input
              id="search"
              type="search"
              placeholder="예: 타밀나두, 첸나이, 기아"
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
                  <span className="count">{c.siteCount}곳</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="side-note">숫자는 운영 중인 한국 기업 거점 수</p>

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
