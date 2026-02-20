import { NextResponse } from "next/server";

const PH_API_URL = "https://api.producthunt.com/v2/api/graphql";

const TEST_QUERY = `
  query {
    viewer {
      user {
        id
        name
      }
    }
  }
`;

export async function GET() {
  const rawToken = process.env.PRODUCT_HUNT_API_TOKEN;

  if (!rawToken) {
    return NextResponse.json({
      ok: false,
      error: "PRODUCT_HUNT_API_TOKEN is not set in .env.local",
    });
  }

  let token = rawToken.trim();
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (token === "your_developer_token_here" || token.length < 10) {
    return NextResponse.json({
      ok: false,
      error: "Token appears to be a placeholder. Set a real token in .env.local",
    });
  }

  try {
    const response = await fetch(PH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: TEST_QUERY }),
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json({
        ok: false,
        status: response.status,
        statusText: response.statusText,
        error: body,
        hint:
          response.status === 401
            ? "Token is invalid or expired. Get a new Developer Token at: https://www.producthunt.com/v2/oauth/applications"
            : undefined,
      });
    }

    const json = await response.json();
    return NextResponse.json({
      ok: true,
      tokenPrefix: token.slice(0, 6) + "...",
      viewer: json.data?.viewer,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown fetch error",
    });
  }
}
