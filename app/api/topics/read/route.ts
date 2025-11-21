import { db } from "@/db";
import { topicReadStatus } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await req.json();

  const existing = db
    .select()
    .from(topicReadStatus)
    .where(
      and(
        eq(topicReadStatus.topicId, topicId),
        eq(topicReadStatus.userId, session.user.id)
      )
    )
    .get();

  if (existing) {
    db.update(topicReadStatus)
      .set({ lastReadAt: new Date() })
      .where(eq(topicReadStatus.id, existing.id))
      .run();
  } else {
    db.insert(topicReadStatus)
      .values({
        id: crypto.randomUUID(),
        topicId,
        userId: session.user.id,
        lastReadAt: new Date(),
      })
      .run();
  }

  return NextResponse.json({ success: true });
}
