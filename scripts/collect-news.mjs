// GDELT(막히면 Google 뉴스 RSS)에서 주별 인도 경제 뉴스를 모아 data/news.json에 쌓습니다. (API 키 필요 없음)
// 사용법: npm run news            → 최근 1일치 추가
//         npm run news -- 30      → 최근 30일치 한 번에 채우기 (처음 1회)
// retentionDays(기본 30일)보다 오래된 뉴스는 실행할 때마다 지워집니다.

import { readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../data/", import.meta.url);
const OUT = new URL("news.json", ROOT);
const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";
const GOOGLE_NEWS = "https://news.google.com/rss/search";
const GAP_MS = 15000; // GDELT 제한은 "5초에 1회"지만 실제로는 더 엄격해 넉넉히 쉼

const config = JSON.parse(await readFile(new URL("news-config.json", ROOT), "utf8"));
const days = Number(process.argv[2] ?? 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const quote = (t) => (t.includes(" ") ? `"${t}"` : t);
const cleanTitle = (t) => t.replace(/\s+([:?,.!'’%])/g, "$1").replace(/\s{2,}/g, " ").trim();
const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
// GDELT seendate: 20261025T123000Z → ISO
const toIso = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:00Z`;

async function fetchGdelt(terms) {
  const query = [
    `(${terms.map(quote).join(" OR ")})`,
    `(${config.economyTerms.join(" OR ")})`,
    "sourcecountry:india",
    "sourcelang:english",
  ].join(" ");
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: "75",
    timespan: `${days}d`,
    sort: "datedesc",
  });

  // GDELT는 요청이 몰리면 429를 주거나 연결을 끊으므로 한 번 쉬었다 다시 시도합니다.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${GDELT}?${params}`, { signal: AbortSignal.timeout(60_000) });
      const text = await res.text();
      if (text.startsWith("{")) {
        return (JSON.parse(text).articles ?? []).map((a) => ({
          url: a.url,
          title: a.title ?? "",
          domain: a.domain,
          date: toIso(a.seendate),
          image: a.socialimage || null,
        }));
      }
      console.warn(`  GDELT 대기 (${attempt}/2): HTTP ${res.status}`);
    } catch (e) {
      console.warn(`  GDELT 연결 실패 (${attempt}/2): ${e.cause?.code ?? e.name}`);
    }
    if (attempt < 2) await sleep(20_000);
  }
  return null;
}

const unescapeXml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
const tag = (xml, name) => {
  const start = xml.indexOf(">", xml.indexOf(`<${name}`)) + 1;
  const end = xml.indexOf(`</${name}>`, start);
  return start > 0 && end > start ? unescapeXml(xml.slice(start, end)) : "";
};

/** GDELT가 막혔을 때 쓰는 예비 소스: Google 뉴스 RSS (키 필요 없음) */
async function fetchGoogleNews(terms) {
  const q = `(${terms.map((t) => `"${t}"`).join(" OR ")}) (${config.economyTerms.join(" OR ")}) when:${days}d`;
  const url = `${GOOGLE_NEWS}?${new URLSearchParams({ q, hl: "en-IN", gl: "IN", ceid: "IN:en" })}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
      const source = tag(item, "source");
      const title = tag(item, "title");
      const suffix = ` - ${source}`;
      return {
        url: tag(item, "link"),
        // 제목 끝의 " - 언론사명" 제거
        title: source && title.endsWith(suffix) ? title.slice(0, -suffix.length) : title,
        domain: source,
        date: new Date(tag(item, "pubDate")).toISOString(),
        image: null,
      };
    });
  } catch (e) {
    console.warn(`  Google 뉴스 실패: ${e.cause?.code ?? e.name}`);
    return [];
  }
}

async function fetchState(terms) {
  const gdelt = await fetchGdelt(terms);
  if (gdelt) return { source: "GDELT", articles: gdelt };
  return { source: "Google 뉴스", articles: await fetchGoogleNews(terms) };
}

function isEconomic(title, terms) {
  const t = title.toLowerCase();
  return terms.some((x) => t.includes(x.toLowerCase())) || config.titleKeywords.some((k) => t.includes(k));
}

let store = { updatedAt: null, retentionDays: config.retentionDays, items: [] };
try {
  store = JSON.parse(await readFile(OUT, "utf8"));
} catch {
  // 첫 실행
}

const byUrl = new Map(store.items.map((i) => [i.url, i]));
const seenTitles = new Set(store.items.map((i) => normTitle(i.title)));
let added = 0;

function save() {
  const cutoff = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;
  const all = [...byUrl.values()].filter((i) => Date.parse(i.date) >= cutoff);
  all.sort((a, b) => b.date.localeCompare(a.date));
  // 주별 최대 개수 제한 (최신순으로 남김)
  const perState = {};
  const items = all.filter((i) => {
    const keep = i.states.some((s) => (perState[s] ?? 0) < config.maxPerState);
    if (keep) for (const s of i.states) perState[s] = (perState[s] ?? 0) + 1;
    return keep;
  });
  byUrl.clear();
  for (const i of items) byUrl.set(i.url, i);
  return writeFile(
    OUT,
    JSON.stringify({ updatedAt: new Date().toISOString(), retentionDays: config.retentionDays, items }, null, 2) + "\n",
    "utf8",
  );
}

// 세 번째 인자로 주를 지정하면 그 주만 수집 (예: npm run news -- 30 gujarat,karnataka)
const only = process.argv[3]?.split(",");
const targets = Object.entries(config.states).filter(([id]) => !only || only.includes(id));

for (const [i, [stateId, terms]] of targets.entries()) {
  if (i > 0) await sleep(GAP_MS);
  const { source, articles } = await fetchState(terms);
  let n = 0;
  for (const a of articles) {
    const title = cleanTitle(a.title ?? "");
    if (!title || !isEconomic(title, terms)) continue;
    if (!a.url || Number.isNaN(Date.parse(a.date))) continue;
    const existing = byUrl.get(a.url);
    if (existing) {
      if (!existing.states.includes(stateId)) existing.states.push(stateId);
      continue;
    }
    const key = normTitle(title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    byUrl.set(a.url, {
      url: a.url,
      title,
      domain: a.domain,
      date: a.date,
      image: a.image,
      states: [stateId],
      inTitle: terms.some((x) => title.toLowerCase().includes(x.toLowerCase())),
    });
    added++;
    n++;
  }
  await save(); // 주마다 바로 저장해 중간에 끊겨도 받은 만큼은 남김
  console.log(`${stateId}: ${source}에서 ${articles.length}건 받음 → ${n}건 추가`);
}

await save();
console.log(`완료: ${added}건 추가, 총 ${byUrl.size}건 저장 → data/news.json`);
