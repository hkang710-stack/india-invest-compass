// KOTRA 해외시장뉴스(공공데이터포털 오픈API)에서 인도 기사를 모아 data/kotra-news.json에 저장합니다.
// 키: .env.local 의 KOTRA_API_KEY (공공데이터포털 "인코딩" 키). 키는 이 스크립트에서만 쓰고 사이트에는 들어가지 않습니다.
// 사용법: npm run kotra          → 최근 기사부터 보관 기간(기본 180일)까지 다시 받아 덮어쓰기
//         npm run kotra -- 365   → 보관 기간을 365일로
// 출처 표기: KOTRA 해외시장뉴스 (공공데이터포털, 출처표시 조건)

import { readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../data/", import.meta.url);
const OUT = new URL("kotra-news.json", ROOT);
const API = "https://apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews/ovseaMrktNews";
const ROWS = 100;
const MAX_PAGES = 10;

const days = Number(process.argv[2] ?? 180);

async function loadKey() {
  if (process.env.KOTRA_API_KEY) return process.env.KOTRA_API_KEY;
  const env = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
  const m = env.match(/^KOTRA_API_KEY=(.+)$/m);
  if (!m) throw new Error(".env.local 에 KOTRA_API_KEY 가 없습니다.");
  return m[1].trim();
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", hellip: "…", middot: "·", nbsp: " ", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", times: "×", rarr: "→" };
const decode = (s = "") =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);?/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s{2,}/g, " ")
    .trim();

const config = JSON.parse(await readFile(new URL("news-config.json", ROOT), "utf8"));
const statesKo = config.statesKo ?? {};
const matchStates = (title) =>
  Object.entries(statesKo)
    .filter(([, words]) => words.some((w) => title.includes(w)))
    .map(([id]) => id);

const key = await loadKey();
const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const items = [];

for (let page = 1; page <= MAX_PAGES; page++) {
  const url = `${API}?serviceKey=${key}&type=json&numOfRows=${ROWS}&pageNo=${page}&search1=${encodeURIComponent("인도")}`;
  const res = await fetch(url);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text).response.body;
  } catch {
    throw new Error(`KOTRA API 오류 (page ${page}): ${text.slice(0, 300)}`);
  }
  const list = [body.itemList?.item].flat().filter(Boolean);
  let older = false;
  for (const i of list) {
    if (i.natn !== "인도") continue;
    if (i.othbcDt < cutoff) {
      older = true;
      continue;
    }
    const title = decode(i.newsTitl);
    items.push({
      id: String(i.bbstxSn),
      title,
      url: i.kotraNewsUrl,
      date: i.othbcDt,
      office: decode(i.ovrofInfo),
      industry: decode(i.indstCl) || null,
      kind: decode(i.infoCl) || null,
      states: matchStates(title),
    });
  }
  console.log(`page ${page}: ${list.length}건 (누적 인도 ${items.length}건)`);
  if (older || list.length < ROWS) break;
}

const seen = new Set();
const unique = items
  .filter((i) => (seen.has(i.id) ? false : seen.add(i.id)))
  .sort((a, b) => b.date.localeCompare(a.date));

await writeFile(
  OUT,
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      retentionDays: days,
      source: "KOTRA 해외시장뉴스 (공공데이터포털)",
      items: unique,
    },
    null,
    2,
  ) + "\n",
);
const tagged = unique.filter((i) => i.states.length).length;
console.log(`저장: ${unique.length}건 (주 이름이 제목에 있는 기사 ${tagged}건) → data/kotra-news.json`);
