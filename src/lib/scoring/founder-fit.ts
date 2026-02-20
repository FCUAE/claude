import { PHProduct } from "../fetchers/producthunt";
import { RedditPost } from "../fetchers/reddit";
import { UnifiedProduct } from "./pmf-score";

export type FounderFitCategory =
  | "Dev Tools"
  | "Productivity"
  | "GTM & Sales"
  | "AI/ML"
  | "HR & Ops"
  | "Infrastructure"
  | "Fintech"
  | "Design"
  | "No-Code"
  | "Analytics"
  | null; // null = discarded (not founder-fit)

export interface FounderFitResult {
  isFounderFit: boolean;
  category: FounderFitCategory;
  confidence: number; // 0-100
}

// --- Category detection rules ---
// Each category has: PH topic slugs that match, and keywords to search in name/tagline/description

interface CategoryRule {
  category: FounderFitCategory;
  topics: string[]; // PH topic slugs
  keywords: string[]; // text keywords (matched against lowercase name+tagline+description)
  weight: number; // base weight (higher = checked first, wins ties)
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Dev Tools",
    topics: ["developer-tools", "software-engineering", "open-source", "github"],
    keywords: [
      "api", "sdk", "developer", "devtool", "cli", "deploy", "ci/cd", "devops",
      "backend", "frontend", "database", "git", "code review", "debug",
      "testing", "package", "library", "framework", "IDE", "terminal",
      "containeriz", "kubernetes", "docker", "webhook", "endpoint",
    ],
    weight: 10,
  },
  {
    category: "Infrastructure",
    topics: ["web-hosting", "cloud-computing", "cybersecurity"],
    keywords: [
      "cloud", "hosting", "server", "monitor", "logging", "uptime",
      "infrastructure", "cdn", "dns", "ssl", "load balancer", "serverless",
      "auth", "security", "vpn", "firewall", "backup",
    ],
    weight: 9,
  },
  {
    category: "AI/ML",
    topics: ["artificial-intelligence", "machine-learning", "chatgpt", "generative-ai"],
    keywords: [
      "ai agent", "ai assistant", "ai-powered", "llm", "gpt", "machine learning",
      "neural", "nlp", "ai workflow", "ai automation", "copilot",
      "generative ai", "prompt", "fine-tun", "rag", "vector",
    ],
    weight: 8,
  },
  {
    category: "GTM & Sales",
    topics: ["marketing", "sales", "email-marketing", "seo"],
    keywords: [
      "sales", "crm", "lead", "conversion", "growth", "cold email",
      "outreach", "pipeline", "prospect", "marketing", "seo", "content marketing",
      "landing page", "funnel", "ad ", "advertising", "campaign",
      "social media manag", "newsletter", "email marketing",
    ],
    weight: 7,
  },
  {
    category: "Productivity",
    topics: ["productivity", "project-management", "startup-tools", "remote-work", "collaboration"],
    keywords: [
      "workflow", "automat", "productivity", "collaboration", "project management",
      "task", "notion", "calendar", "scheduling", "meeting", "document",
      "spreadsheet", "template", "workspace", "team", "async",
      "invoice", "proposal", "contract", "freelance", "time track",
    ],
    weight: 6,
  },
  {
    category: "No-Code",
    topics: ["no-code", "low-code", "no-code-platform"],
    keywords: [
      "no-code", "no code", "low-code", "low code", "drag and drop",
      "visual builder", "without code", "nocode", "app builder",
      "form builder", "website builder", "workflow builder",
    ],
    weight: 5,
  },
  {
    category: "Analytics",
    topics: ["analytics", "data-science", "business-intelligence"],
    keywords: [
      "analytics", "dashboard", "metrics", "reporting", "data viz",
      "business intelligence", "tracking", "insight", "data platform",
      "attribution", "cohort", "retention",
    ],
    weight: 4,
  },
  {
    category: "Fintech",
    topics: ["fintech", "payments", "crypto", "banking"],
    keywords: [
      "payment", "fintech", "banking", "stripe", "billing",
      "subscription", "checkout", "wallet", "accounting", "expense",
      "payroll", "tax", "bookkeeping",
    ],
    weight: 3,
  },
  {
    category: "HR & Ops",
    topics: ["human-resources", "recruiting", "legal"],
    keywords: [
      "hiring", "recruit", "hr ", "human resource", "payroll",
      "legal", "compliance", "contract", "onboarding", "employee",
      "applicant", "talent", "people ops",
    ],
    weight: 2,
  },
  {
    category: "Design",
    topics: ["design-tools", "ui-design", "ux-design", "figma"],
    keywords: [
      "design tool", "ui design", "ux design", "figma", "prototype",
      "wireframe", "design system", "icon", "illustration",
      "brand", "logo", "mockup", "animation",
    ],
    weight: 1,
  },
];

