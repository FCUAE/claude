import { PHProduct } from "../fetchers/producthunt";
import { RedditPost } from "../fetchers/reddit";
import { UnifiedProduct } from "../scoring/pmf-score";

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return null;
  }
}

function fuzzyNameMatch(a: string, b: string): boolean {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Simple Levenshtein-based similarity for short names
  if (normA.length < 3 || normB.length < 3) return false;
  const maxLen = Math.max(normA.length, normB.length);
  const distance = levenshtein(normA, normB);
  return distance / maxLen < 0.3; // 70% similarity threshold
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function deduplicateProducts(
  phProducts: PHProduct[],
  redditPosts: RedditPost[]
): UnifiedProduct[] {
  const unified: UnifiedProduct[] = [];

  // Start with PH products as the base
  const matchedRedditIds = new Set<string>();

  for (const phProduct of phProducts) {
    const phDomain = extractDomain(phProduct.url);
    const matchingReddit: RedditPost[] = [];

    for (const redditPost of redditPosts) {
      if (matchedRedditIds.has(redditPost.id)) continue;

      // Match by URL domain
      if (phDomain && redditPost.linkUrl) {
        const redditDomain = extractDomain(redditPost.linkUrl);
        if (redditDomain && redditDomain === phDomain) {
          matchingReddit.push(redditPost);
          matchedRedditIds.add(redditPost.id);
          continue;
        }
      }

      // Match by product name in title/body
      const redditText =
        `${redditPost.title} ${redditPost.selftext}`.toLowerCase();
      if (
        fuzzyNameMatch(phProduct.name, redditPost.title) ||
        redditText.includes(phProduct.name.toLowerCase())
      ) {
        matchingReddit.push(redditPost);
        matchedRedditIds.add(redditPost.id);
      }
    }

    unified.push({
      phProduct,
      redditPosts: matchingReddit,
    });
  }

  // Add remaining Reddit posts that didn't match any PH product
  // Group them by URL domain or name similarity
  const unmatchedReddit = redditPosts.filter(
    (p) => !matchedRedditIds.has(p.id)
  );

  const redditGroups: Map<string, RedditPost[]> = new Map();

  for (const post of unmatchedReddit) {
    let groupKey: string | null = null;

    // Try to group by link URL domain
    if (post.linkUrl) {
      const domain = extractDomain(post.linkUrl);
      if (domain) groupKey = domain;
    }

    // Otherwise use a normalized title prefix
    if (!groupKey) {
      groupKey = normalizeForComparison(post.title.split(/[:\-–—|]/, 1)[0]);
    }

    if (!redditGroups.has(groupKey)) {
      redditGroups.set(groupKey, []);
    }
    redditGroups.get(groupKey)!.push(post);
  }

  for (const posts of redditGroups.values()) {
    unified.push({
      phProduct: null,
      redditPosts: posts,
    });
  }

  return unified;
}
