import { PHProduct } from "../fetchers/producthunt";
import { RedditPost } from "../fetchers/reddit";

export interface PMFScoreResult {
  total: number;
  upvoteVelocity: number;
  commentEngagement: number;
  sentimentSignal: number;
  crossPlatform: boolean;
  topicRelevance: number;
  recencyBoost: number;
}

const POSITIVE_SENTIMENT_KEYWORDS = [
  "love it",
  "love this",
  "amazing",
  "game changer",
  "switched from",
  "paying for",
  "replaced",
  "can't live without",
  "must have",
  "best tool",
  "highly recommend",
  "so useful",
  "incredible",
  "fantastic",
  "brilliant",
  "solved my",
  "exactly what i needed",
  "shut up and take my money",
  "worth every penny",
  "10/10",
];

const STARTUP_KEYWORDS = [
  "startup",
  "founder",
  "saas",
  "productivity",
  "growth",
  "launch",
  "indie",
  "maker",
  "entrepreneur",
  "bootstrapped",
  "mvp",
  "side project",
  "revenue",
  "mrr",
  "arr",
  "b2b",
  "b2c",
];

function calculateUpvoteVelocity(
  phProduct: PHProduct | null,
  redditPosts: RedditPost[],
  cohortMax: number
): number {
  let totalUpvotes = 0;
  let minAge = Infinity;

  if (phProduct) {
    totalUpvotes += phProduct.votesCount;
    const ageHours =
      (Date.now() - new Date(phProduct.createdAt).getTime()) / (1000 * 60 * 60);
    minAge = Math.min(minAge, Math.max(ageHours, 1));
  }

  for (const post of redditPosts) {
    totalUpvotes += post.score;
    const ageHours =
      (Date.now() - post.createdUtc * 1000) / (1000 * 60 * 60);
    minAge = Math.min(minAge, Math.max(ageHours, 1));
  }

  if (minAge === Infinity) return 0;

  const velocity = totalUpvotes / minAge;
  // Normalize to 0-100 based on cohort max
  return cohortMax > 0 ? Math.min(100, (velocity / cohortMax) * 100) : 0;
}

function calculateCommentEngagement(
  phProduct: PHProduct | null,
  redditPosts: RedditPost[],
  cohortMax: number
): number {
  let totalComments = 0;
  let minAge = Infinity;

  if (phProduct) {
    totalComments += phProduct.commentsCount;
    const ageHours =
      (Date.now() - new Date(phProduct.createdAt).getTime()) / (1000 * 60 * 60);
    minAge = Math.min(minAge, Math.max(ageHours, 1));
  }

  for (const post of redditPosts) {
    totalComments += post.numComments;
    const ageHours =
      (Date.now() - post.createdUtc * 1000) / (1000 * 60 * 60);
    minAge = Math.min(minAge, Math.max(ageHours, 1));
  }

  if (minAge === Infinity) return 0;

  const velocity = totalComments / minAge;
  return cohortMax > 0 ? Math.min(100, (velocity / cohortMax) * 100) : 0;
}

function calculateSentiment(redditPosts: RedditPost[]): number {
  if (redditPosts.length === 0) return 0;

  let matchCount = 0;
  const totalText = redditPosts
    .map((p) => `${p.title} ${p.selftext}`)
    .join(" ")
    .toLowerCase();

  for (const keyword of POSITIVE_SENTIMENT_KEYWORDS) {
    if (totalText.includes(keyword)) matchCount++;
  }

  // Normalize: each keyword match adds points, max out at 100
  return Math.min(100, (matchCount / POSITIVE_SENTIMENT_KEYWORDS.length) * 200);
}

function calculateTopicRelevance(
  phProduct: PHProduct | null,
  redditPosts: RedditPost[]
): number {
  let text = "";

  if (phProduct) {
    text += `${phProduct.name} ${phProduct.tagline} ${phProduct.description} ${phProduct.topics.join(" ")}`;
  }

  for (const post of redditPosts) {
    text += ` ${post.title} ${post.selftext} ${post.subreddit}`;
  }

  text = text.toLowerCase();

  let matchCount = 0;
  for (const keyword of STARTUP_KEYWORDS) {
    if (text.includes(keyword)) matchCount++;
  }

  return Math.min(100, (matchCount / STARTUP_KEYWORDS.length) * 200);
}

