"use client";

export function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const percentage = Math.min(100, (score / max) * 100);

  const getColor = () => {
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-blue-500";
    return "bg-gray-400";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
        {Math.round(score)}/{max}
      </span>
      {score >= 75 && <span title="Hot product">🔥</span>}
    </div>
  );
}
