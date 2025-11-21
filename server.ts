import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { db } from "./db";
import { messages, chatTopics } from "./db/schema";
import { eq, desc } from "drizzle-orm";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PAGE_SIZE = 100;

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

interface Room {
  id: string;
  users: string[];
}

const rooms = new Map<string, Room>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId: string, username: string) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { id: roomId, users: [] });
      }

      const room = rooms.get(roomId)!;
      if (!room.users.includes(username)) {
        room.users.push(username);
      }

      socket.data.username = username;
      socket.data.roomId = roomId;

      io.to(roomId).emit("user-joined", { username, users: room.users });
      console.log(`${username} joined room ${roomId}`);
    });

    socket.on("send-message", async (message: Omit<Message, "id" | "timestamp">) => {
      const fullMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };

      // Save to database
      db.insert(messages).values({
        id: fullMessage.id,
        sender: fullMessage.sender,
        content: fullMessage.content,
        roomId: fullMessage.roomId,
        timestamp: fullMessage.timestamp,
      }).run();

      // Update lastMessageAt on topic
      db.update(chatTopics)
        .set({ lastMessageAt: fullMessage.timestamp })
        .where(eq(chatTopics.id, message.roomId))
        .run();

      io.to(message.roomId).emit("receive-message", fullMessage);
    });

    socket.on("get-history", async (roomId: string) => {
      let query = db
        .select()
        .from(messages)
        .where(eq(messages.roomId, roomId))
        .orderBy(desc(messages.timestamp))
        .limit(PAGE_SIZE);

      const history = query.all();

      // Return in chronological order
      socket.emit("message-history", {
        messages: history.reverse().map((m) => ({
          ...m,
          timestamp: m.timestamp,
        })),
        hasMore: history.length === PAGE_SIZE,
      });
    });

    socket.on("load-more-messages", async (roomId: string, beforeTimestamp: string) => {
      const before = new Date(beforeTimestamp);

      const history = db
        .select()
        .from(messages)
        .where(eq(messages.roomId, roomId))
        .orderBy(desc(messages.timestamp))
        .all()
        .filter((m) => m.timestamp < before)
        .slice(0, PAGE_SIZE);

      socket.emit("more-messages", {
        messages: history.reverse().map((m) => ({
          ...m,
          timestamp: m.timestamp,
        })),
        hasMore: history.length === PAGE_SIZE,
      });
    });

    socket.on("typing", (roomId: string, username: string) => {
      socket.to(roomId).emit("user-typing", username);
    });

    socket.on("stop-typing", (roomId: string) => {
      socket.to(roomId).emit("user-stop-typing");
    });

    socket.on("disconnect", () => {
      const { username, roomId } = socket.data;
      if (roomId && username) {
        const room = rooms.get(roomId);
        if (room) {
          room.users = room.users.filter((u) => u !== username);
          io.to(roomId).emit("user-left", { username, users: room.users });
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
