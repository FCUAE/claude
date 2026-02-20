"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/components/ProductCard";
import { DateNav } from "@/components/DateNav";

interface ProductSnapshot {
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

function getYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function Home() {
  const [date, setDate] = useState(getYesterday());
  const [products, setProducts] = useState<ProductSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/daily?date=${targetDate}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
      if (data.date) setDate(data.date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(date);
  }, [date, fetchData]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  const today = getToday();
  const hasNext = date < today;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            🔥 TrendSnipe — Today&apos;s Top 5 Trending Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Products trending with real PMF signals, scored by vibe-code
            difficulty
          </p>
        </div>
      </header>

      {/* Date Navigation */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <DateNav
          currentDate={date}
          onDateChange={handleDateChange}
          hasNext={hasNext}
        />
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 pb-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 text-sm">Loading products...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">
              No products found for this date
            </p>
            <p className="text-gray-400 text-sm">
              The daily pipeline may not have run yet. Trigger it via{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                POST /api/cron/run-daily
              </code>
            </p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="space-y-4">
            {products.map((product) => (
              <ProductCard key={product.product.id} data={product} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          TrendSnipe — Daily trending product scanner for vibe coders
        </div>
      </footer>
    </div>
  );
}
