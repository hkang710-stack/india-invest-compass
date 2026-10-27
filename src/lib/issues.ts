import issuesJson from "@data/issues.json";
import newsKoJson from "@data/news-ko.json";

export interface IssueSource {
  title: string;
  domain: string;
  url: string;
  date: string;
  titleKo?: string;
}

export interface Issue {
  id: string;
  states: string[];
  /** chance = 기회, risk = 주의 */
  tone: "chance" | "risk";
  category: string;
  title: string;
  summary: string;
  impact: string;
  date: string;
  sources: IssueSource[];
}

export interface IssueStore {
  generatedAt: string;
  basedOn: string | null;
  period: string;
  issues: Issue[];
}

/** data/issues.json (data/news.json을 읽고 한국어로 요약한 주요 이슈). */
export function loadIssues(): IssueStore {
  const store = issuesJson as IssueStore;
  const ko = newsKoJson as Record<string, string>;
  return {
    ...store,
    issues: store.issues.map((iss) => ({
      ...iss,
      sources: iss.sources.map((s) => (ko[s.title] ? { ...s, titleKo: ko[s.title] } : s)),
    })),
  };
}
