"use client";

import { ScoreBar } from "./ScoreBar";

interface ProductData {
  rank: number;
  product: {
    id: string;
    name: string;
    tagline: string | null;
    description: string | null;
    url: string | null;
    thumbnailUrl: string | null;
    productHuntUrl: string | null;
    topics: string[];
  };
  scores: {
    pmfScore: number;
    vibecodeScore: number;
    vibecodeBreakdown: {
      summary?: string;
      label?: string;
      emoji?: string;
    };
    crossPlatform: boolean;
    founderFitCategory: string | null;
  };
  stats: {
    phUpvotes: number;
    phComments: number;
    redditUpvotes: number;
    redditComments: number;
    redditSubreddits: string[];
  };
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  "Dev Tools":      { bg: "bg-blue-100",    text: "text-blue-800",    icon: "🛠" },
  "Infrastructure": { bg: "bg-slate-100",   text: "text-slate-800",   icon: "☁️" },
  "AI/ML":          { bg: "bg-violet-100",  text: "text-violet-800",  icon: "🤖" },
  "GTM & Sales":    { bg: "bg-orange-100",  text: "text-orange-800",  icon: "📈" },
  "Productivity":   { bg: "bg-emerald-100", text: "text-emerald-800", icon: "⚡" },
  "No-Code":        { bg: "bg-pink-100",    text: "text-pink-800",    icon: "🧩" },
  "Analytics":      { bg: "bg-cyan-100",    text: "text-cyan-800",    icon: "📊" },
  "Fintech":        { bg: "bg-amber-100",   text: "text-amber-800",   icon: "💰" },
  "HR & Ops":       { bg: "bg-teal-100",    text: "text-teal-800",    icon: "👥" },
  "Design":         { bg: "bg-fuchsia-100", text: "text-fuchsia-800", icon: "🎨" },
};

function getVibecodeColor(score: number): {
  bg: string;
  text: string;
  emoji: string;
  label: string;
} {
  if (score <= 3)
    return {
      bg: "bg-green-100",
      text: "text-green-800",
      emoji: "🟢",
      label: "Easy",
    };
  if (score <= 6)
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      emoji: "🟡",
      label: "Medium",
    };
  return {
    bg: "bg-red-100",
    text: "text-red-800",
    emoji: "🔴",
    label: "Hard",
  };
}

export function ProductCard({ data }: { data: ProductData }) {
  const { rank, product, scores, stats } = data;
  const vc = getVibecodeColor(scores.vibecodeScore);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Rank badge */}
        <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">
          {rank}
        </div>

        {/* Thumbnail */}
        {product.thumbnailUrl && (
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and tagline */}
          <div className="mb-3">
            {product.url ? (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {product.name}
              </a>
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">
                {product.name}
              </h3>
            )}
            {product.tagline && (
              <p className="text-sm text-gray-500 mt-0.5">
                &ldquo;{product.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Founder-Fit Category Badge */}
          {scores.founderFitCategory && CATEGORY_STYLES[scores.founderFitCategory] && (
            <div className="mb-3">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_STYLES[scores.founderFitCategory].bg} ${CATEGORY_STYLES[scores.founderFitCategory].text}`}
              >
                {CATEGORY_STYLES[scores.founderFitCategory].icon}{" "}
                {scores.founderFitCategory}
              </span>
            </div>
          )}

          {/* PMF Score */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              PMF Score
            </div>
            <ScoreBar score={scores.pmfScore} />
          </div>

          {/* Source stats */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm text-gray-600">
            {(stats.phUpvotes > 0 || stats.phComments > 0) && (
              <span>
                📊 PH: {stats.phUpvotes} upvotes · {stats.phComments} comments
              </span>
            )}
            {stats.redditSubreddits.length > 0 && (
              <span>
                💬 Reddit:{" "}
                {stats.redditSubreddits.map((sub, i) => (
                  <span key={sub}>
                    {i > 0 && " "}r/{sub}
                    {stats.redditUpvotes > 0 && i === 0 && (
                      <span className="text-gray-400">
                        {" "}
                        ({stats.redditUpvotes}↑)
                      </span>
                    )}
                  </span>
                ))}
              </span>
            )}
            {scores.crossPlatform && (
              <span className="text-purple-600 font-medium">
                ✨ Multi-signal validated
              </span>
            )}
          </div>

          {/* Vibe-Code Score */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${vc.bg} mb-3`}>
            <span className="text-sm font-semibold ${vc.text}">
              Vibe-Code Score: {scores.vibecodeScore}/10
            </span>
            <span>
              {vc.emoji} {vc.label}
            </span>
          </div>
          {scores.vibecodeBreakdown?.summary && (
            <p className="text-xs text-gray-500 mb-3">
              &ldquo;{scores.vibecodeBreakdown.summary}&rdquo;
            </p>
          )}

          {/* Topics */}
          {product.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {product.topics.slice(0, 5).map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Action links */}
          <div className="flex gap-3">
            {product.productHuntUrl && (
              <a
                href={product.productHuntUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                View on Product Hunt →
              </a>
            )}
            {stats.redditSubreddits.length > 0 && (
              <a
                href={`https://www.reddit.com/search/?q=${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Reddit Threads →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
