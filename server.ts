import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

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

    socket.on("send-message", (message: Omit<Message, "id" | "timestamp">) => {
      const fullMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };

      io.to(message.roomId).emit("receive-message", fullMessage);
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
