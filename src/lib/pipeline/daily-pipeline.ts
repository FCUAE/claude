import { prisma } from "../db";
import { fetchProductHuntPosts } from "../fetchers/producthunt";
import { fetchRedditPosts } from "../fetchers/reddit";
import { deduplicateProducts } from "./deduplicator";
import {
  calculatePMFScore,
  calculateCohortMaxes,
  UnifiedProduct,
} from "../scoring/pmf-score";
import { calculateVibecodeScore } from "../scoring/vibecode-score";

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function getProductName(product: UnifiedProduct): string {
  if (product.phProduct) return product.phProduct.name;
  if (product.redditPosts.length > 0) {
    // Extract product name from Reddit post title
    const title = product.redditPosts[0].title;
    // Try to get the first part before common separators
    const match = title.match(/^([^:\-–—|]+)/);
    return match ? match[1].trim().slice(0, 100) : title.slice(0, 100);
  }
  return "Unknown Product";
}

function getProductTagline(product: UnifiedProduct): string {
  if (product.phProduct) return product.phProduct.tagline;
  if (product.redditPosts.length > 0) return product.redditPosts[0].title;
  return "";
}

function getProductDescription(product: UnifiedProduct): string {
  if (product.phProduct) return product.phProduct.description;
  if (product.redditPosts.length > 0) return product.redditPosts[0].selftext;
  return "";
}

function getProductTopics(product: UnifiedProduct): string[] {
  if (product.phProduct) return product.phProduct.topics;
  return [];
}

export async function runDailyPipeline(dateStr?: string): Promise<{
  date: string;
  productsScanned: number;
  topProducts: number;
}> {
  const targetDate = dateStr || getYesterdayDateStr();
  console.log(`[Pipeline] Starting daily pipeline for ${targetDate}`);

  // Check if we already have data for this date
  const existing = await prisma.dailySnapshot.findFirst({
    where: { snapshotDate: targetDate },
  });
  if (existing) {
    console.log(`[Pipeline] Data already exists for ${targetDate}, skipping`);
    return { date: targetDate, productsScanned: 0, topProducts: 0 };
  }

  // Step 1: Fetch data from both sources
  console.log("[Pipeline] Fetching Product Hunt posts...");
  const phProducts = await fetchProductHuntPosts(targetDate);
  console.log(`[Pipeline] Fetched ${phProducts.length} PH products`);

  console.log("[Pipeline] Fetching Reddit posts...");
  const redditPosts = await fetchRedditPosts(targetDate);
  console.log(`[Pipeline] Fetched ${redditPosts.length} Reddit posts`);

  // Step 2: Deduplicate and merge
  console.log("[Pipeline] Deduplicating products...");
  const unified = deduplicateProducts(phProducts, redditPosts);
  console.log(`[Pipeline] ${unified.length} unified products after dedup`);

  if (unified.length === 0) {
    console.log("[Pipeline] No products found, pipeline complete");
    return { date: targetDate, productsScanned: 0, topProducts: 0 };
  }

  // Step 3: Calculate cohort maxes for normalization
  const { maxUpvoteVelocity, maxCommentVelocity } =
    calculateCohortMaxes(unified);

  // Step 4: Score each product
  const scored = unified.map((product) => {
    const pmf = calculatePMFScore(
      product,
      maxUpvoteVelocity,
      maxCommentVelocity
    );

    const name = getProductName(product);
    const tagline = getProductTagline(product);
    const description = getProductDescription(product);
    const topics = getProductTopics(product);

    const vibecode = calculateVibecodeScore(name, tagline, description, topics);

    return { product, pmf, vibecode, name, tagline, description, topics };
  });

  // Step 5: Rank by PMF score, take top 5
  scored.sort((a, b) => b.pmf.total - a.pmf.total);
  const top5 = scored.slice(0, 5);

  // Step 6: Store in database
  console.log("[Pipeline] Storing top 5 products in database...");

  for (let i = 0; i < top5.length; i++) {
    const item = top5[i];
    const ph = item.product.phProduct;

    // Create or find the product
    const dbProduct = await prisma.product.create({
      data: {
        name: item.name,
        tagline: item.tagline,
        description: item.description,
        url: ph?.url || item.product.redditPosts[0]?.linkUrl || null,
        thumbnailUrl: ph?.thumbnailUrl || null,
        productHuntUrl: ph?.productHuntUrl || null,
        productHuntId: ph?.id || null,
        topics: JSON.stringify(item.topics),
      },
    });

    // Create the daily snapshot
    const phUpvotes = ph?.votesCount || 0;
    const phComments = ph?.commentsCount || 0;
    const redditUpvotes = item.product.redditPosts.reduce(
      (sum, p) => sum + p.score,
      0
    );
    const redditComments = item.product.redditPosts.reduce(
      (sum, p) => sum + p.numComments,
      0
    );
    const redditSubreddits = [
      ...new Set(item.product.redditPosts.map((p) => p.subreddit)),
    ];

    await prisma.dailySnapshot.create({
      data: {
        snapshotDate: targetDate,
        productId: dbProduct.id,
        rank: i + 1,
        pmfScore: item.pmf.total,
        upvoteVelocity: item.pmf.upvoteVelocity,
        commentEngagement: item.pmf.commentEngagement,
        sentimentSignal: item.pmf.sentimentSignal,
        crossPlatform: item.pmf.crossPlatform,
        topicRelevance: item.pmf.topicRelevance,
        recencyBoost: item.pmf.recencyBoost,
        vibecodeScore: item.vibecode.total,
        vibecodeBreakdown: JSON.stringify(item.vibecode),
        phUpvotes,
        phComments,
        redditUpvotes,
        redditComments,
        redditSubreddits: JSON.stringify(redditSubreddits),
      },
    });

    // Store raw mentions
    if (ph) {
      await prisma.rawMention.create({
        data: {
          productId: dbProduct.id,
          source: "producthunt",
          sourceUrl: ph.productHuntUrl,
          sourceId: ph.id,
          upvotes: ph.votesCount,
          comments: ph.commentsCount,
          bodyText: `${ph.tagline}\n\n${ph.description}`,
          postedAt: new Date(ph.createdAt),
        },
      });
    }

    for (const redditPost of item.product.redditPosts) {
      await prisma.rawMention.create({
        data: {
          productId: dbProduct.id,
          source: "reddit",
          sourceUrl: redditPost.url,
          sourceId: redditPost.id,
          upvotes: redditPost.score,
          comments: redditPost.numComments,
          bodyText: `${redditPost.title}\n\n${redditPost.selftext}`,
          postedAt: new Date(redditPost.createdUtc * 1000),
        },
      });
    }
  }

  console.log(`[Pipeline] Pipeline complete for ${targetDate}`);
  return {
    date: targetDate,
    productsScanned: unified.length,
    topProducts: top5.length,
  };
}
