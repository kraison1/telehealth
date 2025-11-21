"use client";

import { useState, useEffect, useRef } from "react";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

const formatThaiTime = (date: Date | string) => {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const formatted = d.toLocaleString("th-TH", options);
  return formatted + " น.";
};

export default function ChatRoom() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);

    s.on("receive-message", (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    s.on("user-joined", ({ username, users }: { username: string; users: string[] }) => {
      setUsers(users);
    });

    s.on("user-left", ({ username, users }: { username: string; users: string[] }) => {
      setUsers(users);
    });

    s.on("user-typing", (username: string) => {
      setTypingUser(username);
    });

    s.on("user-stop-typing", () => {
      setTypingUser(null);
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = () => {
    if (username.trim() && roomId.trim() && socket) {
      socket.emit("join-room", roomId, username);
      setJoined(true);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit("send-message", {
        sender: username,
        content: newMessage,
        roomId,
      });
      setNewMessage("");
      socket.emit("stop-typing", roomId);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (socket) {
      socket.emit("typing", roomId, username);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", roomId);
      }, 1000);
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Join Chat Room
          </h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinRoom}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-white">Room: {roomId}</h1>
          <p className="text-gray-400 text-sm">
            {users.length} user{users.length !== 1 && "s"} online
          </p>
        </div>
        <div className="flex gap-2">
          {users.map((user) => (
            <span
              key={user}
              className={`px-3 py-1 rounded-full text-sm ${
                user === username
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              {user}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === username ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                message.sender === username
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              {message.sender !== username && (
                <p className="text-xs text-gray-400 mb-1">{message.sender}</p>
              )}
              <p>{message.content}</p>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {formatThaiTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        {typingUser && typingUser !== username && (
          <div className="text-gray-400 text-sm">{typingUser} is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
