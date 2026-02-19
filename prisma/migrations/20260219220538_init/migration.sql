-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "url" TEXT,
    "thumbnail_url" TEXT,
    "product_hunt_url" TEXT,
    "product_hunt_id" TEXT,
    "topics" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "daily_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshot_date" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "pmf_score" REAL NOT NULL,
    "upvote_velocity" REAL NOT NULL,
    "comment_engagement" REAL NOT NULL,
    "sentiment_signal" REAL NOT NULL,
    "cross_platform" BOOLEAN NOT NULL,
    "topic_relevance" REAL NOT NULL,
    "recency_boost" REAL NOT NULL,
    "vibecode_score" INTEGER NOT NULL,
    "vibecode_breakdown" TEXT,
    "ph_upvotes" INTEGER NOT NULL DEFAULT 0,
    "ph_comments" INTEGER NOT NULL DEFAULT 0,
    "reddit_upvotes" INTEGER NOT NULL DEFAULT 0,
    "reddit_comments" INTEGER NOT NULL DEFAULT 0,
    "reddit_subreddits" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "raw_mentions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "source_id" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "body_text" TEXT,
    "posted_at" DATETIME,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raw_mentions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
