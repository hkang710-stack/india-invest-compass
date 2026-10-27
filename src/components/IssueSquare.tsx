import type { Issue } from "@/lib/issues";
import { kstDay } from "@/lib/news";

const TONE = { chance: "기회", risk: "주의" } as const;

/** 지도 옆 작은 정사각형 이슈 카드. 누르면 아래 '중요한 이슈'의 해당 카드로 이동합니다. */
export default function IssueSquare({
  issue,
  stateName,
  onFocus,
}: {
  issue: Issue;
  stateName: string;
  onFocus: (stateId: string | null) => void;
}) {
  return (
    <a
      href={`#issue-${issue.id}`}
      className={`issue-square ${issue.tone}`}
      onMouseEnter={() => onFocus(issue.states[0])}
      onMouseLeave={() => onFocus(null)}
      onFocus={() => onFocus(issue.states[0])}
      onBlur={() => onFocus(null)}
    >
      <span className="sq-meta">
        <b>{TONE[issue.tone]}</b> · {issue.category}
      </span>
      <span className="sq-title">{issue.title}</span>
      <span className="sq-summary">{issue.summary}</span>
      <span className="sq-impact">
        <b>시사점</b> {issue.impact}
      </span>
      <span className="sq-foot">
        <span className="sq-state">{stateName}</span>
        <span>
          {kstDay(issue.date)} · 원문 {issue.sources.length}건 · 자세히 ↓
        </span>
      </span>
    </a>
  );
}
