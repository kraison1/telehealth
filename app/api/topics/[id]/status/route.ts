import { db } from "@/db";
import { chatTopics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["open", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Check if user is part of this topic
  const topic = db
    .select()
    .from(chatTopics)
    .where(eq(chatTopics.id, id))
    .get();

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // Only doctor and nurse can close/reopen topics
  const userRole = session.user.role;
  if (userRole === "patient") {
    return NextResponse.json({ error: "Patients cannot close topics" }, { status: 403 });
  }

  db.update(chatTopics)
    .set({ status })
    .where(eq(chatTopics.id, id))
    .run();

  return NextResponse.json({ success: true, message: status === "closed" ? "Topic closed successfully" : "Topic reopened successfully", status });
}
