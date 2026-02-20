export interface PHProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  thumbnailUrl: string | null;
  productHuntUrl: string;
  votesCount: number;
  commentsCount: number;
  topics: string[];
  createdAt: string;
  makerIds: string[];
}

const PH_API_URL = "https://api.producthunt.com/v2/api/graphql";

const RELEVANT_TOPICS = new Set([
  "saas",
  "developer-tools",
  "productivity",
  "startup-tools",
  "marketing",
  "artificial-intelligence",
  "no-code",
  "analytics",
  "tech",
  "software-engineering",
  "open-source",
  "fintech",
  "design-tools",
  "remote-work",
]);

const POSTS_QUERY = `
  query GetPosts($postedAfter: DateTime!, $postedBefore: DateTime!, $after: String) {
    posts(
      order: VOTES
      postedAfter: $postedAfter
      postedBefore: $postedBefore
      after: $after
      first: 50
    ) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          thumbnail {
            url
          }
          website
          votesCount
          commentsCount
          topics {
            edges {
              node {
                slug
                name
              }
            }
          }
          createdAt
          makers {
            id
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function fetchProductHuntPosts(
  dateStr: string
): Promise<PHProduct[]> {
  const rawToken = process.env.PRODUCT_HUNT_API_TOKEN;
  if (!rawToken) {
    console.warn("PRODUCT_HUNT_API_TOKEN not set, skipping Product Hunt fetch");
    return [];
  }

  // Clean up common token issues
  let token = rawToken.trim();
  if (token.toLowerCase().startsWith("bearer ")) {
    console.warn(
      "[PH] Token starts with 'Bearer ' - stripping prefix (it's added automatically)"
    );
    token = token.slice(7).trim();
  }

  if (token === "your_developer_token_here" || token.length < 10) {
    console.warn(
      "[PH] Token appears to be a placeholder or too short. Get your token at: https://www.producthunt.com/v2/oauth/applications"
    );
    return [];
  }

  const postedAfter = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const postedBefore = new Date(`${dateStr}T23:59:59Z`).toISOString();

  const allProducts: PHProduct[] = [];
  let after: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const variables: Record<string, unknown> = {
      postedAfter,
      postedBefore,
    };
    if (after) variables.after = after;

    const response = await fetch(PH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: POSTS_QUERY, variables }),
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // ignore read errors
      }
      console.error(
        `Product Hunt API error: ${response.status} ${response.statusText}`
      );
      if (errorBody) {
        console.error(`[PH] Response body: ${errorBody}`);
      }
      if (response.status === 401) {
        console.error(
          "[PH] 401 Unauthorized - Your token may be invalid or expired. " +
            "Get a new Developer Token at: https://www.producthunt.com/v2/oauth/applications"
        );
      }
      break;
    }

    const json = await response.json();
    const postsData = json.data?.posts;
    if (!postsData) break;

    for (const edge of postsData.edges) {
      const node = edge.node;
      const topics = (node.topics?.edges || []).map(
        (t: { node: { slug: string } }) => t.node.slug
      );

      // Filter for relevant topics - keep products that have at least one relevant topic
      // or keep all if they have no topics (to not miss unlabeled products)
      const hasRelevantTopic =
        topics.length === 0 ||
        topics.some((t: string) => RELEVANT_TOPICS.has(t));

      if (hasRelevantTopic) {
        allProducts.push({
          id: node.id,
          name: node.name,
          tagline: node.tagline || "",
          description: node.description || "",
          url: node.website || node.url,
          thumbnailUrl: node.thumbnail?.url || null,
          productHuntUrl: node.url,
          votesCount: node.votesCount,
          commentsCount: node.commentsCount,
          topics,
          createdAt: node.createdAt,
          makerIds: (node.makers || []).map((m: { id: string }) => m.id),
        });
      }
    }

    hasMore = postsData.pageInfo.hasNextPage;
    after = postsData.pageInfo.endCursor;
  }

  return allProducts;
}
