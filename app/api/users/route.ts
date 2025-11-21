import { db } from "@/db";
import { users } from "@/db/schema";
import { ne, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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

// Only nurses can create new users
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "nurse") {
    return NextResponse.json({ error: "Only nurses can create users" }, { status: 403 });
  }

  const { username, password, name, role } = await req.json();

  if (!username || !password || !name || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["doctor", "patient", "nurse"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check if username exists
  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    username,
    password: hashedPassword,
    name,
    role,
    createdAt: new Date(),
  };

  db.insert(users).values(newUser).run();

  return NextResponse.json({ success: true, message: "User created successfully", data: { id: newUser.id, username, name, role } });
}
