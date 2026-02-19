export interface VibecodeScoreResult {
  total: number;
  breakdown: {
    categoryComplexity: number;
    authComplexity: number;
    integrationComplexity: number;
    uiComplexity: number;
  };
  label: string;
  emoji: string;
  summary: string;
}

interface KeywordGroup {
  score: number;
  keywords: string[];
  label: string;
}

const CATEGORY_COMPLEXITY: KeywordGroup[] = [
  {
    score: 1,
    label: "Simple CRUD / dashboard",
    keywords: [
      "tracker", "dashboard", "form", "todo", "list",
      "bookmark", "note", "journal", "timer", "calculator",
      "checklist", "habit", "reminder", "template",
    ],
  },
  {
    score: 2,
    label: "API integration tool",
    keywords: [
      "integration", "connect", "sync", "automate",
      "workflow", "zapier", "api", "webhook", "import",
      "export", "pipeline",
    ],
  },
  {
    score: 3,
    label: "AI/ML-powered",
    keywords: [
      "ai-powered", "machine learning", "gpt", "llm",
      "neural", "model", "predict", "generate",
      "computer vision", "nlp", "ai powered", "artificial intelligence",
    ],
  },
  {
    score: 4,
    label: "Complex infrastructure",
    keywords: [
      "infrastructure", "devops", "database", "kubernetes",
      "distributed", "blockchain", "protocol", "compiler",
      "runtime", "edge computing",
    ],
  },
];

const AUTH_COMPLEXITY: KeywordGroup[] = [
  {
    score: 0,
    label: "No auth needed",
    keywords: [
      "personal", "local", "offline", "browser extension", "cli",
    ],
  },
  {
    score: 1,
    label: "Basic auth",
    keywords: [
      "sign up", "account", "login", "subscribe", "sign in",
    ],
  },
  {
    score: 2,
    label: "Complex auth (teams/roles)",
    keywords: [
      "team", "workspace", "organization", "role",
      "permission", "enterprise", "admin",
    ],
  },
];

const INTEGRATION_COMPLEXITY: KeywordGroup[] = [
  {
    score: 0,
    label: "Standalone",
    keywords: [],
  },
  {
    score: 1,
    label: "1-2 API integrations",
    keywords: [
      "slack", "stripe", "github", "notion", "google",
      "zapier", "twilio", "sendgrid", "mailchimp",
    ],
  },
  {
    score: 2,
    label: "3+ integrations",
    keywords: [
      "connects all", "integrations with", "multi-platform",
      "all your tools", "hundreds of integrations",
    ],
  },
];

const UI_COMPLEXITY: KeywordGroup[] = [
  {
    score: 0,
    label: "Simple/minimal UI",
    keywords: [
      "cli", "terminal", "extension", "minimal", "simple",
    ],
  },
  {
    score: 1,
    label: "Standard web app",
    keywords: [
      "web app", "saas", "dashboard",
    ],
  },
  {
    score: 2,
    label: "Rich interactive UI",
    keywords: [
      "drag and drop", "canvas", "builder", "visual",
      "real-time", "collaboration", "editor", "whiteboard",
      "design tool",
    ],
  },
];

function getHighestMatch(
  text: string,
  groups: KeywordGroup[]
): { score: number; label: string } {
  let highest = { score: 0, label: "None detected" };

  for (const group of groups) {
    if (group.keywords.length === 0) continue;
    for (const keyword of group.keywords) {
      if (text.includes(keyword) && group.score > highest.score) {
        highest = { score: group.score, label: group.label };
        break;
      }
    }
  }

  return highest;
}

function getDifficultyLabel(score: number): { label: string; emoji: string } {
  if (score <= 3) return { label: "Easy — Weekend project", emoji: "🟢" };
  if (score <= 6) return { label: "Medium — 1-2 week build", emoji: "🟡" };
  return { label: "Hard — Significant effort", emoji: "🔴" };
}

export function calculateVibecodeScore(
  name: string,
  tagline: string,
  description: string,
  topics: string[]
): VibecodeScoreResult {
  const text = `${name} ${tagline} ${description} ${topics.join(" ")}`.toLowerCase();

  const category = getHighestMatch(text, CATEGORY_COMPLEXITY);
  const auth = getHighestMatch(text, AUTH_COMPLEXITY);
  const integration = getHighestMatch(text, INTEGRATION_COMPLEXITY);
  const ui = getHighestMatch(text, UI_COMPLEXITY);

  // Default category to 1 if nothing matched (assume simple)
  const categoryScore = category.score || 1;

  const rawTotal = categoryScore + auth.score + integration.score + ui.score;
  const total = Math.max(1, Math.min(10, rawTotal));

  const { label, emoji } = getDifficultyLabel(total);

  // Build summary string
  const parts: string[] = [];
  if (category.score > 0) parts.push(category.label);
  if (auth.score > 0) parts.push(auth.label.toLowerCase());
  if (integration.score > 0) parts.push(integration.label.toLowerCase());
  if (ui.score > 0) parts.push(ui.label.toLowerCase());
  if (parts.length === 0) parts.push("Simple CRUD app");

  return {
    total,
    breakdown: {
      categoryComplexity: categoryScore,
      authComplexity: auth.score,
      integrationComplexity: integration.score,
      uiComplexity: ui.score,
    },
    label,
    emoji,
    summary: parts.join(" + "),
  };
}
