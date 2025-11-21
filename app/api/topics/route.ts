import { db } from "@/db";
import { chatTopics, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = db
    .select()
    .from(chatTopics)
    .where(
      or(
        eq(chatTopics.user1Id, session.user.id),
        eq(chatTopics.user2Id, session.user.id)
      )
    )
    .all();

  // Get user names for each topic
  const topicsWithUsers = topics.map((topic) => {
    const user1 = db.select().from(users).where(eq(users.id, topic.user1Id)).get();
    const user2 = db.select().from(users).where(eq(users.id, topic.user2Id)).get();
    return {
      ...topic,
      user1Name: user1?.name || "Unknown",
      user2Name: user2?.name || "Unknown",
    };
  });

  return NextResponse.json(topicsWithUsers);
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
    createdAt: new Date(),
  };

  db.insert(chatTopics).values(newTopic).run();

  return NextResponse.json(newTopic);
}