function calculateRecencyBoost(
  phProduct: PHProduct | null,
  redditPosts: RedditPost[]
): number {
  let mostRecentAge = Infinity;

  if (phProduct) {
    const ageHours =
      (Date.now() - new Date(phProduct.createdAt).getTime()) / (1000 * 60 * 60);
    mostRecentAge = Math.min(mostRecentAge, ageHours);
  }

  for (const post of redditPosts) {
    const ageHours = (Date.now() - post.createdUtc * 1000) / (1000 * 60 * 60);
    mostRecentAge = Math.min(mostRecentAge, ageHours);
  }

  if (mostRecentAge === Infinity) return 0;

  // Products posted in last 12 hours get full boost, decreasing to 0 at 24 hours
  if (mostRecentAge <= 12) return 100;
  if (mostRecentAge <= 24) return ((24 - mostRecentAge) / 12) * 100;
  return 0;
}

export interface UnifiedProduct {
  phProduct: PHProduct | null;
  redditPosts: RedditPost[];
}

export function calculatePMFScore(
  product: UnifiedProduct,
  cohortMaxUpvoteVelocity: number,
  cohortMaxCommentVelocity: number
): PMFScoreResult {
  const { phProduct, redditPosts } = product;

  const upvoteVelocity = calculateUpvoteVelocity(
    phProduct,
    redditPosts,
    cohortMaxUpvoteVelocity
  );
  const commentEngagement = calculateCommentEngagement(
    phProduct,
    redditPosts,
    cohortMaxCommentVelocity
  );
  const sentimentSignal = calculateSentiment(redditPosts);
  const crossPlatform = phProduct !== null && redditPosts.length > 0;
  const topicRelevance = calculateTopicRelevance(phProduct, redditPosts);
  const recencyBoost = calculateRecencyBoost(phProduct, redditPosts);

  // Weighted sum per PRD:
  // Upvote velocity: 30%, Comment engagement: 20%, Sentiment: 15%,
  // Cross-platform: 15%, Topic relevance: 10%, Recency: 10%
  const total = Math.min(
    100,
    Math.max(
      0,
      upvoteVelocity * 0.3 +
        commentEngagement * 0.2 +
        sentimentSignal * 0.15 +
        (crossPlatform ? 100 : 0) * 0.15 +
        topicRelevance * 0.1 +
        recencyBoost * 0.1
    )
  );

  return {
    total: Math.round(total * 100) / 100,
    upvoteVelocity: Math.round(upvoteVelocity * 100) / 100,
    commentEngagement: Math.round(commentEngagement * 100) / 100,
    sentimentSignal: Math.round(sentimentSignal * 100) / 100,
    crossPlatform,
    topicRelevance: Math.round(topicRelevance * 100) / 100,
    recencyBoost: Math.round(recencyBoost * 100) / 100,
  };
}

export function calculateCohortMaxes(products: UnifiedProduct[]) {
  let maxUpvoteVelocity = 0;
  let maxCommentVelocity = 0;

  for (const product of products) {
    const { phProduct, redditPosts } = product;
    let totalUpvotes = 0;
    let totalComments = 0;
    let minAge = Infinity;

    if (phProduct) {
      totalUpvotes += phProduct.votesCount;
      totalComments += phProduct.commentsCount;
      const ageHours =
        (Date.now() - new Date(phProduct.createdAt).getTime()) /
        (1000 * 60 * 60);
      minAge = Math.min(minAge, Math.max(ageHours, 1));
    }

    for (const post of redditPosts) {
      totalUpvotes += post.score;
      totalComments += post.numComments;
      const ageHours =
        (Date.now() - post.createdUtc * 1000) / (1000 * 60 * 60);
      minAge = Math.min(minAge, Math.max(ageHours, 1));
    }

    if (minAge < Infinity) {
      maxUpvoteVelocity = Math.max(maxUpvoteVelocity, totalUpvotes / minAge);
      maxCommentVelocity = Math.max(
        maxCommentVelocity,
        totalComments / minAge
      );
    }
  }

  return { maxUpvoteVelocity, maxCommentVelocity };
}
