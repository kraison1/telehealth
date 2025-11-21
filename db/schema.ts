import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const chatTopics = sqliteTable("chat_topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  user1Id: text("user1_id").notNull(),
  user2Id: text("user2_id").notNull(),
  lastMessageAt: integer("last_message_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const topicReadStatus = sqliteTable("topic_read_status", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull(),
  userId: text("user_id").notNull(),
  lastReadAt: integer("last_read_at", { mode: "timestamp" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  roomId: text("room_id").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type ChatTopic = typeof chatTopics.$inferSelect;
export type NewChatTopic = typeof chatTopics.$inferInsert;
export type TopicReadStatus = typeof topicReadStatus.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
