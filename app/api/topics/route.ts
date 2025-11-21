import { db } from "@/db";
import { chatTopics, users, topicReadStatus } from "@/db/schema";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PAGE_SIZE = 100;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const filter = searchParams.get("filter") || "all"; // all, unread, read
  const offset = (page - 1) * PAGE_SIZE;

  // Get all topics for user
  let topics = db
    .select()
    .from(chatTopics)
    .where(
      or(
        eq(chatTopics.user1Id, session.user.id),
        eq(chatTopics.user2Id, session.user.id)
      )
    )
    .all();

  // Get read status for each topic
  const topicsWithStatus = topics.map((topic) => {
    const user1 = db.select().from(users).where(eq(users.id, topic.user1Id)).get();
    const user2 = db.select().from(users).where(eq(users.id, topic.user2Id)).get();

    const readStatus = db
      .select()
      .from(topicReadStatus)
      .where(
        and(
          eq(topicReadStatus.topicId, topic.id),
          eq(topicReadStatus.userId, session.user.id)
        )
      )
      .get();

    const isUnread = topic.lastMessageAt &&
      (!readStatus || (readStatus.lastReadAt < topic.lastMessageAt));

    return {
      ...topic,
      user1Name: user1?.name || "Unknown",
      user2Name: user2?.name || "Unknown",
      isUnread: !!isUnread,
      lastReadAt: readStatus?.lastReadAt || null,
    };
  });

  // Filter by read status
  let filteredTopics = topicsWithStatus;
  if (filter === "unread") {
    filteredTopics = topicsWithStatus.filter((t) => t.isUnread);
  } else if (filter === "read") {
    filteredTopics = topicsWithStatus.filter((t) => !t.isUnread);
  }

  // Sort: unread first (by lastMessageAt desc), then read (by lastMessageAt desc)
  filteredTopics.sort((a, b) => {
    if (a.isUnread && !b.isUnread) return -1;
    if (!a.isUnread && b.isUnread) return 1;
    const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime();
    const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime();
    return bTime - aTime;
  });

  const total = filteredTopics.length;
  const paginatedTopics = filteredTopics.slice(offset, offset + PAGE_SIZE);

  return NextResponse.json({
    topics: paginatedTopics,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
      hasMore: offset + PAGE_SIZE < total,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, otherUserId } = await req.json();

  const newTopic = {
    id: `topic-${crypto.randomUUID().slice(0, 8)}`,
    name,
    description: description || null,
    user1Id: session.user.id,
    user2Id: otherUserId,
    lastMessageAt: null,
    createdAt: new Date(),
  };

  db.insert(chatTopics).values(newTopic).run();

  return NextResponse.json(newTopic);
}
