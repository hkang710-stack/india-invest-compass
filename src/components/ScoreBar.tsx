export default function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="bar">
      <span className="bar-label">{label}</span>
      <span className="bar-track" aria-hidden="true">
        <span className="bar-fill" style={{ width: `${score}%` }} />
      </span>
      <span className="bar-value">{score}</span>
    </div>
  );
}
