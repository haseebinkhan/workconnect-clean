type Props = {
  score: number;
};

export default function MatchScoreBadge({ score }: Props) {
  let label = "";
  let styles = "";
  let barWidth = "0%";

  if (score >= 80) {
    label = "Top Recommended";
    styles = "bg-emerald-50 text-emerald-700 border border-emerald-200";
    barWidth = "100%";
  } else if (score >= 60) {
    label = "Strong Match";
    styles = "bg-indigo-50 text-indigo-700 border border-indigo-200";
    barWidth = "75%";
  } else if (score >= 40) {
    label = "Good Match";
    styles = "bg-amber-50 text-amber-700 border border-amber-200";
    barWidth = "55%";
  } else if (score >= 20) {
    label = "Weak Match";
    styles = "bg-orange-50 text-orange-700 border border-orange-200";
    barWidth = "35%";
  } else {
    label = "Low Match";
    styles = "bg-slate-100 text-slate-600 border border-slate-200";
    barWidth = "15%";
  }

  return (
    <div className="w-full max-w-[220px]">
      <div
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
      >
        {label} · {score}
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-300"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
}