// Products matching these signals are B2C/consumer → discard
const DISCARD_TOPICS = new Set([
  "games", "gaming", "fitness", "health-fitness", "dating",
  "food-drink", "cooking", "travel", "photography", "music",
  "entertainment", "social-network", "education", "kids",
  "pets", "fashion", "sports", "weather", "news",
]);

const DISCARD_KEYWORDS = [
  "fitness tracker", "workout", "gym", "diet", "calorie",
  "step counter", "recipe", "cooking", "dating app",
  "photo filter", "music playlist", "meditation",
  "game", "gaming", "puzzle", "arcade",
  "social network", "selfie", "meme",
  "3d print", "hardware", "physical product",
  "shipping label", "merch", "t-shirt",
  "wallpaper", "ringtone", "sticker",
  "pet ", "dog ", "cat ", "plant care",
];

function getProductText(product: UnifiedProduct): string {
  const parts: string[] = [];

  if (product.phProduct) {
    const ph = product.phProduct;
    parts.push(ph.name, ph.tagline, ph.description, ...ph.topics);
  }

  for (const post of product.redditPosts) {
    parts.push(post.title, post.selftext, post.subreddit);
  }

  return parts.join(" ").toLowerCase();
}

function getTopics(product: UnifiedProduct): string[] {
  return product.phProduct?.topics || [];
}

export function classifyFounderFit(product: UnifiedProduct): FounderFitResult {
  const text = getProductText(product);
  const topics = getTopics(product);

  // Step 1: Check for DISCARD signals
  const hasDiscardTopic = topics.some((t) => DISCARD_TOPICS.has(t));
  const discardKeywordHits = DISCARD_KEYWORDS.filter((kw) => text.includes(kw));

  if (hasDiscardTopic && discardKeywordHits.length >= 2) {
    return { isFounderFit: false, category: null, confidence: 90 };
  }

  // Step 2: Score each KEEP category
  const categoryScores: { category: FounderFitCategory; score: number }[] = [];

  for (const rule of CATEGORY_RULES) {
    let score = 0;

    // Topic matches are strong signals (each worth 3 points)
    const topicHits = topics.filter((t) => rule.topics.includes(t)).length;
    score += topicHits * 3;

    // Keyword matches (each worth 1 point)
    const keywordHits = rule.keywords.filter((kw) => text.includes(kw)).length;
    score += keywordHits;

    if (score > 0) {
      categoryScores.push({ category: rule.category, score: score + rule.weight * 0.1 });
    }
  }

  // No category matched
  if (categoryScores.length === 0) {
    // If it has a discard topic OR multiple discard keywords, reject it
    if (hasDiscardTopic || discardKeywordHits.length >= 1) {
      return { isFounderFit: false, category: null, confidence: 70 };
    }
    // If it has no discard signals but also no keep signals, give it the benefit of the doubt
    // (many PH products are founder-relevant but just unlabeled)
    return { isFounderFit: true, category: "Productivity", confidence: 30 };
  }

  // Pick the highest-scoring category
  categoryScores.sort((a, b) => b.score - a.score);
  const best = categoryScores[0];

  // Confidence based on how strong the match is
  const confidence = Math.min(95, 40 + best.score * 8);

  return {
    isFounderFit: true,
    category: best.category,
    confidence,
  };
}

export function filterFounderFit(
  products: UnifiedProduct[]
): { kept: (UnifiedProduct & { founderFitCategory: FounderFitCategory })[], discarded: number } {
  const kept: (UnifiedProduct & { founderFitCategory: FounderFitCategory })[] = [];
  let discarded = 0;

  for (const product of products) {
    const result = classifyFounderFit(product);
    if (result.isFounderFit && result.category) {
      kept.push({ ...product, founderFitCategory: result.category });
    } else {
      discarded++;
    }
  }

  return { kept, discarded };
}
