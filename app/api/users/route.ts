import { db } from "@/db";
import { users } from "@/db/schema";
import { ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allUsers = db
    .select({ id: users.id, name: users.name, username: users.username })
    .from(users)
    .where(ne(users.id, session.user.id))
    .all();

  return NextResponse.json(allUsers);
}
