export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  subreddit: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  createdUtc: number;
  linkUrl: string | null;
}

const TARGET_SUBREDDITS = [
  "startups",
  "SaaS",
  "indiehackers",
  "Entrepreneur",
  "microsaas",
  "buildinpublic",
];

const PRODUCT_KEYWORDS = [
  "launched",
  "built",
  "using",
  "switched to",
  "love this tool",
  "game changer",
  "just released",
  "check out",
  "we built",
  "i built",
  "my tool",
  "our product",
  "beta",
  "launch",
  "open source",
  "side project",
  "saas",
  "app",
  "tool",
  "platform",
  "software",
  "product",
];

// Patterns that indicate a discussion/advice/how-to post, NOT a product
const DISCUSSION_PATTERNS = [
  /^how to /i,
  /^how i /i,
  /^guide[:\s]/i,
  /^tutorial[:\s]/i,
  /^tips? (for|on|to)/i,
  /^advice[:\s]/i,
  /^discussion[:\s]/i,
  /^question[:\s]/i,
  /^what (are|is) the best/i,
  /^what tools? do you/i,
  /^looking for (advice|feedback|suggestions)/i,
  /^need help/i,
  /^rant[:\s]/i,
  /^story[:\s]/i,
  /^lessons? (learned|from)/i,
  /^mistakes? (i|we|founders?)/i,
  /^why (i|we|you should)/i,
  /^stop doing/i,
  /for 1\/\d+ of the cost/i,
  /\bAMA\b/,
];

function isProductPost(post: RedditPost): boolean {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  const title = post.title;

  // Exclude discussion/how-to/advice posts — these are never about a specific product
  const isDiscussion = DISCUSSION_PATTERNS.some((pattern) => pattern.test(title));
  if (isDiscussion) return false;

  // Check for product-related keywords
  const hasKeyword = PRODUCT_KEYWORDS.some((kw) => text.includes(kw));

  // Check for external URLs (product links)
  const hasExternalUrl =
    post.linkUrl !== null &&
    !post.linkUrl.includes("reddit.com") &&
    !post.linkUrl.includes("self.");

  // Check for URLs in the body text
  const hasUrlInBody = /https?:\/\/[^\s)]+/.test(post.selftext);

  return hasKeyword || hasExternalUrl || hasUrlInBody;
}

async function fetchSubreddit(
  subreddit: string,
  after: string,
  before: string
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100&t=day`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "TrendSnipe/1.0 (trending product scanner)",
    },
  });

  if (!response.ok) {
    console.error(
      `Reddit API error for r/${subreddit}: ${response.status} ${response.statusText}`
    );
    return [];
  }

  const json = await response.json();
  const posts: RedditPost[] = [];

  const afterTime = new Date(after).getTime() / 1000;
  const beforeTime = new Date(before).getTime() / 1000;

  for (const child of json.data?.children || []) {
    const data = child.data;
    if (!data) continue;

    // Filter by time window
    if (data.created_utc < afterTime || data.created_utc > beforeTime) continue;

    const post: RedditPost = {
      id: data.id,
      title: data.title,
      selftext: data.selftext || "",
      url: `https://www.reddit.com${data.permalink}`,
      permalink: data.permalink,
      subreddit: data.subreddit,
      score: data.score,
      upvoteRatio: data.upvote_ratio,
      numComments: data.num_comments,
      createdUtc: data.created_utc,
      linkUrl:
        data.url && !data.url.includes("reddit.com") ? data.url : null,
    };

    posts.push(post);
  }

  return posts;
}

export async function fetchRedditPosts(
  dateStr: string
): Promise<RedditPost[]> {
  const after = `${dateStr}T00:00:00Z`;
  const before = `${dateStr}T23:59:59Z`;

  const allPosts: RedditPost[] = [];

  // Fetch from all target subreddits in parallel
  const results = await Promise.allSettled(
    TARGET_SUBREDDITS.map((sub) => fetchSubreddit(sub, after, before))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allPosts.push(...result.value);
    }
  }

  // Filter for product-related posts only
  return allPosts.filter(isProductPost);
}
