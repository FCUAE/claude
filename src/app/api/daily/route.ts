import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let date = searchParams.get("date");

  // If no date provided, use "latest" logic - find the most recent snapshot date
  if (!date) {
    const latest = await prisma.dailySnapshot.findFirst({
      orderBy: { snapshotDate: "desc" },
      select: { snapshotDate: true },
    });

    if (!latest) {
      return NextResponse.json(
        { error: "No data available", snapshots: [] },
        { status: 200 }
      );
    }
    date = latest.snapshotDate;
  }

  const snapshots = await prisma.dailySnapshot.findMany({
    where: { snapshotDate: date },
    orderBy: { rank: "asc" },
    include: {
      product: true,
    },
  });

  const products = snapshots.map((s) => ({
    rank: s.rank,
    product: {
      id: s.product.id,
      name: s.product.name,
      tagline: s.product.tagline,
      description: s.product.description,
      url: s.product.url,
      thumbnailUrl: s.product.thumbnailUrl,
      productHuntUrl: s.product.productHuntUrl,
      topics: JSON.parse(s.product.topics || "[]"),
    },
    scores: {
      pmfScore: s.pmfScore,
      upvoteVelocity: s.upvoteVelocity,
      commentEngagement: s.commentEngagement,
      sentimentSignal: s.sentimentSignal,
      crossPlatform: s.crossPlatform,
      topicRelevance: s.topicRelevance,
      recencyBoost: s.recencyBoost,
      vibecodeScore: s.vibecodeScore,
      vibecodeBreakdown: JSON.parse(s.vibecodeBreakdown || "{}"),
      founderFitCategory: s.founderFitCategory,
    },
    stats: {
      phUpvotes: s.phUpvotes,
      phComments: s.phComments,
      redditUpvotes: s.redditUpvotes,
      redditComments: s.redditComments,
      redditSubreddits: JSON.parse(s.redditSubreddits || "[]"),
    },
  }));

  return NextResponse.json({
    date,
    products,
  });
}
