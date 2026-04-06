import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const commentCacheTable = pgTable("comment_cache", {
  id: serial("id").primaryKey(),
  mediaId: text("media_id").notNull(),
  instagramCommentId: text("instagram_comment_id").unique(),
  username: text("username"),
  text: text("text"),
  commentTimestamp: timestamp("comment_timestamp"),
  likeCount: integer("like_count").default(0),
  replied: boolean("replied").default(false),
  replyText: text("reply_text"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const threadsPostsTable = pgTable("threads_posts", {
  id: serial("id").primaryKey(),
  threadsMediaId: text("threads_media_id").unique(),
  textContent: text("text_content"),
  permalink: text("permalink"),
  postType: text("post_type"),
  likes: integer("likes").default(0),
  replies: integer("replies").default(0),
  reposts: integer("reposts").default(0),
  quotes: integer("quotes").default(0),
  views: integer("views").default(0),
  engagementRate: doublePrecision("engagement_rate"),
  postedAt: timestamp("posted_at"),
  syncedAt: timestamp("synced_at"),
  promotedToReel: boolean("promoted_to_reel").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiTokensTable = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  service: text("service").notNull().unique(),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at"),
  lastRefreshed: timestamp("last_refreshed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CommentCache = typeof commentCacheTable.$inferSelect;
export type ThreadsPost = typeof threadsPostsTable.$inferSelect;
export type ApiToken = typeof apiTokensTable.$inferSelect;
